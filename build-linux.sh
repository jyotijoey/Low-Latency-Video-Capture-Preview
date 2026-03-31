#!/bin/bash

# Build script for Linux
# Creates standalone AppImage (no npm/ffmpeg needed by end user)

set -e  # Exit on error

echo "=================================="
echo "Building Video Capture Preview"
echo "=================================="

echo ""
echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "Step 2: Building React + Electron bundle..."
npm run build

echo ""
echo "=================================="
echo "Build complete!"
echo "=================================="
echo ""
echo "Your executable is ready:"
ls -lh dist/*.AppImage 2>/dev/null || true

echo ""
echo "To run:"
echo "  chmod +x dist/*.AppImage          (make it executable)"
echo "  ./dist/Video\ Capture\ Preview-*.AppImage  (launch)"
echo ""
echo "Or double-click the .AppImage in your file manager."
echo ""
echo "NOTE: ffmpeg is BUNDLED inside - no external install needed!"
