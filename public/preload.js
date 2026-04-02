const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  startVideo: (device) => ipcRenderer.invoke('start-video', device),
  stopVideo: () => ipcRenderer.invoke('stop-video'),
  listVideoDevices: () => ipcRenderer.invoke('list-video-devices'),
  sendRemoteKeypress: (deviceAddress, key) =>
    ipcRenderer.invoke('send-remote-keypress', { deviceAddress, key }),
  setDeviceLogSource: (deviceAddress) =>
    ipcRenderer.invoke('set-device-log-source', { deviceAddress }),
  stopDeviceLogs: () => ipcRenderer.invoke('stop-device-logs'),
  onVideoFrame: (callback) =>
    ipcRenderer.on('video-frame', (event, data) => callback(data)),
  onVideoConfig: (callback) =>
    ipcRenderer.on('video-config', (event, cfg) => callback(cfg)),
  onVideoError: (callback) =>
    ipcRenderer.on('video-error', (event, error) => callback(error)),
  onVideoStopped: (callback) => ipcRenderer.on('video-stopped', callback),
  onRemoteStatus: (callback) =>
    ipcRenderer.on('remote-status', (event, status) => callback(status)),
  onDeviceLogBatch: (callback) =>
    ipcRenderer.on('device-log-batch', (event, batch) => callback(batch)),
  onDeviceLogStatus: (callback) =>
    ipcRenderer.on('device-log-status', (event, status) => callback(status)),
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),
});
