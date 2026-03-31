# Building Standalone Executables

This guide explains how to build the app into a single-click standalone executable for Linux and Windows.

## Quick Build

### Linux
```bash
chmod +x build-linux.sh
./build-linux.sh
```

Output: `dist/Video Capture Preview-*.AppImage` (ready to run)

### Windows
```cmd
build-windows.bat
```

Output: 
- `dist/Video Capture Preview.exe` (portable, single .exe)
- `dist/Video Capture Preview Setup.exe` (installer)

---

## What Gets Built

### Linux
- **AppImage** (recommended)
  - Single, portable file
  - No installation needed
  - Just download and run: `./Video\ Capture\ Preview-*.AppImage`
  - Works on all modern Linux distros (Ubuntu 18.04+)

### Windows
- **Portable .exe**
  - Single executable file
  - No installation needed
  - Run directly or move anywhere
  
- **Installer .exe**
  - Professional installer
  - Adds to Programs/Apps
  - Creates Start Menu shortcuts
  - Recommended for distribution

---

## Detailed Build Instructions

### Prerequisites (One-time Setup)

#### Linux
```bash
# Install build dependencies
sudo apt-get install nodejs npm ffmpeg build-essential python3

# Verify installations
node --version
npm --version
ffmpeg -version
```

#### Windows
1. Install **Node.js** from [nodejs.org](https://nodejs.org/) (LTS)
   - Includes npm
2. Install **ffmpeg** 
   - Use Chocolatey: `choco install ffmpeg`
   - Or download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
3. Install **Visual C++ Build Tools** (for native modules)
   - Download from [microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### Step 1: Prepare Source

```bash
# Get the source code
cd ~/Documents/Projects/test_viewer

# (Or wherever you cloned/downloaded it)
```

### Step 2: Run Build Script

#### Linux
```bash
chmod +x build-linux.sh
./build-linux.sh
```

#### Windows
```cmd
build-windows.bat
```

Build will:
1. Install npm dependencies
2. Compile React app
3. Bundle with Electron
4. Create standalone executable

**Time**: 3-10 minutes (first time takes longer)

### Step 3: Find Your Executable

#### Linux
```bash
ls -lh dist/*.AppImage
# Output: dist/Video Capture Preview-1.0.0.AppImage (or similar)
```

#### Windows
```cmd
dir dist\*.exe
REM Output: 
REM   Video Capture Preview Setup.exe (installer)
REM   Video Capture Preview.exe (portable)
```

---

## Running the Standalone App

### Linux (AppImage)

**Option 1: From command line**
```bash
./dist/Video\ Capture\ Preview-*.AppImage
```

**Option 2: Double-click in file manager**
- Open Files
- Navigate to `dist/` folder
- Double-click `.AppImage` file
- May need to make executable first: Right-click → Properties → Permissions → "Allow execution"

**Option 3: Create desktop shortcut**
```bash
# Create launcher script
cat > ~/Desktop/VideoCapture.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Video Capture Preview
Exec=$HOME/Documents/Projects/test_viewer/dist/Video\ Capture\ Preview-1.0.0.AppImage
Icon=multimedia-video-player
Categories=Multimedia;
EOF

chmod +x ~/Desktop/VideoCapture.desktop
```

### Windows (.exe)

**Option 1: Portable version (no installation)**
- Just double-click `Video Capture Preview.exe` from `dist/` folder
- No admin rights needed
- Can move the .exe anywhere you want

**Option 2: Installer version**
- Double-click `Video Capture Preview Setup.exe`
- Follow installation wizard
- Created Start Menu shortcut
- Adds to Programs list (for easy uninstall)

**Option 3: Create shortcut**
- Right-click `Video Capture Preview.exe` → Send to → Desktop (create shortcut)
- Rename if desired
- Double-click shortcut to launch

---

## Distributing the App

### For Linux Users

**Create distribution package:**
```bash
./build-linux.sh  # Creates AppImage

# Also create .deb package:
npx electron-builder --linux deb

# Results:
# dist/Video Capture Preview-1.0.0.AppImage  (universal, preferred)
# dist/video-capture-preview_1.0.0_amd64.deb (package manager friendly)
```

**Share with users:**
1. Upload `.AppImage` to GitHub releases or your server
2. Users download and make executable:
   ```bash
   chmod +x Video\ Capture\ Preview-*.AppImage
   ./Video\ Capture\ Preview-*.AppImage
   ```

### For Windows Users

**Create distribution:**
```cmd
build-windows.bat  # Creates both portable and installer
```

**Share with users:**
1. Upload `Video Capture Preview.exe` (portable) to your server
2. Users just download and run - no installation needed!

OR

1. Upload `Video Capture Preview Setup.exe` (installer)
2. Users run installer, then use Start Menu shortcut

---

## Customizing the Build

### Change App Name
Edit `package.json`:
```json
{
  "name": "my-custom-app-name",
  "productName": "My Video App",
  // ...
}
```

### Change Icon
1. Create icon file:
   - Linux: 512x512 PNG → save as `public/icon.png`
   - Windows: ICO file → save as `public/icon.ico`

2. Update `package.json` build config:
```json
"build": {
  "linux": {
    "icon": "public/icon.png"
  },
  "win": {
    "icon": "public/icon.ico"
  }
}
```

### Change Version
Edit `package.json`:
```json
{
  "version": "1.1.0",  // Change this
  // ...
}
```

### Change Product Details
Edit `package.json` build section:
```json
"build": {
  "appId": "com.yourcompany.videocapture",
  "productName": "My Video Preview",
  "categories": ["Multimedia", "Video"],
  // ...
}
```

---

## Troubleshooting Build Issues

### "npm: command not found"
```bash
# Linux
sudo apt-get install nodejs npm

# Windows
# Download from nodejs.org and reinstall
```

### "ffmpeg: command not found"
```bash
# Linux
sudo apt-get install ffmpeg

# Windows (in PowerShell as Admin)
choco install ffmpeg
# OR download and add to PATH manually
```

### Build fails with "Cannot find module"
```bash
# Clean and rebuild
rm -rf node_modules
npm install

# Then retry build:
# Linux: ./build-linux.sh
# Windows: build-windows.bat
```

### Windows installer crashes on install
1. Ensure Visual C++ Build Tools installed
2. Run build script as Administrator:
   - Right-click `cmd` → Run as administrator
   - Type: `build-windows.bat`

### "electron-builder not found"
```bash
npm install --save-dev electron-builder

# Then retry build script
```

### AppImage "permission denied" (Linux)
```bash
chmod +x dist/*.AppImage
./dist/Video\ Capture\ Preview-*.AppImage
```

---

## Advanced Build Options

### Build Only for Linux (no Windows)
```bash
npm run react-build
npx electron-builder --linux AppImage deb
```

### Build Only for Windows (no Linux)
```bash
npm run react-build
npx electron-builder --win nsis portable
```

### Build Both in One Command
```bash
npm run react-build
npx electron-builder --linux AppImage deb --win nsis portable
```

### Notarize macOS Build (if on Mac)
```bash
npx electron-builder --mac --publish never
# (requires Apple Developer certificate)
```

### Sign Windows Executable (Code Signing)
```json
{
  "build": {
    "win": {
      "certificateFile": "/path/to/certificate.pfx",
      "certificatePassword": "your-password",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

---

## Multi-Platform Build

For distributing to both Linux and Windows users:

```bash
# On Linux machine:
./build-linux.sh
# Creates: dist/Video\ Capture\ Preview-*.AppImage

# On Windows machine (or in VM):
build-windows.bat
# Creates: dist/Video\ Capture\ Preview.exe
#         dist/Video\ Capture\ Preview\ Setup.exe

# Package both for distribution:
# - Linux: dist/Video\ Capture\ Preview-1.0.0.AppImage
# - Windows: dist/Video\ Capture\ Preview.exe (or .msi/)
```

Or use **GitHub Actions** for automated cross-platform builds:

```yaml
name: Build
on: [push, release]
jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: ./build-linux.sh
      - uses: actions/upload-artifact@v3
        with:
          name: linux-build
          path: dist/*.AppImage
  
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: .\build-windows.bat
      - uses: actions/upload-artifact@v3
        with:
          name: windows-build
          path: dist/*.exe
```

---

## File Sizes

Typical application sizes:

| Platform | Type | Size |
|----------|------|------|
| Linux | AppImage | 200-250 MB |
| Linux | .deb | 80-120 MB (compressed) |
| Windows | Portable .exe | 200-250 MB |
| Windows | Installer .exe | 90-120 MB (compressed) |

*Sizes include Electron + Node.js + ffmpeg binaries*

---

## Post-Build

### Move/Share the Executable

**Linux:**
```bash
# Copy to share location
cp dist/Video\ Capture\ Preview-*.AppImage ~/Downloads/

# Or upload to GitHub:
gh release create v1.0.0 dist/*.AppImage
```

**Windows:**
```cmd
# Copy to share location
copy dist\*.exe %USERPROFILE%\Downloads\

REM Or upload to GitHub
gh release create v1.0.0 dist\*.exe
```

### Create Release Notes

```markdown
# Video Capture Preview v1.0.0

## Download

- **Linux**: [Video Capture Preview-1.0.0.AppImage](...)
- **Windows**: [Video Capture Preview.exe](...)

## Installation

**Linux**: 
```bash
chmod +x Video\ Capture\ Preview-*.AppImage
./Video\ Capture\ Preview-*.AppImage
```

**Windows**: 
Double-click `Video Capture Preview.exe`

## Requirements

- Linux 18.04+ or Windows 7+
- ffmpeg installed locally (for video device access)
- Video capture device (HDMI capture card, USB camera, etc.)
```

---

## Summary

| Task | Command |
|------|---------|
| Build for Linux | `./build-linux.sh` |
| Build for Windows | `build-windows.bat` |
| Run Linux app | `./dist/Video\ Capture\ Preview-*.AppImage` |
| Run Windows app | Double-click `dist\Video Capture Preview.exe` |
| Distribute | Upload `.AppImage` or `.exe` file |

You now have a professional, distributable desktop application! 🚀

