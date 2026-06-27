const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Determine server URL
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
// Allow overriding server URL via command line: --server=http://192.168.1.100:3001
const serverArg = process.argv.find(a => a.startsWith('--server='));
const SERVER_URL = isDev ? 'http://localhost:3001' : (serverArg ? serverArg.split('=')[1] : (process.env.OA_SERVER_URL || 'http://localhost:3001'));

// ═══════════════════════════════════════════
// Window Management
// ═══════════════════════════════════════════

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'OA 审批系统',
    icon: getIconPath(),
    backgroundColor: '#f3f3f2',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Frameless with custom title bar (optional)
    // frame: false,
    autoHideMenuBar: true,
  });

  // Load the React app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load from bundled client dist
    const localDist = path.join(__dirname, 'client-dist', 'index.html');
    if (fs.existsSync(localDist)) {
      mainWindow.loadFile(localDist);
    } else {
      // Fallback: load from server
      mainWindow.loadURL(SERVER_URL);
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // External links open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimize to tray
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    }
  });

  // Handle page title
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
  });
}

// ═══════════════════════════════════════════
// System Tray
// ═══════════════════════════════════════════

function createTray() {
  // Create tray icon from PNG
  let trayIcon;
  const iconPath = getIconPath();
  
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // Create a simple 16x16 colored square as fallback
      const { createCanvas } = { createCanvas: null }; // skip if not available
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show();
        if (process.platform === 'darwin') app.dock?.show();
      }
    },
    { type: 'separator' },
    {
      label: '打开网页版',
      click: () => shell.openExternal(SERVER_URL)
    },
    { type: 'separator' },
    {
      label: '退出 OA 审批',
      click: () => {
        isQuitting = true;
        tray = null;
        app.quit();
      }
    },
  ]);

  tray.setToolTip('OA 审批系统');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    if (process.platform === 'darwin') app.dock?.show();
  });
}

// ═══════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════

function setupIPC() {
  ipcMain.handle('get-version', () => app.getVersion());

  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());

  ipcMain.handle('open-file-dialog', async (_, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.filePaths;
  });

  ipcMain.on('show-notification', (_, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: getIconPath() }).show();
    }
  });

  ipcMain.handle('check-for-updates', async () => {
    // Auto-update logic could go here
    return { updateAvailable: false, version: app.getVersion() };
  });
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function getIconPath() {
  const candidates = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, '..', 'client', 'public', 'icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'icon.png');
}

// ═══════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════

app.whenReady().then(() => {
  setupIPC();
  createWindow();
  createTray();

  // macOS: re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });

  // Windows: single instance lock
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // On macOS, keep app running in menu bar
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
