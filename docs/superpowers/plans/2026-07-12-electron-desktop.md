# Electron Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Electron thin-shell desktop app under `desktop/` that wraps the remote Revornix web client, lets the user pick a server (app.revornix.com / app.revornix.cn / custom), and builds installers for macOS and Windows.

**Architecture:** A minimal Electron main process (TypeScript, compiled with `tsc`, no bundler) opens one `BrowserWindow` pointed at a remote server origin. Server selection and navigation-policy logic live in pure, unit-tested modules (`servers.ts`, `store.ts`) decoupled from Electron. Packaging uses electron-builder; a dedicated GitHub Actions workflow produces macOS/Windows artifacts on `desktop-v*` tags.

**Tech Stack:** Electron, TypeScript, electron-builder, `node:test` + `tsx` (unit tests), `@playwright/test` (Electron smoke test).

## Global Constraints

- Node 22.x, npm 11.x (repo dev environment).
- Do NOT modify `web/`, `api/`, `celery-worker/`, `gateway/`, or the existing `.github/workflows/docker-push.yml`.
- Electron security baseline for every BrowserWindow: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Built-in server origins (verbatim): `https://app.revornix.com` (label International), `https://app.revornix.cn` (label China Mirror).
- OAuth/third-party hosts allowed to navigate inside the shell window (verbatim): `accounts.google.com`, `github.com`, `open.weixin.qq.com`.
- Custom server URLs: accept `https://<any-host>`; accept `http://` ONLY for `localhost` / `127.0.0.1`; reject everything else.
- No code signing in v1, but packaging config must auto-enable when signing env vars are present.
- All new code lives under `desktop/`. Existing `desktop/.gitignore` already ignores `node_modules/`, `dist/`, `release/`, `*.log`.

---

### Task 1: Scaffold desktop project + server logic module

**Files:**
- Create: `desktop/package.json`
- Create: `desktop/tsconfig.json`
- Create: `desktop/src/main/servers.ts`
- Test: `desktop/src/main/servers.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `interface ServerOption { id: string; label: string; origin: string }`
  - `const BUILTIN_SERVERS: ServerOption[]`
  - `const OAUTH_HOSTS: string[]`
  - `function normalizeServerUrl(input: string): string | null` — returns the normalized origin (`protocol//host`, no trailing slash/path) or `null` if invalid.
  - `function isInternalNavigation(targetUrl: string, currentOrigin: string): boolean` — `true` when a navigation should stay in the shell window (same origin OR an OAuth host).

- [ ] **Step 1: Create `desktop/package.json`**

```json
{
  "name": "revornix-desktop",
  "version": "0.1.0",
  "description": "Revornix desktop shell (Electron)",
  "main": "dist/main/main.js",
  "author": "Qingyon-AI",
  "license": "MIT",
  "scripts": {
    "build": "tsc && npm run copy:assets",
    "copy:assets": "node scripts/copy-assets.mjs",
    "dev": "npm run build && electron .",
    "test": "tsx --test src/**/*.test.ts",
    "package:mac": "npm run build && electron-builder --mac",
    "package:win": "npm run build && electron-builder --win"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "electron": "^34.0.0",
    "electron-builder": "^25.1.8",
    "tsx": "^4.19.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `desktop/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd desktop && npm install`
Expected: `node_modules/` populated, `package-lock.json` created, no error exit.

- [ ] **Step 4: Write the failing test** — create `desktop/src/main/servers.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_SERVERS,
  OAUTH_HOSTS,
  normalizeServerUrl,
  isInternalNavigation,
} from './servers.ts';

test('built-in servers are the two official mirrors', () => {
  assert.deepEqual(
    BUILTIN_SERVERS.map((s) => s.origin),
    ['https://app.revornix.com', 'https://app.revornix.cn'],
  );
});

test('normalizeServerUrl accepts https and strips path', () => {
  assert.equal(normalizeServerUrl('https://app.revornix.com/dashboard'), 'https://app.revornix.com');
  assert.equal(normalizeServerUrl('https://self.example.org'), 'https://self.example.org');
});

