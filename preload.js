const { contextBridge, ipcRenderer } = require('electron');

/**
 * Safe IPC bridge exposed to the renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  /**
   * Show a file or directory in the native file manager (e.g. Windows Explorer)
   * @param {string} fullPath
   */
  showItemInFolder: (fullPath) => {
    if (typeof fullPath === 'string' && fullPath.trim()) {
      return ipcRenderer.invoke('show-item-in-folder', fullPath);
    }
    return Promise.resolve(false);
  },

  /**
   * Open a path in the default application / file manager
   * @param {string} fullPath
   */
  openPath: (fullPath) => {
    if (typeof fullPath === 'string' && fullPath.trim()) {
      return ipcRenderer.invoke('open-path', fullPath);
    }
    return Promise.resolve('');
  },

  /**
   * Open an external URL in the default browser
   * @param {string} url
   */
  openExternal: (url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      return ipcRenderer.invoke('open-external', url);
    }
    return Promise.resolve();
  },
});
