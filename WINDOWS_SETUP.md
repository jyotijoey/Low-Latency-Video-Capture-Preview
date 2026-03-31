# Setup Guide for Windows

## Prerequisites

### 1. Install Node.js
- Download from [nodejs.org](https://nodejs.org/) (LTS recommended)
- During installation, ensure "Add to PATH" is checked
- Verify installation:
  ```cmd
  node --version
  npm --version
  ```

### 2. Install ffmpeg

#### Option A: Using Chocolatey (Recommended)
```cmd
choco install ffmpeg
```

#### Option B: Manual Installation
1. Download ffmpeg from [ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Choose the latest full build
3. Extract to a folder (e.g., `C:\ffmpeg`)
4. Add to system PATH:
   - Right-click "This PC" → Properties
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System Variables", find "Path" and edit
   - Add new entry: `C:\ffmpeg\bin`
   - Restart Command Prompt/PowerShell

### 3. Verify ffmpeg
```cmd
ffmpeg -version
```

## Finding Your Video Device on Windows

### Using ffmpeg to list devices
```cmd
ffmpeg -f dshow -list_devices true -i dummy
```

Look for output like:
```
[dshow @ 0x...] DirectShow video devices (some may be duplicates)
[dshow @ 0x...]  "Integrated Camera"
[dshow @ 0x...]  "USB Video Device"
[dshow @ 0x...]  "Elgato HD60 S"
```

### Finding Capture Card Devices
If you have an HDMI capture card, it typically appears as:
- "Elgato HD60 S"
- "Blackmagic Design DeckLink"
- "Magewell USB Capture"

Device names may be displayed differently. Use the full exact name when needed.

## Running the Application

### First Time Setup
```cmd
cd C:\path\to\test_viewer
npm install
```

### Development
```cmd
npm start
```

### Building Executable
```cmd
npm run build
```

Creates:
- `dist/Video Capture Preview Setup.exe` (installer)
- `dist/Video Capture Preview.exe` (portable)

## Windows-Specific Troubleshooting

### "ffmpeg not found" Error
1. Verify ffmpeg is in PATH:
   ```cmd
   where ffmpeg
   ```
2. If empty, ffmpeg is not in PATH → reinstall/add to PATH
3. Restart Command Prompt after changing PATH

### Device Not Showing in List
1. Ensure device is connected and recognized by Windows
2. Check Device Manager → Cameras/Video capture devices
3. Update device drivers if needed
4. Try:
   ```cmd
   ffmpeg -f dshow -list_devices true -i dummy
   ```

### Video Not Starting
1. Ensure the correct device name is selected
2. Device may be in use by another application (Windows Explorer, OBS, etc.)
3. Close other applications using the camera
4. Try a different application (like Camera app) to verify device works

### Performance Issues
- Windows may have higher latency than Linux
- Try lowering FPS in App.js (change `-r 30` to `-r 15`)
- Try reducing resolution (change `scale=1280:720` to `scale=640:480`)

## Advanced: Custom ffmpeg Command

To use custom ffmpeg settings, edit `public/electron.js`:

```javascript
// Windows section
} else if (platform === 'win32') {
  ffmpegArgs = [
    '-f', 'dshow',
    '-i', `video="${device}"`,
    '-f', 'image2pipe',
    '-pix_fmt', 'rgb24',
    '-vf', 'scale=1280:720',
    '-r', '30',  // ← Change fps here
    'pipe:1',
  ];
}
```

Then run:
```cmd
npm start
```

## Recommended Capture Devices for Windows

- **Elgato HD60 S** - Excellent support, widely compatible
- **Blackmagic DeckLink** - Professional option
- **Magewell USB Capture** - Wide format support
- **Generic USB camera** - Works but may have latency

