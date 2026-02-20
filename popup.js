const toggleBtn = document.getElementById('toggle');
const toggleLabel = document.getElementById('toggle-label');
const scopeBtns = document.querySelectorAll('.scope-btn');

let currentState = { blockingEnabled: true, scope: 'everywhere' };

// Load and render initial state
chrome.storage.sync.get(['blockingEnabled', 'scope'], (data) => {
  currentState = { ...currentState, ...data };
  render(currentState);
});

// Toggle on/off
toggleBtn.addEventListener('click', () => {
  const newVal = !currentState.blockingEnabled;
  currentState.blockingEnabled = newVal;
  chrome.storage.sync.set({ blockingEnabled: newVal });
  // background.js owns setIcon via storage.onChanged
  sendToActiveTab({ type: 'stateChanged' });
  render(currentState);
});

// Scope selector
scopeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const newScope = btn.dataset.scope;
    currentState.scope = newScope;
    chrome.storage.sync.set({ scope: newScope });
    sendToActiveTab({ type: 'stateChanged' });
    render(currentState);
  });
});

function render({ blockingEnabled, scope }) {
  toggleBtn.classList.toggle('on', blockingEnabled);
  toggleLabel.textContent = blockingEnabled ? 'Blocking videos' : 'Videos visible';
  scopeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scope === scope);
  });
}

async function sendToActiveTab(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch (_) {
    // Content script not present on this tab — ignore
  }
}
