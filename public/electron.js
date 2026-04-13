const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
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
let deviceLogSocket = null;
let deviceReconnectTimer = null;
let deviceFlushTimer = null;
let deviceBuffer = '';
let deviceQueuedLines = [];
let deviceCurrentConfig = null;
let deviceIntentionalStop = false;
let deviceReconnectAttempts = 0;
const PREVIEW = {
  width: 960,
  height: 540,
  fps: 24,
};
const FFMPEG_LOG_LEVEL = 'warning';
const DEVICE_DEFAULT_LOG_PORT = 8085;
const DEVICE_RECONNECT_DELAY_MS = 2000;
const DEVICE_MAX_RECONNECT_DELAY_MS = 15000;
const DEVICE_LOG_FLUSH_MS = 80;
const DEVICE_MAX_BATCH_LINES = 200;

const handleFfmpegStderr = (data) => {
  const text = data.toString();
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('frame=')) {
      continue;
    }

    console.error(`ffmpeg: ${line}`);
  }
};

const safeSendToRenderer = (channel, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
};

const nowTs = () => Date.now();

const sendDeviceStatus = (status) => {
  safeSendToRenderer('device-log-status', {
    ts: nowTs(),
    ...status,
  });
};

const flushDeviceLogQueue = () => {
  if (deviceFlushTimer) {
    clearTimeout(deviceFlushTimer);
    deviceFlushTimer = null;
  }

  if (deviceQueuedLines.length === 0) {
    return;
  }

  const payload = deviceQueuedLines;
  deviceQueuedLines = [];
  safeSendToRenderer('device-log-batch', payload);
};

const queueDeviceLogLines = (lines) => {
  if (!lines || lines.length === 0) {
    return;
  }

  const stamped = lines.map((line) => ({
    ts: nowTs(),
    text: line,
  }));

  deviceQueuedLines.push(...stamped);

  if (deviceQueuedLines.length >= DEVICE_MAX_BATCH_LINES) {
    flushDeviceLogQueue();
    return;
  }

  if (!deviceFlushTimer) {
    deviceFlushTimer = setTimeout(flushDeviceLogQueue, DEVICE_LOG_FLUSH_MS);
  }
};

const clearDeviceReconnectTimer = () => {
  if (deviceReconnectTimer) {
    clearTimeout(deviceReconnectTimer);
    deviceReconnectTimer = null;
  }
};

const parseDeviceAddress = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^((?:\d{1,3}\.){3}\d{1,3})(?::(\d{1,5}))?$/);
  if (!match) {
    return null;
  }

  return {
    host: match[1],
    port: match[2] ? Number(match[2]) : undefined,
  };
};

const closeDeviceSocket = () => {
  if (!deviceLogSocket) {
    return;
  }

  const socket = deviceLogSocket;
  deviceLogSocket = null;
  socket.removeAllListeners();
  socket.destroy();
};

const stopDeviceLogStreaming = (reason = 'stopped') => {
  deviceIntentionalStop = true;
  clearDeviceReconnectTimer();
  closeDeviceSocket();
  deviceBuffer = '';
  flushDeviceLogQueue();
  sendDeviceStatus({ type: 'idle', message: reason });
};

const scheduleDeviceReconnect = () => {
  if (deviceIntentionalStop || !deviceCurrentConfig) {
    return;
  }

  clearDeviceReconnectTimer();

  const delay = Math.min(
    DEVICE_RECONNECT_DELAY_MS * (2 ** Math.min(deviceReconnectAttempts, 3)),
    DEVICE_MAX_RECONNECT_DELAY_MS,
  );
  deviceReconnectAttempts += 1;

  sendDeviceStatus({
    type: 'reconnecting',
    message: `Device logs disconnected. Reconnecting in ${Math.round(delay / 1000)}s...`,
    attempt: deviceReconnectAttempts,
  });

  deviceReconnectTimer = setTimeout(() => {
    deviceReconnectTimer = null;
    if (!deviceIntentionalStop && deviceCurrentConfig) {
      connectDeviceLogSocket(deviceCurrentConfig);
    }
  }, delay);
};

