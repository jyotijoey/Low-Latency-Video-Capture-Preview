import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import RemoteControl from './components/RemoteControl';

const REMOTE_STORAGE_KEY = 'remote-device-address';
const KEYBOARD_REMOTE_STORAGE_KEY = 'remote-keyboard-enabled';

const isEditableTarget = (target) => {
  if (!target) {
    return false;
  }

  const tagName = target.tagName?.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

const isValidIpAddress = (value) => /^(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?$/.test(value.trim());

const keyboardActionMap = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Enter: 'Select',
  Backspace: 'Back',
  Home: 'Home',
  ' ': 'Play',
};

function App() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const imageDataRef = useRef(null);
  const frameSizeRef = useRef(960 * 540 * 4);
  const deviceAddressRef = useRef('');
  const drawFrameRef = useRef(null);
  const sendRemoteKeypressRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [platform, setPlatform] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [videoConfig, setVideoConfig] = useState({ width: 960, height: 540 });
  const [deviceAddress, setDeviceAddress] = useState('');
  const [remoteStatus, setRemoteStatus] = useState(null);
  const [keyboardRemoteEnabled, setKeyboardRemoteEnabled] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isSendingRemoteKey, setIsSendingRemoteKey] = useState(false);

  // Image data buffer and dimensions
  const WIDTH = videoConfig.width;
  const HEIGHT = videoConfig.height;

  useEffect(() => {
    const storedDeviceAddress = window.localStorage.getItem(REMOTE_STORAGE_KEY) || '';
    const storedKeyboardPreference = window.localStorage.getItem(KEYBOARD_REMOTE_STORAGE_KEY) === 'true';

    setDeviceAddress(storedDeviceAddress);
    deviceAddressRef.current = storedDeviceAddress;
    setKeyboardRemoteEnabled(storedKeyboardPreference);

    const initApp = async () => {
      const plat = await window.electronAPI.getPlatform();
      setPlatform(plat);

      // List available video devices
      const devs = await window.electronAPI.listVideoDevices();
      setDevices(devs);
      if (devs.length > 0) {
        setSelectedDevice(devs[0].path);
      }

      // Listen for video frames
      window.electronAPI.onVideoFrame((frameData) => {
        drawFrameRef.current?.(frameData);
      });

      window.electronAPI.onVideoConfig((cfg) => {
        setVideoConfig({ width: cfg.width, height: cfg.height });
        frameSizeRef.current = cfg.frameBytes;
        imageDataRef.current = null;
      });

      window.electronAPI.onVideoError((err) => {
        setError(`Video error: ${err}`);
        setStatus('Error');
      });

      window.electronAPI.onVideoStopped(() => {
        setIsRunning(false);
        setStatus('Stopped');
      });

      window.electronAPI.onRemoteStatus((nextStatus) => {
        setRemoteStatus(nextStatus);
      });
    };

    initApp();

    return () => {
      window.electronAPI.removeListener('video-frame');
      window.electronAPI.removeListener('video-config');
      window.electronAPI.removeListener('video-error');
      window.electronAPI.removeListener('video-stopped');
      window.electronAPI.removeListener('remote-status');
    };
  }, []);

  useEffect(() => {
    deviceAddressRef.current = deviceAddress;
    window.localStorage.setItem(REMOTE_STORAGE_KEY, deviceAddress);
  }, [deviceAddress]);

  useEffect(() => {
    window.localStorage.setItem(KEYBOARD_REMOTE_STORAGE_KEY, String(keyboardRemoteEnabled));
  }, [keyboardRemoteEnabled]);

  const drawFrame = (frameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // IPC can deliver binary payloads as Buffer-like objects, Uint8Array,
    // or ArrayBuffer depending on Electron serialization path.
    let src = frameData;
    if (frameData && frameData.type === 'Buffer' && Array.isArray(frameData.data)) {
      src = frameData.data;
    } else if (frameData instanceof ArrayBuffer) {
      src = new Uint8Array(frameData);
    } else if (ArrayBuffer.isView(frameData)) {
      src = frameData;
    }

    const frameSize = frameSizeRef.current;
    if (!src || src.length < frameSize) {
      return;
    }

    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });
    }

    if (!imageDataRef.current) {
      imageDataRef.current = ctxRef.current.createImageData(WIDTH, HEIGHT);
    }

    const typedSrc = src instanceof Uint8Array ? src : Uint8Array.from(src);
    imageDataRef.current.data.set(typedSrc.subarray(0, frameSize));

    ctxRef.current.putImageData(imageDataRef.current, 0, 0);
  };

  drawFrameRef.current = drawFrame;

  const startVideo = async () => {
    if (!selectedDevice) {
      setError('No video device selected');
      return;
    }

    try {
      setError('');
      setStatus('Starting...');
      await window.electronAPI.startVideo(selectedDevice);
      setIsRunning(true);
      setStatus('Playing');
    } catch (err) {
      setError(`Failed to start: ${err}`);
      setStatus('Error');
    }
  };

  const stopVideo = async () => {
    try {
      setError('');
      setStatus('Stopping...');
      await window.electronAPI.stopVideo();
      setIsRunning(false);
      setStatus('Stopped');
    } catch (err) {
      setError(`Failed to stop: ${err}`);
    }
  };

  const sendRemoteKeypress = async (key) => {
    const trimmedAddress = deviceAddressRef.current.trim();

    if (!trimmedAddress) {
      setRemoteStatus({ type: 'error', message: 'Device IP address is required' });
      return;
    }

    if (!isValidIpAddress(trimmedAddress)) {
      setRemoteStatus({ type: 'error', message: 'Enter a valid IPv4 address' });
      return;
    }

    try {
      setIsSendingRemoteKey(true);
      setRemoteStatus({ type: 'pending', message: `Sending ${key}...` });
      const result = await window.electronAPI.sendRemoteKeypress(trimmedAddress, key);
      setRemoteStatus({ type: 'success', message: result.message || `Sent ${key}` });
    } catch (err) {
      setRemoteStatus({ type: 'error', message: err.message || `Failed to send ${key}` });
    } finally {
      setIsSendingRemoteKey(false);
    }
  };

  sendRemoteKeypressRef.current = sendRemoteKeypress;

  useEffect(() => {
    const handleKeyDown = async (event) => {
      if (!keyboardRemoteEnabled || !document.hasFocus() || isEditableTarget(event.target)) {
        return;
      }

      const action = keyboardActionMap[event.key];
      if (!action) {
        return;
      }

      event.preventDefault();
      await sendRemoteKeypressRef.current?.(action);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardRemoteEnabled]);

  return (
    <div className="app">
      <header className="header">
        <h1>Video Capture Preview</h1>
        <p className="platform">Platform: {platform}</p>
      </header>

      <div className="container">
        <div className="video-section">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            className="video-canvas"
          />
          <div className="status-bar">
            <span className={`status ${status.toLowerCase()}`}>{status}</span>
          </div>
        </div>

        <div className="control-section">
          <div className="control-group">
            <label htmlFor="device-select">Video Device:</label>
            <select
              id="device-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isRunning}
            >
              {devices.map((device) => (
                <option key={device.path} value={device.path}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div className="button-group">
            <button
              onClick={startVideo}
              disabled={isRunning}
              className="btn btn-start"
            >
              Start
            </button>
            <button
              onClick={stopVideo}
              disabled={!isRunning}
              className="btn btn-stop"
            >
              Stop
            </button>
          </div>

          <RemoteControl
            deviceAddress={deviceAddress}
            onDeviceAddressChange={setDeviceAddress}
            keyboardEnabled={keyboardRemoteEnabled}
            onKeyboardEnabledChange={setKeyboardRemoteEnabled}
            showKeyboardHelp={showKeyboardHelp}
            onKeyboardHelpToggle={() => setShowKeyboardHelp((current) => !current)}
            onSendKeypress={sendRemoteKeypress}
            remoteStatus={remoteStatus}
            isSending={isSendingRemoteKey}
          />

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default App;
