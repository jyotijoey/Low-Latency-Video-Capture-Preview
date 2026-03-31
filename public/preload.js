const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  startVideo: (device) => ipcRenderer.invoke('start-video', device),
  stopVideo: () => ipcRenderer.invoke('stop-video'),
  listVideoDevices: () => ipcRenderer.invoke('list-video-devices'),
  onVideoFrame: (callback) =>
    ipcRenderer.on('video-frame', (event, data) => callback(data)),
  onVideoConfig: (callback) =>
    ipcRenderer.on('video-config', (event, cfg) => callback(cfg)),
  onVideoError: (callback) =>
    ipcRenderer.on('video-error', (event, error) => callback(error)),
  onVideoStopped: (callback) => ipcRenderer.on('video-stopped', callback),
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),
});
