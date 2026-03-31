# Quick Start Guide

## 1-Minute Setup

### Linux
```bash
# Install dependencies
cd ~/Documents/Projects/test_viewer
npm install

# Ensure ffmpeg is installed
sudo apt-get install ffmpeg

# Add user to video group (for /dev/video0 access)
sudo usermod -a -G video $USER
# Log out and back in for permissions to take effect

# Start the app
npm start
```

### Windows
```cmd
# Install Node.js from nodejs.org if you haven't already

# Install ffmpeg
choco install ffmpeg
# OR download from ffmpeg.org and add to PATH

# Install dependencies
cd C:\path\to\test_viewer
npm install

# Start the app
npm start
```

## Next Steps

1. **App will open** with device selector
2. **Select your video device** from dropdown:
   - Linux: Look for `/dev/video0` or similar
   - Windows: Video device name (e.g., "Elgato HD60 S")
3. **Click "Start"** to begin preview
4. **Live feed appears** in the canvas area
5. **Click "Stop"** to end preview

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| "No devices found" | Check [LINUX_SETUP.md](LINUX_SETUP.md) or [WINDOWS_SETUP.md](WINDOWS_SETUP.md) |
| "ffmpeg not found" | Install ffmpeg and add to PATH |
| "Permission denied" | `sudo chmod 666 /dev/video0` (Linux) |
| "Video frozen" | Close other apps using camera, try restarting app |
| "App won't start" | Run `npm install` again, then `npm start` |

## Full Documentation

- **[README.md](README.md)** - Complete overview & architecture
- **[LINUX_SETUP.md](LINUX_SETUP.md)** - Linux-specific guide
- **[WINDOWS_SETUP.md](WINDOWS_SETUP.md)** - Windows-specific guide

## Development Commands

```bash
# Start dev mode (React dev server + Electron)
npm start

# Build production executable
npm run build

# Just build React assets (no Electron bundle)
npm run react-build

# Clean and rebuild
rm -rf node_modules build && npm install && npm start
```

## Video Configuration

To change resolution, FPS, or scaling:

1. Open `src/App.js`
2. Find constants at top: `WIDTH`, `HEIGHT`
3. Open `public/electron.js`
4. Find ffmpeg args: `-vf scale=1280:720 -r 30`
5. Edit as needed
6. Restart app with `npm start`

**Examples:**
- Lower latency: Change `-r 30` to `-r 15`
- Higher quality: Remove `-vf scale=1280:720` to use native resolution
- Smaller preview: Change `scale=1280:720` to `scale=640:480`

## Hardware Requirements

- **Minimum**: 2GB RAM, Dual-core processor
- **Recommended**: 4GB+ RAM, Quad-core, SSD
- **Video Card**: Not required (uses CPU decoding)

## Supported Devices

### Linux (V4L2)
- Elgato Camlink
- Blackmagic DeckLink
- Generic USB capture cards
- Some HDMI capture dongle

### Windows (DirectShow)
- Elgato HD60 S / HD60 Pro
- Blackmagic DeckLink
- Magewell USB capture
- Most USB webcams

## Need Help?

1. Check platform-specific guide ([LINUX_SETUP.md](LINUX_SETUP.md) or [WINDOWS_SETUP.md](WINDOWS_SETUP.md))
2. Ensure ffmpeg is installed and in PATH
3. Verify device is connected and recognized by OS
4. Check application is running as admin (Windows) if needed
5. Try reinstalling: `rm -rf node_modules && npm install`

