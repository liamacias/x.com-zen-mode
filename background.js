// Write defaults on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ blockingEnabled: true, scope: 'everywhere' });
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-blocking') return;

  const { blockingEnabled } = await chrome.storage.sync.get('blockingEnabled');
  await chrome.storage.sync.set({ blockingEnabled: !blockingEnabled });
  // Icon update is handled by storage.onChanged below

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'stateChanged' });
  } catch (_) {
    // Content script not present on this tab — ignore
  }
});

// Single source of truth for toolbar icon — reacts to all storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockingEnabled === undefined) return;
  const on = changes.blockingEnabled.newValue;
  chrome.action.setIcon({
    path: {
      '16': on ? 'icon-active-16.png' : 'icon-inactive-16.png',
      '32': on ? 'icon-active-32.png' : 'icon-inactive-32.png'
    }
  });
});
