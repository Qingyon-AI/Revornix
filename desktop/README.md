# Revornix Desktop

> Status: **planning / placeholder**. No buildable source ships here yet.

This directory holds the future desktop application for Revornix. The intent is to wrap the existing `web/` client so the product can run as a native app on macOS, Windows, and Linux, and to open the door for desktop-only features that a browser can't reach (global shortcuts, system tray, file watchers, system notifications, offline cache, deep links, auto-update).

There was an earlier Electron-based prototype here — its build artefact still lives under `release/mac-arm64/`. The source was not preserved, so this directory is effectively a clean slate.

## Why a desktop app

The web client already covers every feature. A desktop wrapper is justified by what the browser can't do:

- **Quick capture**: global shortcut → instant ingest a clipboard URL or selection.
- **Drop / drag-in**: native file drop straight into the knowledge base.
- **System notifications**: AI task completion, scheduled summary digests.
- **Tray / menu-bar presence**: always-on companion without a browser tab.
- **Offline reads**: cache published documents and notes for plane/subway reading.
- **Local indexing**: optional on-device full-text index for fast personal search.
- **Deep links**: `revornix://` to open a document from any other app.
- **Auto-update**: one-click upgrades for non-technical users.

## Approach (under decision)

Two realistic candidates, both target the same outcome:

- **Tauri 2.x** — Rust core + system WebView. Small (~10 MB), low memory, first-class native plugins (updater, tray, global shortcut, deep link). Suits long-running companion apps.
- **Electron** — Chromium + Node. Larger footprint, but the team is already JS/TS-heavy. The prior prototype here was Electron.

The shipping shape is also undecided:

- Point the window at a deployed `https://revornix.com` workspace (fastest, depends on internet).
- Bundle the Next.js standalone server (`web/.next/standalone`) as a sidecar process and load `http://127.0.0.1:<port>` (matches the offline-first ambition).

Discussion lives in [`docs/src/content/en/docs/developer/`](../docs/src/content/en/docs/developer/) once a decision is made.

## When this directory wakes up

Expect a real layout roughly along these lines, depending on the chosen stack:

```text
desktop/
├── src/                 # Shell source (Tauri: Rust + minimal JS; Electron: TS main/preload)
├── assets/              # App icon, splash, tray glyphs
├── package.json         # Scripts: dev, build, package per OS
└── ...
```

Until then, the directory exists so the structure is visible in the repo and the intent is clear.

## How to contribute ideas

If you want to influence the direction (stack choice, feature priorities, native capabilities list), open a discussion on GitHub or drop a note in the community channels linked from the [root README](../README.md).
