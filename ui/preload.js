// ui/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scan:    () => ipcRenderer.invoke('SCAN'),
  kill:    (pids) => ipcRenderer.invoke('KILL', pids),
  logs:    () => ipcRenderer.invoke('LOGS')
});