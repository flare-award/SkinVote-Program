const { app, BrowserWindow, shell, ipcMain, session, Menu, dialog } = require('electron');
const path = require('node:path');

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

function getIconPath() {
  if (process.platform === 'win32') {
    const ico = path.join(__dirname, 'assets', 'icon.ico');
    return ico;
  }
  return path.join(__dirname, 'assets', 'icon.png');
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'SkinVote',
            submenu: [
              { role: 'about', label: 'О программе SkinVote' },
              { type: 'separator' },
              { role: 'services', label: 'Службы' },
              { type: 'separator' },
              { role: 'hide', label: 'Скрыть SkinVote' },
              { role: 'hideOthers', label: 'Скрыть остальные' },
              { role: 'unhide', label: 'Показать все' },
              { type: 'separator' },
              { role: 'quit', label: 'Завершить SkinVote' },
            ],
          },
        ]
      : []),
    {
      label: 'Файл',
      submenu: [
        isMac ? { role: 'close', label: 'Закрыть окно' } : { role: 'quit', label: 'Выход' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Перезагрузить' },
        { role: 'forceReload', label: 'Принудительная перезагрузка' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Сбросить масштаб' },
        { role: 'zoomIn', label: 'Увеличить' },
        { role: 'zoomOut', label: 'Уменьшить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полноэкранный режим' },
      ],
    },
    {
      label: 'Окно',
      submenu: [
        { role: 'minimize', label: 'Свернуть' },
        { role: 'zoom', label: 'Развернуть' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'Все окна на передний план' },
            ]
          : [{ role: 'close', label: 'Закрыть' }]),
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе SkinVote',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'SkinVote',
              message: 'SkinVote v1.0.0',
              detail:
                'Автономное приложение для визуального 3D-просмотра и оценки скинов Minecraft.\n' +
                'Работает полностью оффлайн без подключения к интернету.',
              icon: getIconPath(),
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    title: 'SkinVote — оценка скинов Minecraft',
    icon: iconPath,
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b0c10',
    show: false, // Shown on ready-to-show to prevent flash
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Strict offline Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:;",
        ],
      },
    });
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Intercept new window requests (e.g. target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for native desktop integration
ipcMain.handle('show-item-in-folder', async (event, fullPath) => {
  if (typeof fullPath === 'string' && fullPath.trim()) {
    try {
      shell.showItemInFolder(path.normalize(fullPath));
      return true;
    } catch {
      return false;
    }
  }
  return false;
});

ipcMain.handle('open-path', async (event, fullPath) => {
  if (typeof fullPath === 'string' && fullPath.trim()) {
    try {
      return await shell.openPath(path.normalize(fullPath));
    } catch (err) {
      return err.message;
    }
  }
  return '';
});

ipcMain.handle('open-external', async (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
  }
});

// App lifecycle
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
