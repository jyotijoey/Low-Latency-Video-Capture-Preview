# Testing Guide

## Pre-Launch Checklist

Before starting the app, verify:

- [ ] ffmpeg installed and in PATH: `ffmpeg -version`
- [ ] Node.js installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Video device connected and recognized
- [ ] Dependencies installed: `npm install` (or check `node_modules/` exists)

## Test 1: Verify ffmpeg Works with Your Device

### Linux
```bash
# Test basic V4L2 capture (will display video info)
ffmpeg -f v4l2 -list_formats all -i /dev/video0

# Test actual capture (will create output.raw, Ctrl+C to stop)
ffmpeg -f v4l2 -i /dev/video0 -t 5 output.raw
```

### Windows
```cmd
# List all DirectShow devices
ffmpeg -f dshow -list_devices true -i dummy

# List device formats
ffmpeg -f dshow -list_options true -i "video=DEVICE_NAME"

# Test capture (replace DEVICE_NAME)
ffmpeg -f dshow -i "video=DEVICE_NAME" -t 5 output.raw
```

## Test 2: Verify React Development Setup

```bash
cd ~/Documents/Projects/test_viewer
npm install

# Check if React scripts work
npx react-scripts --version

# Should show version like "5.0.1"
```

## Test 3: Run Development App

```bash
# From project directory
npm start

# Should see:
# 1. "Compiled successfully!" in terminal
# 2. Electron app window opens
# 3. Device selector shows available devices
```

## Test 4: Verify IPC Communication

With the app running:

1. **Device selector** should populate automatically
   - If empty, check [LINUX_SETUP.md](LINUX_SETUP.md) or [WINDOWS_SETUP.md](WINDOWS_SETUP.md)

2. **Select a device** from dropdown

3. **Click "Start"**
   - Status should change to "Playing" (green)
   - Canvas area should show video feed (may be black initially)
   - If nothing appears after 5 seconds, check troubleshooting

4. **Click "Stop"**
   - Status returns to "Idle"
   - Video stream stops

## Test 5: Stress Test (Optional)

```bash
# Start/stop video multiple times rapidly
# 1. Click Start
# 2. Wait 2 seconds
# 3. Click Stop
# 4. Repeat 10 times

# Watch for:
# - Memory leaks (check system monitor)
# - Process accumulation (ps aux | grep ffmpeg)
# - Error messages in console
```

## Test 6: Performance Measurement

### Monitor CPU Usage (Linux)
```bash
# In another terminal, monitor ffmpeg process
while true; do ps aux | grep '[f]fmpeg' | awk '{print $3, $4}'; sleep 1; done

# Watch CPU% and MEM% columns
```

### Monitor Memory (Linux)
```bash
# Check memory before and after starting video
free -h

# During streaming, check again:
free -h
top -p $(pgrep ffmpeg)
```

## Common Test Scenarios

### Scenario 1: Device Enumeration Failing
**Expected**: Device dropdown populated
**Actual**: Empty dropdown

**Tests**:
```bash
# Linux
ls -la /dev/video*

# Windows
ffmpeg -f dshow -list_devices true -i dummy | findstr "video"
```

**Fix**: See [LINUX_SETUP.md](LINUX_SETUP.md) or [WINDOWS_SETUP.md](WINDOWS_SETUP.md)

### Scenario 2: App Starts But No Video
**Expected**: Live feed in canvas after clicking "Start"
**Actual**: Black canvas

**Tests**:
1. Check console for error messages (F12 in Electron dev tools)
2. Verify device is accessible:
   ```bash
   # Linux
   ffmpeg -f v4l2 -i /dev/video0 -t 2 /dev/null
   ```
3. Try different device from dropdown

### Scenario 3: App Crashes on Start
**Expected**: App launches cleanly
**Actual**: Crashes immediately

**Tests**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Try launching from terminal to see error:
npm start 2>&1 | head -50
```

### Scenario 4: High CPU Usage
**Expected**: CPU usage 15-30% during playback
**Actual**: 80%+ CPU

**Tests**:
1. Lower FPS in config: change `-r 30` to `-r 15`
2. Lower resolution: change `scale=1280:720` to `scale=640:480`
3. Verify no other apps using camera
4. Check if hardware acceleration available

## Automated Testing Script

Save as `test.sh` (Linux):

```bash
#!/bin/bash

echo "=== Video Capture Preview Test Suite ==="

echo "1. Checking ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ ffmpeg not found. Install: sudo apt-get install ffmpeg"
  exit 1
fi
echo "✓ ffmpeg found: $(ffmpeg -version | head -1)"

echo ""
echo "2. Checking Node.js..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  exit 1
fi
echo "✓ Node.js: $(node --version)"

echo ""
echo "3. Checking npm..."
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi
echo "✓ npm: $(npm --version)"

echo ""
echo "4. Checking video devices..."
DEVICES=$(ls -1 /dev/video* 2>/dev/null)
if [ -z "$DEVICES" ]; then
  echo "❌ No video devices found"
  exit 1
fi
echo "✓ Devices found:"
echo "$DEVICES"

echo ""
echo "5. Checking node_modules..."
if [ ! -d "node_modules" ]; then
  echo "⚠ node_modules not found. Installing..."
  npm install
else
  echo "✓ node_modules exists"
fi

echo ""
echo "=== All checks passed! ==="
echo "Run: npm start"
```

Run with:
```bash
chmod +x test.sh
./test.sh
```

## Continuous Integration (CI) Check

For automated testing in CI/CD:

```yaml
# Example GitHub Actions workflow
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install ffmpeg
        run: sudo apt-get install ffmpeg
      
      - name: Install dependencies
        run: npm ci
      
      - name: Test ffmpeg integration
        run: ffmpeg -version
      
      - name: React build test
        run: npm run react-build
```

## Performance Benchmarks

### Expected Performance (on reasonable hardware)

| Metric | Linux | Windows |
|--------|-------|---------|
| Startup time | 2-3s | 2-4s |
| First frame | <200ms | <300ms |
| Frame latency | 100-150ms | 150-250ms |
| CPU (1080p, 30fps) | 10-20% | 15-30% |
| Memory (base) | 150-200MB | 180-250MB |

*Hardware: 4-core CPU, 8GB RAM, SSD*

### On Low-End Hardware

For slower systems:
1. Reduce resolution to 720p or 480p
2. Reduce FPS to 15fps
3. Close other applications
4. Or upgrade to SSD if using HDD

