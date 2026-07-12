import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { join } from 'node:path';
import { BUILTIN_SERVERS, normalizeServerUrl } from './servers';
import { readConfig, writeConfig } from './store';
import { createShellWindow, applyNavigationPolicy } from './window';
import { buildAppMenu } from './menu';

let win: BrowserWindow | null = null;
let currentOrigin: string | null = null;

function userDataDir(): string {
  return app.getPath('userData');
}

function loadPicker(): void {
  currentOrigin = null;
  win?.loadFile(join(__dirname, '..', 'renderer', 'picker.html'));
  refreshMenu();
}

function loadServer(origin: string): void {
  currentOrigin = origin;
  writeConfig(userDataDir(), { selectedOrigin: origin });
  win?.loadURL(origin);
  refreshMenu();
}

function refreshMenu(): void {
  Menu.setApplicationMenu(
    buildAppMenu({
      servers: BUILTIN_SERVERS,
      currentOrigin,
      onSelect: (origin) => loadServer(origin),
      onReset: () => loadPicker(),
    }),
  );
}

function start(): void {
  win = createShellWindow();
  applyNavigationPolicy(win, () => currentOrigin);
  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });

  const saved = readConfig(userDataDir()).selectedOrigin;
  if (saved) {
    loadServer(saved);
  } else {
    loadPicker();
  }
}

ipcMain.handle('revornix:getBuiltinServers', () => BUILTIN_SERVERS);

ipcMain.handle('revornix:selectServer', (_event, input: string) => {
  const origin = normalizeServerUrl(input);
  if (!origin) {
    return { ok: false, error: 'Only https:// URLs (or http://localhost) are allowed.' };
  }
  loadServer(origin);
  return { ok: true };
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(start);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) start();
  });
}
