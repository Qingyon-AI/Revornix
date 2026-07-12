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
