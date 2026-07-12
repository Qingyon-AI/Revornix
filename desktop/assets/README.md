# Desktop assets

Place app icons here before release:

- `icon.icns` — macOS (1024×1024 source recommended)
- `icon.ico` — Windows (256×256)
- `icon.png` — Linux / fallback (512×512)

electron-builder auto-detects `build/icon.*` or `assets/icon.*`. Until real icons
are added, electron-builder falls back to the default Electron icon.