function connectDeviceLogSocket(config) {
  if (!config) {
    return;
  }

  closeDeviceSocket();
  clearDeviceReconnectTimer();

  const socket = new net.Socket();
  deviceLogSocket = socket;
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 10000);

  sendDeviceStatus({
    type: 'connecting',
    message: `Connecting to Device logs at ${config.host}:${config.port}...`,
    host: config.host,
    port: config.port,
  });

  socket.connect(config.port, config.host, () => {
    deviceReconnectAttempts = 0;
    sendDeviceStatus({
      type: 'connected',
      message: `Connected to Device logs (${config.host}:${config.port})`,
      host: config.host,
      port: config.port,
    });
  });

  socket.on('data', (chunk) => {
    deviceBuffer += chunk.toString('utf8');
    const lines = deviceBuffer.split(/\r?\n/);
    deviceBuffer = lines.pop() || '';

    const cleaned = lines
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    queueDeviceLogLines(cleaned);
  });

  socket.on('error', (error) => {
    sendDeviceStatus({ type: 'error', message: `Device log socket error: ${error.message}` });
  });

  socket.on('close', () => {
    if (deviceLogSocket === socket) {
      deviceLogSocket = null;
    }

    if (deviceIntentionalStop) {
      sendDeviceStatus({ type: 'idle', message: 'Device logs stopped' });
      return;
    }

    scheduleDeviceReconnect();
  });
}

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

app.on('before-quit', () => {
  stopDeviceLogStreaming('app quitting');
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
          '-hide_banner',
          '-nostats',
          '-loglevel', FFMPEG_LOG_LEVEL,
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
          '-hide_banner',
          '-nostats',
          '-loglevel', FFMPEG_LOG_LEVEL,
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

        // Send only the most recent complete frame to avoid backlog build-up.
        if (frameBuffer.length >= FRAME_BYTES) {
          const remainder = frameBuffer.length % FRAME_BYTES;
          const latestFrameStart = frameBuffer.length - remainder - FRAME_BYTES;
          const frame = frameBuffer.slice(latestFrameStart, latestFrameStart + FRAME_BYTES);

          frameBuffer = remainder > 0
            ? frameBuffer.slice(frameBuffer.length - remainder)
            : Buffer.alloc(0);

          const framePayload = frame.buffer.slice(
            frame.byteOffset,
            frame.byteOffset + frame.byteLength,
          );
          safeSendToRenderer('video-frame', framePayload);
        }
      });

      ffmpegProcess.stderr.on('data', handleFfmpegStderr);

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

ipcMain.handle('set-device-log-source', async (event, payload) => {
  const address = payload?.deviceAddress;
  const parsed = parseDeviceAddress(address || '');

  if (!parsed) {
    stopDeviceLogStreaming('Device logs disabled');
    return { ok: true, connected: false };
  }

  const nextConfig = {
    host: parsed.host,
    port: parsed.port || DEVICE_DEFAULT_LOG_PORT,
  };

  const unchanged = deviceCurrentConfig
    && deviceCurrentConfig.host === nextConfig.host
    && deviceCurrentConfig.port === nextConfig.port
    && deviceLogSocket
    && !deviceLogSocket.destroyed;

  if (unchanged) {
    return { ok: true, connected: true };
  }

  deviceCurrentConfig = nextConfig;
  deviceIntentionalStop = false;
  deviceReconnectAttempts = 0;
  connectDeviceLogSocket(nextConfig);

  return { ok: true, connected: true };
});

ipcMain.handle('stop-device-logs', async () => {
  stopDeviceLogStreaming('Device logs stopped');
  deviceCurrentConfig = null;
  return { ok: true };
});
