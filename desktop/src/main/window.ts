import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { isInternalNavigation } from './servers';

export function createShellWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
}

export function applyNavigationPolicy(
  win: BrowserWindow,
  getCurrentOrigin: () => string | null,
): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    const origin = getCurrentOrigin();
    if (origin && isInternalNavigation(url, origin)) {
      return { action: 'allow' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const origin = getCurrentOrigin();
    // Always allow the local picker page (file://) and internal navigations.
    if (url.startsWith('file://')) return;
    if (origin && isInternalNavigation(url, origin)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
}
