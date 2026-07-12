# Desktop assets

App icons, generated from the Revornix brand mark (`web/src/static/logo.png`):

- `icon.icns` — macOS
- `icon.ico` — Windows
- `icon.png` — 1024×1024 master / Linux / dev dock

The icon is the black brand mark on a white rounded square so it stays legible
on both light and dark docks. electron-builder embeds `icon.icns` / `icon.ico`
via `mac.icon` / `win.icon` in `electron-builder.yml`.

To regenerate after a brand-mark change, re-run the compose step (Pillow +
`iconutil`): white rounded-rect background, mark centered at ~64% with padding,
then emit the iconset → icns, a multi-size ico, and the 1024 png.
