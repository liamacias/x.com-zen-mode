# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome extension (Manifest V3) that hides `<video>` elements on x.com/twitter.com and replaces them with a non-interactive `[video]` placeholder. Plain JavaScript loaded directly by Chrome — no bundler or transpiler.

## Dev Commands

```bash
npm install                # install jimp + chrome-webstore-upload-cli
npm run icons              # generate icon-{active,inactive}-{16,32,48,128}.png
npm run package            # zip extension files → extension.zip
npm run publish            # package + upload to Chrome Web Store (requires .env)
```

## Loading the Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this directory
4. After any file change, click the reload icon on the extension card

Icons must be generated (`npm run icons`) before loading for the first time.

## Architecture

**Extension files** (loaded by Chrome directly):

- **`manifest.json`** — Manifest V3. Permissions: `storage`, `tabs`. Host permissions: x.com, twitter.com. Registers `Alt+V` / `Option+V` command, content script at `run_at: document_start`, and popup.
- **`background.js`** — Service worker. Owns three things: (1) `onInstalled` defaults, (2) `toggle-blocking` keyboard shortcut handler, (3) toolbar icon updates via `chrome.storage.onChanged`. **Single source of truth for icon state** — popup.js never calls `setIcon`.
- **`content.js`** — All DOM interaction. Targets `[data-testid="videoComponent"]` containers (not just `<video>`) via CSS and MutationObserver — this hides the full container including X's thumbnail images, preventing any flash. `.zen-placeholder { visibility: visible !important }` punches through the hidden parent. Patches `history.pushState` and listens to `popstate` for SPA navigation.
- **`popup.html` + `popup.js`** — Toggle + scope selector. Writes to `chrome.storage.sync`, sends `{ type: 'stateChanged' }` to active tab, renders UI. Does not call `setIcon`.
- **`icon-active-{16,32,48,128}.png`** — X blue (`#1d9bf0`) circle, shown when blocking is ON.
- **`icon-inactive-{16,32,48,128}.png`** — Gray (`#8b98a5`) circle, shown when blocking is OFF.

**Dev tooling:**

- **`scripts/generate-icons.js`** — Uses `jimp` to generate the 8 PNG icon files.
- **`package.json`** — Dev deps only: `jimp`, `chrome-webstore-upload-cli`.
- **`.env`** — Chrome Web Store credentials (not committed). Copy from `.env.example`.

## State

Two keys in `chrome.storage.sync`:

| Key | Type | Default |
|-----|------|---------|
| `blockingEnabled` | boolean | `true` |
| `scope` | `"everywhere"` \| `"home"` | `"everywhere"` |

State change flow: popup or keyboard shortcut → write to `chrome.storage.sync` → message to content script → `applyState()` in content.js → DOM update. Icon update: `background.js` reacts to `storage.onChanged`.

## Key Constraints

- `run_at: document_start` is required so `history.pushState` is patched before X's React app loads and begins routing.
- `visibility: hidden` (not `display: none`) preserves tweet layout when blocking is ON.
- CSS targets `[data-testid="videoComponent"]` and `[data-testid="videoPlayer"]` containers in addition to `video` — X renders thumbnail `<img>` elements inside these containers that would flash before the `<video>` element loads. Hiding the container eliminates this.
- `.zen-placeholder` must carry `visibility: visible !important` to be visible inside a `visibility: hidden` parent.
- `MutationObserver` only processes `addedNodes` (not full re-scans) and uses a `data-zen-hidden` attribute to avoid reprocessing already-hidden elements.
- `onNavigate` calls the full `applyState()` — not just re-observe — so scope changes take effect immediately on SPA navigation (e.g. leaving `/home` when scope is "Home only").
- Icon state is owned exclusively by `background.js` via `storage.onChanged` to ensure consistency across all trigger paths (popup, keyboard shortcut, future sources).
