let state = { blockingEnabled: true, scope: 'everywhere' };

const VIDEO_SELECTOR = 'video, [data-testid="videoComponent"], [data-testid="videoPlayer"]';

// Inject CSS immediately (synchronously) before any content can render.
// Targets the video container (hides thumbnails too), not just the <video> element.
// .zen-placeholder overrides visibility so our label stays visible.
let styleEl = document.createElement('style');
styleEl.textContent = `
  video,
  [data-testid="videoComponent"],
  [data-testid="videoPlayer"] { visibility: hidden !important; }
  .zen-placeholder { visibility: visible !important; }
`;
document.documentElement.appendChild(styleEl);

// Load real state and correct if needed
chrome.storage.sync.get(['blockingEnabled', 'scope'], (data) => {
  state = { ...state, ...data };
  if (!shouldBlock()) {
    styleEl.remove();
    styleEl = null;
  } else {
    document.querySelectorAll(VIDEO_SELECTOR).forEach(hideEl);
  }
});

// Listen for state change messages from background/popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'stateChanged') {
    chrome.storage.sync.get(['blockingEnabled', 'scope'], (data) => {
      state = { ...state, ...data };
      applyState();
    });
  }
});

// Patch pushState before X's React app loads (run_at: document_start ensures this)
const _pushState = history.pushState.bind(history);
history.pushState = function (...args) {
  _pushState(...args);
  applyState();
};
window.addEventListener('popstate', applyState);

// MutationObserver — detect containers as they're injected (before their <video> children)
const observer = new MutationObserver((mutations) => {
  if (!shouldBlock()) return;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches(VIDEO_SELECTOR)) hideEl(node);
      node.querySelectorAll(VIDEO_SELECTOR).forEach(hideEl);
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

function shouldBlock() {
  if (!state.blockingEnabled) return false;
  if (state.scope === 'home') return window.location.pathname === '/home';
  return true;
}

function applyState() {
  if (shouldBlock()) {
    enableBlocking();
  } else {
    disableBlocking();
  }
}

function hideEl(el) {
  if (el.dataset.zenHidden) return;
  el.dataset.zenHidden = 'true';

  // For container elements, X's CSS already gives them position + dimensions.
  // For bare <video> elements (fallback), use the parent as the positioning context.
  const host = el.tagName === 'VIDEO' ? el.parentNode : el;
  if (!host) return;
  if (getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }

  const placeholder = document.createElement('span');
  placeholder.className = 'zen-placeholder';
  placeholder.textContent = '[video]';
  placeholder.style.cssText = [
    'position:absolute',
    'top:50%',
    'left:50%',
    'transform:translate(-50%,-50%)',
    'color:#536471',
    'font-size:11px',
    'font-family:system-ui,sans-serif',
    'pointer-events:none',
    'user-select:none',
    'z-index:1'
  ].join(';');
  host.appendChild(placeholder);
}

function enableBlocking() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.textContent = `
      video,
      [data-testid="videoComponent"],
      [data-testid="videoPlayer"] { visibility: hidden !important; }
      .zen-placeholder { visibility: visible !important; }
    `;
    document.documentElement.appendChild(styleEl);
  }
  document.querySelectorAll(VIDEO_SELECTOR).forEach(hideEl);
}

function disableBlocking() {
  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
  document.querySelectorAll('[data-zen-hidden]').forEach((el) => {
    delete el.dataset.zenHidden;
  });
  document.querySelectorAll('.zen-placeholder').forEach((el) => el.remove());
}
