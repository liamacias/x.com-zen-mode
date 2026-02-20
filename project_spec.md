# x.com Zen Mode — Project Spec

## Overview

A Chrome extension that hides video elements on X (Twitter) and replaces them with a quiet placeholder. Designed for intentional use of X without short-form video distraction.

---

## Product Requirements

### Core Toggle Behavior

- **Blocking ON**
  - All `<video>` elements on x.com are hidden
  - Layout space is preserved — tweet structure remains intact
  - A `[video]` label appears in the blank space (small, muted gray text)
  - Placeholder is not clickable — no per-video reveal
  - MutationObserver catches videos injected by X's React renderer and hides them immediately

- **Blocking OFF**
  - Videos restore to default X behavior
  - No autoplay triggered on restore — videos return to whatever state X left them in

### Scope Setting

| Option | Behavior |
|--------|----------|
| Everywhere | Blocking applies on all x.com pages |
| Home only | Blocking applies only when `window.location.pathname === '/home'` |

- Default on install: **Everywhere**
- Since X is a SPA, the content script intercepts `pushState` and `popstate` to re-evaluate scope on client-side navigation without a page reload

### Keyboard Shortcut

- Default: `Alt+V`
- Defined in `manifest.json` via the Chrome commands API
- Remappable by the user at `chrome://extensions/shortcuts`
- Toggles blocking state directly — same effect as the popup toggle
- Works on any x.com tab with the content script loaded

### Popup UI

Two elements only:

1. **Toggle** — on/off, labeled "Blocking videos" (on) / "Videos visible" (off)
2. **Scope selector** — "Everywhere" / "Home only" (segmented control or radio)

State updates immediately on interaction. No counters or extra UI.

### Toolbar Icon

- **Blocking ON**: full color icon (`icon-active.png`)
- **Blocking OFF**: grayed out / desaturated icon (`icon-inactive.png`)
- Updates on every state change — popup toggle, keyboard shortcut, or any other trigger

### State & Storage

- Stored in `chrome.storage.sync` — persists across sessions, syncs across devices
- Two keys:
  - `blockingEnabled` (boolean)
  - `scope` ("everywhere" | "home")
- Defaults written on install: `{ blockingEnabled: true, scope: "everywhere" }`

---

## Technical Requirements

### Manifest (manifest.json)

- Manifest V3
- Permissions: `storage`
- Host permissions: `*://*.x.com/*`, `*://*.twitter.com/*`
- Commands API entry for `Alt+V` shortcut
- Content script registered for x.com and twitter.com
- Popup registered as browser action

### Content Script (content.js)

- Injects CSS to hide video elements when blocking is active
- Uses `MutationObserver` to catch dynamically injected `<video>` elements (X's React renderer continuously injects DOM nodes)
- Hooks into `history.pushState` and listens for `popstate` to detect SPA navigation and re-evaluate scope without a page reload
- Listens for messages from the popup and background to update state
- Renders `[video]` placeholder text in hidden video space (non-interactive, muted gray)

### Popup (popup.html + popup.js)

- Reads current state from `chrome.storage.sync` on open
- Writes state changes to `chrome.storage.sync` on toggle/scope change
- Sends message to active x.com content script tab to apply changes immediately (no reload required)
- Updates toolbar icon via `chrome.action.setIcon`

### Icons

- `icon-active.png` — full color, used when blocking is ON
- `icon-inactive.png` — grayscale/desaturated, used when blocking is OFF
- Multiple sizes as needed by Chrome (16, 32, 48, 128px)

### Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Persist toggle state and scope preference |
| `host_permissions: x.com, twitter.com` | Inject content script, enable keyboard shortcut on those pages |

No network requests. No data collection.

---

## File Structure

```
x.com-zen-mode/
├── manifest.json       # Extension config, permissions, keyboard shortcut
├── content.js          # CSS injection, MutationObserver, SPA nav hook, message listener
├── popup.html          # Toggle + scope selector UI
├── popup.js            # Storage reads/writes, messaging, icon updates
├── icon-active.png     # Toolbar icon — blocking ON (color)
└── icon-inactive.png   # Toolbar icon — blocking OFF (grayscale)
```

---

## Out of Scope (v1)

- Per-video reveal on click
- Whitelist/blacklist specific accounts
- Blocking other media types (GIFs, images)
- Firefox / Safari support
- Analytics or telemetry
