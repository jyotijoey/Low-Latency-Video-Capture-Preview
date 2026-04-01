# Video Capture Preview

A minimal Electron + React desktop application for **Linux** and **Windows** that displays live video feeds from capture card devices (e.g., HDMI via /dev/video0).

## Features

- ✅ Live video preview from capture devices
- ✅ Low-latency streaming (via ffmpeg)
- ✅ Cross-platform: Linux (V4L2) & Windows (DirectShow)
- ✅ Simple, intuitive UI
- ✅ Start/Stop controls
- ✅ Device selection
- ✅ Dark theme optimized for video viewing

## Tech Stack

- **Electron**: Desktop application framework
- **React 18**: UI framework
- **ffmpeg**: Video capture & transcoding
- **Node.js**: Backend process management

## Prerequisites

### Linux
- Node.js 14+ and npm
- ffmpeg: `sudo apt-get install ffmpeg`
- V4L2 device: `/dev/video0` or similar

### Windows
- Node.js 14+ and npm
- ffmpeg: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
- Video capture device (USB camera, capture card, etc.)

## Installation

```bash
cd /path/to/test_viewer
npm install
```

## Running the App

### Development Mode

```bash
npm start
```

This will:
1. Start the React dev server (http://localhost:3000)
2. Wait for it to be ready
3. Launch the Electron app

### For Production

```bash
npm run build
```

## Use From Launcher App (Linux)

If you want to open the app from the Linux Apps menu (launcher icon), install the `.deb` package:

```bash
cd /path/to/test_viewer
npm run react-build
npx electron-builder --linux deb
sudo dpkg -i dist/video-capture-preview_1.0.0_amd64.deb
```

After install:
1. Open your Apps menu
2. Search for `Video Capture Preview`
3. Launch it from the icon

To update launcher version after code changes, run the same 4 commands again.

## Project Structure

```
test_viewer/
├── public/
│   ├── electron.js          # Electron main process
│   ├── preload.js           # IPC security bridge
│   ├── index.html           # HTML template
│   └── package.json         # Dependencies & metadata
├── src/
│   ├── App.js               # React component (UI)
│   ├── App.css              # Styling
│   ├── index.js             # React entry point
│   └── index.css            # Global styles
└── package.json             # Root dependencies
```

## Architecture

### Main Process (Electron)
- Spawns ffmpeg child process
- Manages video device enumeration
- Communicates with renderer via IPC
- Sends raw frame data to renderer

### Renderer Process (React)
- Displays UI with canvas for video
- Handles user interactions (start/stop)
- Renders frames received from main process
- Displays device selection and status

### IPC Channels
- `get-platform`: Detect OS
- `start-video`: Start video capture
- `stop-video`: Stop video capture
- `list-video-devices`: Enumerate devices
- `video-frame`: Receives raw frame data (from main)
- `video-error`: Receives error messages (from main)
- `video-stopped`: Notified when video stops (from main)

## ffmpeg Commands Used

### Linux (V4L2)
```bash
ffmpeg -f v4l2 -input_format mjpeg -i /dev/video0 \
  -f rawvideo -vcodec rawvideo -pix_fmt rgba \
  -vf scale=960:540:flags=bicubic -r 24 pipe:1
```

### Windows (DirectShow)
```bash
ffmpeg -f dshow -i "video=DEVICE_NAME" \
  -f rawvideo -vcodec rawvideo -pix_fmt rgba \
  -vf scale=960:540:flags=bicubic -r 24 pipe:1
```

## Configuration

### Video Resolution & FPS
Edit in [src/App.js](src/App.js) and [public/electron.js](public/electron.js):
- `WIDTH = 1280` → Change to desired width
- `HEIGHT = 720` → Change to desired height
- `-r 30` → Change to desired fps (e.g., 60 for 60 fps)

### Device Selection
- **Linux**: Devices are auto-detected from `/dev/video*`
- **Windows**: Currently supports generic device patterns. Use `ffmpeg -f dshow -list_devices true -i dummy` to find exact device names.

## Troubleshooting

### No video devices found (Linux)
```bash
# List available V4L2 devices
ls -la /dev/video*

# Check device permissions
sudo usermod -a -G video $USER
# Log out and back in for groups to take effect
```

### "ffmpeg not found"
- Linux: `sudo apt-get install ffmpeg`
- Windows: Download and add ffmpeg to PATH

### Video appears frozen
- Check that ffmpeg is properly installed and in PATH
- Verify the device is actually capturing video
- Try adjusting the resolution or fps values

### Permissions denied on /dev/video0 (Linux)
```bash
sudo chmod 666 /dev/video0
# OR add your user to video group (recommended)
sudo usermod -a -G video $USER
```

## Performance Notes

- Frame rendering happens on a worker buffer (no blocking UI)
- Canvas uses requestAnimationFrame equivalent via event data
- RGB24 conversion is done efficiently in the main process
- Typical latency: ~100-300ms depending on host system

## Development

To modify the video streaming logic:
1. Edit ffmpeg arguments in [public/electron.js](public/electron.js) → `ipcMain.handle('start-video')`
2. Canvas rendering is in [src/App.js](src/App.js) → `drawFrame()` function

## Building for Distribution

### Linux
```bash
npm run build
# Creates AppImage and .deb
```

### Windows
```bash
npm run build
# Creates installer and portable .exe
```

## License

MIT
