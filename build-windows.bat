@echo off
REM Build script for Windows
REM Creates standalone .exe (no npm/ffmpeg needed by end user)

echo ==================================
echo Building Video Capture Preview
echo ==================================

echo.
echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 goto error

echo.
echo Step 2: Building React + Electron bundle...
call npm run build
if errorlevel 1 goto error

echo.
echo ==================================
echo Build complete!
echo ==================================
echo.
echo Your executables are ready in: dist\
dir dist\*.exe /b 2>nul
echo.
echo To run:
echo   Video Capture Preview.exe        - Portable (just double-click, no install)
echo   Video Capture Preview Setup.exe  - Installer (adds Start Menu + desktop shortcut)
echo.
echo NOTE: ffmpeg is BUNDLED inside - no external install needed!
echo.
goto end

:error
echo.
echo ERROR: Build failed. See messages above.
echo.
goto end

:end
pause
