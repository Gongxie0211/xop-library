const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  platform: () => ipcRenderer.invoke('platform'),

  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),

  readFileText: (filePath) => ipcRenderer.invoke('read-file-text', filePath),

  readFileBinary: async (filePath) => {
    const u8 = await ipcRenderer.invoke('read-file-binary', filePath);
    // contextBridge transfers Buffer as Uint8Array; extract its ArrayBuffer
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  },

  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
});
