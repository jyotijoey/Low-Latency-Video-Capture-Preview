# Setup Guide for Linux

## Prerequisites

### 1. Install Node.js
```bash
# Using apt (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install nodejs npm

# Verify installation
node --version
npm --version
```

Alternatively, use [nvm](https://github.com/nvm-sh/nvm) for version management.

### 2. Install ffmpeg
```bash
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

### 3. Install V4L2 Utils (Optional but Recommended)
```bash
sudo apt-get install v4l-utils

# List video devices
v4l2-ctl --list-devices
```

## Finding Your Video Device on Linux

### List all V4L2 devices
```bash
ls -la /dev/video*
```

Output example:
```
crw-rw-rw-+ 1 root video 81, 0 Mar 30 10:00 /dev/video0
crw-rw-rw-+ 1 root video 81, 1 Mar 30 10:00 /dev/video1
```

### Get detailed device info
```bash
v4l2-ctl -d /dev/video0 --info

# Or use ffmpeg to probe
ffmpeg -f v4l2 -list_formats all -i /dev/video0
```

### Typical device mapping
- `/dev/video0` - Primary video input (often the main camera or capture device)
- `/dev/video1` - Secondary (if multiple devices)
- Look for "MJPG" or "YUYV" formats for best compatibility

## User Permissions

### Option 1: Add User to Video Group (Recommended)
```bash
# Add current user to video group
sudo usermod -a -G video $USER

# Apply group membership (logout/login or use)
newgrp video

# Verify
id
# Should show 'video' in group list
```

### Option 2: Temporary Permission Fix
```bash
# Single-use fix (resets on reboot)
sudo chmod 666 /dev/video0
```

### Option 3: Persistent udev Rule
```bash
# Create a udev rule
sudo tee /etc/udev/rules.d/99-video.rules > /dev/null <<EOF
SUBSYSTEM=="video4linux", GROUP="video", MODE="0666"
EOF

# Reload udev
sudo udevadm control --reload-rules
sudo udevadm trigger

# Replug device or reboot
```

## Running the Application

### First Time Setup
```bash
cd ~/Documents/Projects/test_viewer
npm install
```

### Development Mode
```bash
npm start
```

The app will:
1. Detect your platform (Linux)
2. Enumerate `/dev/video*` devices
3. Open the UI with device selector
4. Ready to start preview

### Production Build
```bash
npm run build

# Run the built AppImage
./dist/Video\ Capture\ Preview-*.AppImage
```

## Linux-Specific Troubleshooting

### "Permission denied" on /dev/video0
```bash
# Check current permissions
ls -la /dev/video0

# Option 1: Temporary fix
sudo chmod 666 /dev/video0

# Option 2: Add user to video group
sudo usermod -a -G video $USER
# Then logout and login
```

### No video devices found
```bash
# Verify device exists
ls -la /dev/video*

# If nothing shows, device isn't recognized
# Try: lsusb (to see if USB device is detected)
lsusb

# If USB device not showing, try plugging in again
```

### Video shows but is frozen/distorted
1. Check if device is being used by another app:
   ```bash
   fuser /dev/video0
   # or
   lsof /dev/video0
   ```
2. Close conflicting applications
3. Try different format:
   - Edit `public/electron.js`
   - Remove `-input_format mjpeg` line
   - ffmpeg will auto-detect format

### ffmpeg command not working
```bash
# Test ffmpeg directly with your device
ffmpeg -f v4l2 -list_formats all -i /dev/video0

# Try without input format specification
ffmpeg -f v4l2 -i /dev/video0 -f image2pipe -pix_fmt rgb24 \
  -vf scale=1280:720 -r 30 pipe:1 | hexdump -C | head
```

## Advanced: Custom ffmpeg Command

Edit `public/electron.js` to modify the Linux ffmpeg arguments:

```javascript
if (platform === 'linux') {
  // For MJPEG input (try first - faster)
  ffmpegArgs = [
    '-f', 'v4l2',
    '-input_format', 'mjpeg',  // ← Remove this line if device doesn't support MJPEG
    '-i', device,
    '-f', 'image2pipe',
    '-pix_fmt', 'rgb24',
    '-vf', 'scale=1280:720',
    '-r', '30',  // ← Change fps here
    'pipe:1',
  ];
}
```

## Performance Optimization for Linux

### Lower Latency
```javascript
// In public/electron.js, try:
'-fflags', 'nobuffer',
'-flags', 'low_delay',
```

### Testing Different Formats
```bash
# MJPEG (often fastest)
ffmpeg -f v4l2 -input_format mjpeg -i /dev/video0 ...

# YUYV (if MJPEG unavailable)
ffmpeg -f v4l2 -input_format yuyv422 -i /dev/video0 ...

# Auto-detect
ffmpeg -f v4l2 -i /dev/video0 ...
```

## Recommended Capture Devices for Linux

- **Elgato Camlink** - Excellent Linux support
- **Blackmagic DeckLink** - Professional, well-supported
- **HDMI capture dongles** - Usually work if they're V4L2 compatible
- **Generic USB webcams** - Good compatibility

## Checking USB Device Info

```bash
# List all USB devices
lsusb

# Get detailed info for your capture device
lsusb -v -s BUS:DEVICE

# Check what driver is loaded
lsmod | grep -i video
```