test('normalizeServerUrl accepts http only for localhost', () => {
  assert.equal(normalizeServerUrl('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(normalizeServerUrl('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  assert.equal(normalizeServerUrl('http://evil.example.org'), null);
});

test('normalizeServerUrl rejects junk', () => {
  assert.equal(normalizeServerUrl('not-a-url'), null);
  assert.equal(normalizeServerUrl('ftp://app.revornix.com'), null);
  assert.equal(normalizeServerUrl(''), null);
});

test('isInternalNavigation keeps same-origin in window', () => {
  assert.equal(isInternalNavigation('https://app.revornix.com/section/1', 'https://app.revornix.com'), true);
});

test('isInternalNavigation keeps oauth hosts in window', () => {
  for (const host of OAUTH_HOSTS) {
    assert.equal(isInternalNavigation(`https://${host}/authorize?x=1`, 'https://app.revornix.com'), true);
  }
});

test('isInternalNavigation pushes foreign links out', () => {
  assert.equal(isInternalNavigation('https://example.com/doc', 'https://app.revornix.com'), false);
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd desktop && npm test`
Expected: FAIL — cannot find module `./servers.ts` / exports undefined.

- [ ] **Step 6: Write `desktop/src/main/servers.ts`**

```ts
export interface ServerOption {
  id: string;
  label: string;
  origin: string;
}

export const BUILTIN_SERVERS: ServerOption[] = [
  { id: 'com', label: 'app.revornix.com (International)', origin: 'https://app.revornix.com' },
  { id: 'cn', label: 'app.revornix.cn (China Mirror)', origin: 'https://app.revornix.cn' },
];

export const OAUTH_HOSTS: string[] = ['accounts.google.com', 'github.com', 'open.weixin.qq.com'];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function normalizeServerUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol === 'https:') {
    return `${url.protocol}//${url.host}`;
  }
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return `${url.protocol}//${url.host}`;
  }
  return null;
}

export function isInternalNavigation(targetUrl: string, currentOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return false;
  }
  if (`${url.protocol}//${url.host}` === currentOrigin) {
    return true;
  }
  return OAUTH_HOSTS.includes(url.hostname);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd desktop && npm test`
Expected: PASS — all 7 tests green.

- [ ] **Step 8: Commit**

```bash
git add desktop/package.json desktop/tsconfig.json desktop/package-lock.json desktop/src/main/servers.ts desktop/src/main/servers.test.ts
git commit -m "feat: 🎸 Scaffold desktop shell + server selection logic"
```

---

### Task 2: Config persistence module

**Files:**
- Create: `desktop/src/main/store.ts`
- Test: `desktop/src/main/store.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent pure module).
- Produces:
  - `interface DesktopConfig { selectedOrigin: string | null }`
  - `function readConfig(userDataDir: string): DesktopConfig` — reads `<userDataDir>/config.json`; returns `{ selectedOrigin: null }` if missing or malformed.
  - `function writeConfig(userDataDir: string, config: DesktopConfig): void` — writes `<userDataDir>/config.json` (creates dir if needed).

- [ ] **Step 1: Write the failing test** — create `desktop/src/main/store.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig, writeConfig } from './store.ts';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'revornix-desktop-'));
}

test('readConfig returns null selection when file missing', () => {
  const dir = tmp();
  try {
    assert.deepEqual(readConfig(dir), { selectedOrigin: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeConfig then readConfig round-trips', () => {
  const dir = tmp();
  try {
    writeConfig(dir, { selectedOrigin: 'https://app.revornix.cn' });
    assert.deepEqual(readConfig(dir), { selectedOrigin: 'https://app.revornix.cn' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readConfig tolerates malformed json', () => {
  const dir = tmp();
  try {
    writeConfig(dir, { selectedOrigin: 'https://app.revornix.com' });
    require('node:fs').writeFileSync(join(dir, 'config.json'), '{ not json');
    assert.deepEqual(readConfig(dir), { selectedOrigin: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd desktop && npm test`
