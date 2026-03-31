# Advanced Configuration Guide

## Customizing Video Streaming

### Resolution & Frame Rate

**File**: `src/App.js` and `public/electron.js`

```javascript
// In src/App.js (Canvas dimensions)
const WIDTH = 1280;   // Change to desired width
const HEIGHT = 720;   // Change to desired height

// In public/electron.js (ffmpeg output)
// Linux version:
'-vf', 'scale=1280:720',  // Change dimensions here
'-r', '30',               // Change FPS here

// Windows version: same approach
```

### Common Configurations

#### High Quality, Higher Latency
```javascript
ffmpegArgs = [
  '-f', 'v4l2',
  '-input_format', 'mjpeg',
  '-i', device,
  '-f', 'image2pipe',
  '-pix_fmt', 'rgb24',
  '-vf', 'scale=1920:1080',  // 1080p
  '-r', '60',                 // 60 FPS
  'pipe:1',
];
// In App.js: WIDTH=1920, HEIGHT=1080
```

#### Low Latency, Lower Quality
```javascript
ffmpegArgs = [
  '-f', 'v4l2',
  '-input_format', 'mjpeg',
  '-i', device,
  '-fflags', 'nobuffer',      // Add this
  '-flags', 'low_delay',      // And this
  '-f', 'image2pipe',
  '-pix_fmt', 'rgb24',
  '-vf', 'scale=640:480',     // 480p
  '-r', '15',                 // 15 FPS
  'pipe:1',
];
// In App.js: WIDTH=640, HEIGHT=480
```

#### 4K Quality (if source supports)
```javascript
ffmpegArgs = [
  '-f', 'v4l2',
  '-input_format', 'mjpeg',
  '-i', device,
  '-f', 'image2pipe',
  '-pix_fmt', 'rgb24',
  '-vf', 'scale=3840:2160',   // 4K
  '-r', '30',
  'pipe:1',
];
// In App.js: WIDTH=3840, HEIGHT=2160
// Note: Requires significant CPU/RAM
```

## Advanced ffmpeg Options

### Add Deinterlacing
```javascript
'-vf', 'yadif,scale=1280:720',  // Remove interlacing then scale
```

### Adjust Colors (Brightness/Saturation)
```javascript
'-vf', 'eq=brightness=0.1:saturation=1.2,scale=1280:720',
```

### Aspect Ratio Preservation
```javascript
'-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
```

### Add Hardware Acceleration (if available)
```javascript
// Linux with NVidia
'-hwaccel', 'cuda',
'-hwaccel_output_format', 'cuda',

// Linux with Intel
'-hwaccel', 'vaapi',
'-hwaccel_device', '/dev/dri/renderD128',
```

## Platform-Specific Tuning

### Linux (V4L2)

#### Try Different Input Formats
```javascript
// MJPEG (usually fastest)
'-input_format', 'mjpeg',

// YUYV (fallback)
'-input_format', 'yuyv422',

// H264 (if available)
'-input_format', 'h264',

// Let ffmpeg auto-detect
// (omit '-input_format' line entirely)
```

#### Low-Latency Mode
```javascript
ffmpegArgs = [
  '-f', 'v4l2',
  '-fflags', 'nobuffer',
  '-flags', 'low_delay',
  '-i', device,
  '-f', 'image2pipe',
  '-pix_fmt', 'rgb24',
  '-threads', '1',            // Single-threaded
  '-vf', 'scale=1280:720',
  '-r', '30',
  'pipe:1',
];
```

### Windows (DirectShow)

#### Specific Device by Index
```javascript
// Instead of device name, use device index
'-i', `video="${device}":audio="none"`,  // Disable audio if present
```

#### List All Properties
```javascript
// Use this to find exact device names and formats
ffmpeg -f dshow -list_options true -i "video=YOUR_DEVICE_NAME"
```

## Performance Optimization

### Reduce Memory Usage
```javascript
// In public/electron.js, before spawning ffmpeg:
ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    FFMPEG_THREAD_QUEUE_SIZE: '16',  // Lower thread queue
  },
});
```

### Increase Frame Rate Smoothness
```javascript
// In src/App.js, drawFrame function
// Use requestAnimationFrame for better timing (currently event-driven)
let animationFrameId;
const drawFrame = (frameData) => {
  animationFrameId = requestAnimationFrame(() => {
    // ... drawing code
  });
};
```

### Enable CPU Affinity (Advanced)
```javascript
// Bind ffmpeg to specific CPU cores (Linux)
const { spawn } = require('child_process');
ffmpegProcess = spawn('taskset', ['-c', '0-1', 'ffmpeg', ...ffmpegArgs], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
```

## Custom UI Modifications

### Change Canvas Background
**File**: `src/App.css`
```css
.video-canvas {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* other props */
}
```

### Always-On-Top Window
**File**: `public/electron.js`
```javascript
const mainWindow = new BrowserWindow({
  width: 1280,
  height: 720,
  alwaysOnTop: true,  // Add this
  // ... other options
});
```

### Borderless Window
**File**: `public/electron.js`
```javascript
const mainWindow = new BrowserWindow({
  width: 1280,
  height: 720,
  frame: false,  // Add this for borderless
  // ... other options
});
```

### Custom Window Size
**File**: `public/electron.js`
```javascript
const mainWindow = new BrowserWindow({
  width: 1920,    // Change width
  height: 1080,   // Change height
  // ... other options
});
```

## Debugging

### Enable Verbose ffmpeg Logging
```javascript
// In public/electron.js, modify stderr handler:
ffmpegProcess.stderr.on('data', (data) => {
  console.error(`[ffmpeg] ${data}`);
  // Log to file:
  // fs.appendFileSync('/tmp/ffmpeg.log', data.toString());
});
```

### Monitor Frame Count
```javascript
// In src/App.js, add to drawFrame:
let frameCount = 0;
const drawFrame = (frameData) => {
  frameCount++;
  if (frameCount % 30 === 0) {
    console.log(`Frames received: ${frameCount}`);
  }
  // ... rest of drawing code
};
```

### Check System Processor Usage (Linux)
```bash
# Monitor while app is running
watch -n 1 'ps aux | grep ffmpeg'

# Or use system monitor
top -p $(pgrep ffmpeg)
```

## Troubleshooting Specific Scenarios

### Device Has Multiple Formats
```bash
# List all available formats
ffmpeg -f v4l2 -list_formats all -i /dev/video0

# Try different ones by modifying '-input_format'
```

### Very High Latency
1. Remove scaling filter: omit `-vf scale=...`
2. Reduce FPS: `-r 15`
3. Add `-fflags nobuffer -flags low_delay` (Linux)
4. Check if device is hardware-accelerated capable

### Audio Sync Issues (if audio added later)
```javascript
'-itsoffset', '0.1',  // Offset frames by 100ms for sync testing
```

## Building Custom Distributions

### For Specific Resolution Device
Edit constants in `src/App.js` and `public/electron.js` for your exact hardware, then:
```bash
npm run build
# Results in dist/Video\ Capture\ Preview*.AppImage (Linux)
# Or dist/Video\ Capture\ Preview.exe (Windows)
```

### Minimal Build (Remove Dev Tools)
```javascript
// In public/electron.js
// Remove or comment out:
if (isDev) {
  mainWindow.webContents.openDevTools();
}
```

Then build:
```bash
npm run build
```

