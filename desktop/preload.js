/**
 * Electron Preload Script
 * Provides a secure bridge between renderer and Node.js
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => process.platform,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File operations
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Deep links
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (_, url) => callback(url)),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
});