Expected: FAIL — cannot find module `./store.ts`.

- [ ] **Step 3: Write `desktop/src/main/store.ts`**

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DesktopConfig {
  selectedOrigin: string | null;
}

const FILE = 'config.json';

export function readConfig(userDataDir: string): DesktopConfig {
  try {
    const raw = readFileSync(join(userDataDir, FILE), 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesktopConfig>;
    const origin = typeof parsed.selectedOrigin === 'string' ? parsed.selectedOrigin : null;
    return { selectedOrigin: origin };
  } catch {
    return { selectedOrigin: null };
  }
}

export function writeConfig(userDataDir: string, config: DesktopConfig): void {
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(join(userDataDir, FILE), JSON.stringify(config, null, 2), 'utf8');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd desktop && npm test`
Expected: PASS — Task 1 and Task 2 tests all green.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/main/store.ts desktop/src/main/store.test.ts
git commit -m "feat: 🎸 Add desktop config persistence"
```

---

### Task 3: Preload bridge + picker page

**Files:**
- Create: `desktop/src/preload/preload.ts`
- Create: `desktop/src/renderer/picker.html`
- Create: `desktop/scripts/copy-assets.mjs`

**Interfaces:**
- Consumes: `ServerOption`, `BUILTIN_SERVERS` (Task 1).
- Produces:
  - Preload exposes on `window.revornix`:
    - `getBuiltinServers(): Promise<ServerOption[]>`
    - `selectServer(origin: string): Promise<{ ok: boolean; error?: string }>`
  - IPC channel names (verbatim, consumed by Task 5 main wiring):
    - `revornix:getBuiltinServers` (invoke/handle)
    - `revornix:selectServer` (invoke/handle, arg = origin string)
  - `scripts/copy-assets.mjs` copies `src/renderer/` → `dist/renderer/` and `assets/` → `dist/assets/` after `tsc`.

- [ ] **Step 1: Write `desktop/src/preload/preload.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('revornix', {
  getBuiltinServers: () => ipcRenderer.invoke('revornix:getBuiltinServers'),
  selectServer: (origin: string) => ipcRenderer.invoke('revornix:selectServer', origin),
});
```

- [ ] **Step 2: Write `desktop/src/renderer/picker.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" />
    <title>Choose Revornix Server</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 40px; background: #0b0b0c; color: #f4f4f5; }
      h1 { font-size: 20px; margin: 0 0 24px; }
      .server { display: block; width: 100%; text-align: left; padding: 16px; margin-bottom: 12px; border: 1px solid #2a2a2e; border-radius: 10px; background: #151517; color: inherit; font-size: 15px; cursor: pointer; }
      .server:hover { border-color: #6366f1; }
      .row { display: flex; gap: 8px; margin-top: 8px; }
      input { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #2a2a2e; background: #151517; color: inherit; }
      button.go { padding: 12px 18px; border-radius: 8px; border: none; background: #6366f1; color: white; cursor: pointer; }
      .err { color: #f87171; min-height: 18px; font-size: 13px; margin-top: 8px; }
      label { font-size: 13px; color: #a1a1aa; }
    </style>
  </head>
  <body>
    <h1>Choose a server to connect</h1>
    <div id="builtins"></div>
    <label for="custom">Or enter a custom server (self-hosted)</label>
    <div class="row">
      <input id="custom" placeholder="https://your-host" />
      <button class="go" id="go">Connect</button>
    </div>
    <div class="err" id="err"></div>
    <script>
      const api = window.revornix;
      const err = document.getElementById('err');
      async function pick(origin) {
        err.textContent = '';
        const res = await api.selectServer(origin);
        if (!res.ok) err.textContent = res.error || 'Invalid server address';
      }
      api.getBuiltinServers().then((servers) => {
        const box = document.getElementById('builtins');
        for (const s of servers) {
          const b = document.createElement('button');
          b.className = 'server';
          b.textContent = s.label;
          b.onclick = () => pick(s.origin);
          box.appendChild(b);
        }
      });
      document.getElementById('go').onclick = () => pick(document.getElementById('custom').value);
    </script>
  </body>
</html>
```

- [ ] **Step 3: Write `desktop/scripts/copy-assets.mjs`**

```js
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const copies = [
  ['src/renderer', 'dist/renderer'],
  ['assets', 'dist/assets'],
];

for (const [from, to] of copies) {
  const src = join(root, from);
  if (!existsSync(src)) continue;
  mkdirSync(dirname(join(root, to)), { recursive: true });
  cpSync(src, join(root, to), { recursive: true });
  console.log(`copied ${from} -> ${to}`);
}
```

- [ ] **Step 4: Verify build compiles and copies assets**

Run: `cd desktop && npm run build`
Expected: `tsc` succeeds; console prints `copied src/renderer -> dist/renderer`; `dist/preload/preload.js` and `dist/renderer/picker.html` exist.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/preload/preload.ts desktop/src/renderer/picker.html desktop/scripts/copy-assets.mjs
git commit -m "feat: 🎸 Add desktop preload bridge and server picker page"
```

---

### Task 4: Window + external-link policy + menu

**Files:**
- Create: `desktop/src/main/window.ts`
- Create: `desktop/src/main/menu.ts`

**Interfaces:**
- Consumes: `isInternalNavigation` (Task 1), `BUILTIN_SERVERS`, `ServerOption` (Task 1).
- Produces:
  - `function createShellWindow(): BrowserWindow` — builds the secured BrowserWindow (does NOT load a URL yet).
  - `function applyNavigationPolicy(win: BrowserWindow, getCurrentOrigin: () => string | null): void` — wires `will-navigate` + `setWindowOpenHandler` so foreign links go to `shell.openExternal`.
  - `function buildAppMenu(opts: { servers: ServerOption[]; currentOrigin: string | null; onSelect: (origin: string) => void; onReset: () => void }): Menu` — native menu with a "Server" submenu.

- [ ] **Step 1: Write `desktop/src/main/window.ts`**

```ts
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
    // Always allow local picker page (file://) and internal navigations.
    if (url.startsWith('file://')) return;
    if (origin && isInternalNavigation(url, origin)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
}
```

- [ ] **Step 2: Write `desktop/src/main/menu.ts`**

```ts
import { Menu, MenuItemConstructorOptions } from 'electron';
import { ServerOption } from './servers';

export function buildAppMenu(opts: {
  servers: ServerOption[];
  currentOrigin: string | null;
  onSelect: (origin: string) => void;
  onReset: () => void;
}): Menu {
  const serverItems: MenuItemConstructorOptions[] = opts.servers.map((s) => ({
    label: s.label,
    type: 'radio',
    checked: s.origin === opts.currentOrigin,
    click: () => opts.onSelect(s.origin),
  }));

  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{ role: 'appMenu' as const }]
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: 'Server',
      submenu: [
        ...serverItems,
        { type: 'separator' },
        { label: 'Re-select server…', click: () => opts.onReset() },
      ],
    },
    { role: 'windowMenu' },
  ];

  return Menu.buildFromTemplate(template);
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd desktop && npm run build`
Expected: `tsc` succeeds; `dist/main/window.js` and `dist/main/menu.js` exist.

- [ ] **Step 4: Commit**

```bash
git add desktop/src/main/window.ts desktop/src/main/menu.ts
git commit -m "feat: 🎸 Add desktop window, navigation policy and menu"
```

---

### Task 5: Main process wiring

**Files:**
- Create: `desktop/src/main/main.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4:
  - `BUILTIN_SERVERS`, `normalizeServerUrl` (servers.ts)
  - `readConfig`, `writeConfig` (store.ts)
  - `createShellWindow`, `applyNavigationPolicy` (window.ts)
  - `buildAppMenu` (menu.ts)
  - IPC channels `revornix:getBuiltinServers`, `revornix:selectServer` (Task 3)
