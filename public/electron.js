const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');

// app.isPackaged is false in dev, true in production build
const isDev = () => !app.isPackaged;

// Resolve bundled ffmpeg binary:
//   - In dev mode     → use ffmpeg-static from node_modules
//   - In production   → use binary copied to resources/ffmpeg-static/
const resolveFfmpeg = () => {
  if (isDev()) {
    return require('ffmpeg-static');
  }
  // electron-builder copies ffmpeg binary to process.resourcesPath/ffmpeg-static/
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  return path.join(process.resourcesPath, 'ffmpeg-static', binaryName);
};

let mainWindow;
let ffmpegProcess = null;
const PREVIEW = {
  width: 960,
  height: 540,
  fps: 24,
};

const safeSendToRenderer = (channel, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
};

const isValidDeviceAddress = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  return /^(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?$/.test(trimmed);
};

const normalizeDeviceUrl = (deviceAddress, key) => {
  const trimmed = deviceAddress.trim();
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const baseUrl = hasProtocol ? trimmed : `http://${trimmed.includes(':') ? trimmed : `${trimmed}:8060`}`;
  return new URL(`/keypress/${encodeURIComponent(key)}`, baseUrl);
};

const sendRemoteKeypress = (deviceAddress, key) => new Promise((resolve, reject) => {
  const requestUrl = normalizeDeviceUrl(deviceAddress, key);
  const client = requestUrl.protocol === 'https:' ? https : http;
  const request = client.request(requestUrl, {
    method: 'POST',
    timeout: 3000,
  }, (response) => {
    response.resume();

    if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
      resolve();
      return;
    }

    reject(new Error(`Remote request failed with status ${response.statusCode || 'unknown'}`));
  });

  request.on('timeout', () => {
    request.destroy(new Error('Remote request timed out'));
  });

  request.on('error', (error) => {
    reject(error);
  });

  request.end();
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      enableRemoteModule: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev()
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev()) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============================================
// IPC Handlers for Video Capture
// ============================================

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('start-video', async (event, device) => {
  return new Promise((resolve, reject) => {
    if (ffmpegProcess) {
      reject('Video already running');
      return;
    }

    try {
      const platform = process.platform;
      const WIDTH = PREVIEW.width;
      const HEIGHT = PREVIEW.height;
      const FPS = PREVIEW.fps;
      const FRAME_BYTES = WIDTH * HEIGHT * 4; // RGBA
      let frameBuffer = Buffer.alloc(0);

      let ffmpegArgs = [];

      if (platform === 'linux') {
        ffmpegArgs = [
          '-fflags', 'nobuffer',
          '-flags', 'low_delay',
          '-f', 'v4l2',
          '-input_format', 'mjpeg',
          '-framerate', '30',
          '-i', device,
          '-f', 'rawvideo',
          '-vcodec', 'rawvideo',
          '-pix_fmt', 'rgba',
          '-vf', `scale=${WIDTH}:${HEIGHT}:flags=bicubic`,
          '-r', `${FPS}`,
          'pipe:1',
        ];
      } else if (platform === 'win32') {
        ffmpegArgs = [
          '-fflags', 'nobuffer',
          '-flags', 'low_delay',
          '-f', 'dshow',
          '-i', `video="${device}"`,
          '-f', 'rawvideo',
          '-vcodec', 'rawvideo',
          '-pix_fmt', 'rgba',
          '-vf', `scale=${WIDTH}:${HEIGHT}:flags=bicubic`,
          '-r', `${FPS}`,
          'pipe:1',
        ];
      }

      ffmpegProcess = spawn(resolveFfmpeg(), ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      safeSendToRenderer('video-config', {
        width: WIDTH,
        height: HEIGHT,
        frameBytes: FRAME_BYTES,
        fps: FPS,
      });

      ffmpegProcess.stdout.on('data', (chunk) => {
        // Accumulate incoming chunks into a buffer
        frameBuffer = Buffer.concat([frameBuffer, chunk]);

        // Extract and send complete frames only
        while (frameBuffer.length >= FRAME_BYTES) {
          const frame = frameBuffer.slice(0, FRAME_BYTES);
          frameBuffer = frameBuffer.slice(FRAME_BYTES);
          safeSendToRenderer('video-frame', frame);
        }
      });

      ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg stderr: ${data}`);
      });

      ffmpegProcess.on('error', (err) => {
        ffmpegProcess = null;
        safeSendToRenderer('video-error', err.message);
      });

      ffmpegProcess.on('close', () => {
        ffmpegProcess = null;
        safeSendToRenderer('video-stopped');
      });

      resolve('Video started');
    } catch (err) {
      reject(err.message);
    }
  });
});

ipcMain.handle('stop-video', async () => {
  return new Promise((resolve) => {
    if (ffmpegProcess) {
      ffmpegProcess.kill();
      ffmpegProcess = null;
      resolve('Video stopped');
    } else {
      resolve('No video running');
    }
  });
});

ipcMain.handle('list-video-devices', async () => {
  return new Promise((resolve) => {
    const platform = process.platform;
    let devices = [];

    if (platform === 'linux') {
      const fs = require('fs');
      try {
        const paths = fs.readdirSync('/dev')
          .filter(f => /^video\d+$/.test(f))
          .map(f => `/dev/${f}`)
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
          });

        devices = paths.map(devPath => {
          const devName = path.basename(devPath);
          let label = devPath;
          try {
            const namePath = `/sys/class/video4linux/${devName}/name`;
            if (fs.existsSync(namePath)) {
              const name = fs.readFileSync(namePath, 'utf-8').trim();
              label = `${name} (${devPath})`;
            }
          } catch (_) {}
          return { path: devPath, label };
        });
      } catch (err) {
        console.error('Error listing video devices:', err);
      }
    } else if (platform === 'win32') {
      // Use ffmpeg to list DirectShow devices
      try {
        const { execSync } = require('child_process');
        const out = execSync(`"${resolveFfmpeg()}" -f dshow -list_devices true -i dummy 2>&1`, { encoding: 'utf-8' });
        const matches = [...out.matchAll(/"([^"]+)" \(video\)/g)];
        devices = matches.map(m => ({ path: m[1], label: m[1] }));
      } catch (_) {
        devices = [];
      }
    }

    resolve(devices);
  });
});

ipcMain.handle('send-remote-keypress', async (event, payload) => {
  const deviceAddress = payload?.deviceAddress?.trim();
  const key = payload?.key;

  if (!deviceAddress) {
    const message = 'Device IP address is required';
    safeSendToRenderer('remote-status', { type: 'error', message });
    throw new Error(message);
  }

  if (!isValidDeviceAddress(deviceAddress)) {
    const message = 'Enter a valid IPv4 address';
    safeSendToRenderer('remote-status', { type: 'error', message });
    throw new Error(message);
  }

  if (!key) {
    const message = 'Remote action is missing';
    safeSendToRenderer('remote-status', { type: 'error', message });
    throw new Error(message);
  }

  try {
    await sendRemoteKeypress(deviceAddress, key);
    const message = `Sent ${key}`;
    safeSendToRenderer('remote-status', { type: 'success', message, key });
    return { ok: true, message };
  } catch (error) {
    const message = error.message || 'Failed to reach remote device';
    safeSendToRenderer('remote-status', { type: 'error', message, key });
    throw new Error(message);
  }
});
