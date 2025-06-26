// ui/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('SCAN', async () => {
  const { data } = await axios.get('http://127.0.0.1:5000/scan');
  return data;
});
ipcMain.handle('KILL', async (_e, pids) => {
  const { data } = await axios.post('http://127.0.0.1:5000/kill', {
    pids, dry_run: false
  });
  return data;
});
ipcMain.handle('LOGS', async () => {
  const { data } = await axios.get('http://127.0.0.1:5000/logs');
  return data.logs || [];
});