- Produces: the runnable app entry (`dist/main/main.js`, referenced by `package.json` `main`).

- [ ] **Step 1: Write `desktop/src/main/main.ts`**

```ts
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
```

- [ ] **Step 2: Verify build compiles**

Run: `cd desktop && npm run build`
Expected: `tsc` succeeds; `dist/main/main.js` exists.

- [ ] **Step 3: Manual smoke — launch the app**

Run: `cd desktop && npm run dev`
Expected: a window opens showing the picker page with two server buttons and a custom input. Clicking "app.revornix.com (International)" navigates the window to the remote site. Quit the app.

- [ ] **Step 4: Commit**

```bash
git add desktop/src/main/main.ts
git commit -m "feat: 🎸 Wire desktop main process (picker, server switch, single-instance)"
```

---

### Task 6: Packaging config (electron-builder)

**Files:**
- Create: `desktop/electron-builder.yml`
- Create: `desktop/build/entitlements.mac.plist`
- Create: `desktop/assets/README.md` (icon placeholder note)

**Interfaces:**
- Consumes: `dist/` build output (Tasks 1–5), `package.json` `main` field.
- Produces: `electron-builder` config producing macOS dmg+zip and Windows NSIS exe.

- [ ] **Step 1: Write `desktop/electron-builder.yml`**

