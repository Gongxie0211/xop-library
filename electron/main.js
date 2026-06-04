const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');

function createWindow() {
  const isMac = process.platform === 'darwin';

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'viewer.html'));

  // Native menu
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'ファイル',
      submenu: [
        { label: 'フォルダを追加', click: () => win.webContents.executeJavaScript('addLibrary()') },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.executeJavaScript('saveFile()') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: '表示',
      submenu: [
        { label: 'ソース',    accelerator: 'CmdOrCtrl+1', click: () => win.webContents.executeJavaScript("switchMode('source')") },
        { label: '並列',     accelerator: 'CmdOrCtrl+2', click: () => win.webContents.executeJavaScript("switchMode('split')") },
        { label: 'プレビュー', accelerator: 'CmdOrCtrl+3', click: () => win.webContents.executeJavaScript("switchMode('preview')") },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC handlers ───────────────────────────────
app.whenReady().then(() => {
  ipcMain.handle('platform', () => process.platform);

  ipcMain.handle('select-directory', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const res = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'フォルダを選択',
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('read-dir', (_, dirPath) => {
    try {
      return fs.readdirSync(dirPath, { withFileTypes: true }).map(e => {
        const info = { name: e.name, isDirectory: e.isDirectory() };
        if (!e.isDirectory()) {
          try {
            const stat = fs.statSync(path.join(dirPath, e.name));
            info.size     = stat.size;
            info.modified = stat.mtimeMs;
          } catch {}
        }
        return info;
      });
    } catch { return []; }
  });

  ipcMain.handle('read-file-text', (_, filePath) => {
    return fs.readFileSync(filePath, 'utf8');
  });

  ipcMain.handle('read-file-binary', (_, filePath) => {
    const buf = fs.readFileSync(filePath);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  });

  ipcMain.handle('write-file', (_, filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