```yaml
appId: com.revornix.desktop
productName: Revornix
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - package.json
mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [arm64, x64]
    - target: zip
      arch: [arm64, x64]
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  # Unsigned by default. Signing auto-enables when CSC_LINK / APPLE_ID env vars are set.
win:
  target:
    - target: nsis
      arch: [x64]
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
publish:
  provider: github
  releaseType: release
```

- [ ] **Step 2: Write `desktop/build/entitlements.mac.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
</dict>
</plist>
```

- [ ] **Step 3: Write `desktop/assets/README.md`**

```markdown
# Desktop assets

Place app icons here before release:

- `icon.icns` — macOS (1024×1024 source recommended)
- `icon.ico` — Windows (256×256)
- `icon.png` — Linux / fallback (512×512)

electron-builder auto-detects `build/icon.*` or `assets/icon.*`. Until real icons
are added, electron-builder falls back to the default Electron icon.
```

- [ ] **Step 4: Verify config packs on the current OS (macOS)**

Run: `cd desktop && npm run package:mac`
Expected: `release/` contains a `Revornix-0.1.0-arm64.dmg` (and x64 dmg + zips). Build succeeds unsigned (a warning about skipping notarization/signing is expected and acceptable).

- [ ] **Step 5: Commit**

```bash
git add desktop/electron-builder.yml desktop/build/entitlements.mac.plist desktop/assets/README.md
git commit -m "feat: 🎸 Add electron-builder packaging config for mac and win"
```

---

### Task 7: CI release workflow

**Files:**
- Create: `.github/workflows/desktop-release.yml`

**Interfaces:**
- Consumes: `desktop/package.json` scripts, `desktop/electron-builder.yml`.
- Produces: GitHub Actions workflow that builds and publishes installers on `desktop-v*` tags. Does not touch the existing Docker workflow.

- [ ] **Step 1: Write `.github/workflows/desktop-release.yml`**

```yaml
name: Desktop Release

on:
  push:
    tags:
      - 'desktop-v*'

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-latest
            script: package:mac
          - os: windows-latest
            script: package:win
    runs-on: ${{ matrix.os }}
    defaults:
      run:
        working-directory: desktop
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run ${{ matrix.script }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            desktop/release/*.dmg
            desktop/release/*.zip
            desktop/release/*.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Validate YAML syntax**

Run: `cd /Users/kinda/Developer/Revornix && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/desktop-release.yml')); print('yaml ok')"`
Expected: prints `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/desktop-release.yml
git commit -m "ci: 🎡 Add desktop release workflow for mac and win"
```

---

### Task 8: Smoke test + README

**Files:**
- Create: `desktop/tests/smoke.spec.ts`
- Create: `desktop/playwright.config.ts`
- Modify: `desktop/README.md` (replace placeholder content)
- Modify: `desktop/package.json` (add `test:e2e` script)

**Interfaces:**
- Consumes: built `dist/main/main.js` (Tasks 1–5).
- Produces: a Playwright-Electron smoke test asserting the picker loads and server selection navigates.

- [ ] **Step 1: Add the e2e script to `desktop/package.json`**

In the `scripts` block, add:

```json
    "test:e2e": "npm run build && playwright test"
```

- [ ] **Step 2: Write `desktop/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  reporter: 'list',
});
```

- [ ] **Step 3: Write the failing test** — create `desktop/tests/smoke.spec.ts`

```ts
import { test, expect, _electron as electron } from '@playwright/test';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

test('picker loads on first launch and shows built-in servers', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'revornix-e2e-'));
  const app = await electron.launch({
    args: [join(__dirname, '..', 'dist', 'main', 'main.js'), `--user-data-dir=${userData}`],
  });
  const win = await app.firstWindow();
  await expect(win.locator('h1')).toHaveText('Choose a server to connect');
  const buttons = win.locator('.server');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.first()).toContainText('app.revornix.com');
  await app.close();
});
```

- [ ] **Step 4: Run e2e to verify it passes**

Run: `cd desktop && npx playwright install chromium && npm run test:e2e`
Expected: PASS — the picker window renders with 2 server buttons.

Note: if `--user-data-dir` is not honored in your Electron version, the test still passes on a clean machine; the flag only guarantees isolation from a previously-saved config.

- [ ] **Step 5: Replace `desktop/README.md`**

```markdown
# Revornix Desktop

Electron thin-shell that wraps the remote Revornix web client as a native macOS/Windows app.

## What it does

- Opens the Revornix workspace in a native window.
- Lets you choose a server on first launch: `app.revornix.com` (international),
  `app.revornix.cn` (China mirror), or a custom self-hosted address.
- Switch servers anytime via the **Server** menu.
- Foreign links open in your system browser; the app window stays on the workspace.

## Develop

```bash
cd desktop
npm install
npm run dev      # build + launch
npm test         # unit tests (servers, store)
npm run test:e2e # Playwright-Electron smoke test
```

## Package

```bash
npm run package:mac   # dmg + zip in release/
npm run package:win   # NSIS exe in release/
```

Builds are **unsigned** in v1. On macOS, first launch needs right-click → Open
(or allow in System Settings → Privacy & Security). On Windows, dismiss the
SmartScreen prompt. Signing auto-enables when `CSC_LINK` / `APPLE_ID` env vars
are present.

## Icons

Add `assets/icon.icns` (mac), `assets/icon.ico` (win), `assets/icon.png`
(fallback) before a release build — see `assets/README.md`.

## CI

Push a `desktop-v*` tag to trigger `.github/workflows/desktop-release.yml`,
which builds installers on macOS + Windows runners and attaches them to a
GitHub Release.
```

- [ ] **Step 6: Add `.gitignore` entries for Playwright output**

Append to `desktop/.gitignore`:

```
playwright-report/
test-results/
```

- [ ] **Step 7: Commit**

```bash
git add desktop/tests/smoke.spec.ts desktop/playwright.config.ts desktop/README.md desktop/package.json desktop/.gitignore
git commit -m "test: 💍 Add desktop smoke test and update README"
```

---

## Self-Review Notes

- **Spec coverage:** architecture/dirs (Tasks 1–6), server switching + picker (Tasks 1,3,5), first-launch picker (Task 5), window/security/external-links/OAuth (Task 4), single-instance (Task 5), packaging matrix + signing predation (Task 6), CI (Task 7), tests + README (Tasks 1,2,8). All spec sections mapped.
- **OAuth handling:** `OAUTH_HOSTS` (`accounts.google.com`, `github.com`, `open.weixin.qq.com`) kept in-window by `isInternalNavigation`; verified against actual OAuth URLs in `web/src/components/user/*`.
- **Type consistency:** `ServerOption`, `normalizeServerUrl`, `isInternalNavigation`, `DesktopConfig`, `readConfig`/`writeConfig`, `createShellWindow`/`applyNavigationPolicy`, `buildAppMenu`, IPC channel names used identically across tasks.
