// FocusOS Service Worker (Manifest V3)
const DEFAULT_BLOCKED = ['instagram.com', 'tiktok.com', 'twitter.com', 'x.com', 'facebook.com', 'reddit.com'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    blockedDomains: DEFAULT_BLOCKED,
    activeSession: null,
    isShieldEnabled: true
  });

  chrome.alarms.create('focusos_sync', { periodInMinutes: 1 });
  // Browser-intelligence: batched flush of tracked tab sessions (see below).
  chrome.alarms.create(FLUSH_ALARM_NAME, { periodInMinutes: 0.5 });
  // Start tracking the currently active tab right away.
  initCurrentTabSession();
  // Multi-instance identity: generate once, persist forever.
  ensureInstanceIdentity();
});

chrome.runtime.onStartup.addListener(() => {
  initCurrentTabSession();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'focusos_sync') {
    chrome.storage.local.get(['focusos_token'], async (result) => {
      if (!result.focusos_token) return;
      try {
        const res = await fetch('http://localhost:5000/api/v3/extension/config', {
          headers: { Authorization: `Bearer ${result.focusos_token}` }
        });
        if (res.ok) {
          const config = await res.json();
          chrome.storage.local.set({
            blockedDomains: config.blockedDomains || DEFAULT_BLOCKED,
            activeSession: config.activeSession
          });
        }
      } catch {
        // Local server unreachable, continue in offline mode
      }
    });
  } else if (alarm.name === FLUSH_ALARM_NAME) {
    flushBrowserSessionQueue();
  }
});

// Tab change listener to notify content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    chrome.storage.local.get(['blockedDomains', 'isShieldEnabled'], (result) => {
      if (!result.isShieldEnabled) return;
      const domains = result.blockedDomains || DEFAULT_BLOCKED;
      const isBlocked = domains.some((d) => tab.url.toLowerCase().includes(d.toLowerCase()));

      if (isBlocked) {
        chrome.tabs.sendMessage(tabId, { action: 'BLOCK_PAGE', url: tab.url }).catch(() => {});
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Browser Intelligence Upgrade: per-tab session tracking + batched sync.
// Additive only — does not alter the polling/blocking logic above.
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:5000/api';
const CURRENT_SESSION_KEY = 'focusos_current_tab_session';
const QUEUE_KEY = 'focusos_event_queue';
const MAX_QUEUE_LENGTH = 500;
const FLUSH_ALARM_NAME = 'focusos_flush';

let isFlushingQueue = false;

// ---------------------------------------------------------------------------
// Multi-instance identity: a stable per-install UUID + detected browser name,
// generated once and persisted, sent with every session flush so the backend
// can distinguish/label separate browser installs for the same user.
// ---------------------------------------------------------------------------

const INSTANCE_KEY_STORAGE_KEY = 'focusos_instance_key';
const BROWSER_LABEL_STORAGE_KEY = 'focusos_browser_label';

async function detectBrowserLabel() {
  try {
    if (typeof navigator !== 'undefined' && navigator.brave && typeof navigator.brave.isBrave === 'function') {
      const isBrave = await navigator.brave.isBrave().catch(() => false);
      if (isBrave) return 'Brave';
    }
  } catch {
    // Ignore — fall through to other detection methods.
  }

  try {
    const brands = navigator.userAgentData && navigator.userAgentData.brands;
    if (Array.isArray(brands) && brands.length) {
      const names = brands.map((b) => b.brand || '');
      if (names.some((n) => n.includes('Brave'))) return 'Brave';
      if (names.some((n) => n.includes('Microsoft Edge'))) return 'Microsoft Edge';
      if (names.some((n) => n.includes('Opera'))) return 'Opera';
      if (names.some((n) => n.includes('Google Chrome'))) return 'Google Chrome';
      if (names.some((n) => n.includes('Chromium'))) return 'Chromium';
    }
  } catch {
    // Ignore — fall through to UA sniffing.
  }

  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('edg/')) return 'Microsoft Edge';
    if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
    if (ua.includes('chrome')) return 'Google Chrome';
  } catch {
    // Ignore — final fallback below.
  }

  return 'Chrome';
}

async function ensureInstanceIdentity() {
  try {
    const existing = await chrome.storage.local.get([INSTANCE_KEY_STORAGE_KEY, BROWSER_LABEL_STORAGE_KEY]);
    const updates = {};

    let instanceKey = existing[INSTANCE_KEY_STORAGE_KEY];
    if (!instanceKey) {
      instanceKey = crypto.randomUUID();
      updates[INSTANCE_KEY_STORAGE_KEY] = instanceKey;
    }

    let browserLabel = existing[BROWSER_LABEL_STORAGE_KEY];
    if (!browserLabel) {
      browserLabel = await detectBrowserLabel();
      updates[BROWSER_LABEL_STORAGE_KEY] = browserLabel;
    }

    if (Object.keys(updates).length) {
      await chrome.storage.local.set(updates);
    }

    return { instanceKey, browserLabel };
  } catch {
    // Never let identity bookkeeping crash the service worker.
    return { instanceKey: null, browserLabel: null };
  }
}

function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) return null; // skip chrome://, about:, etc.
    return parsed.hostname;
  } catch {
    return null;
  }
}

async function closeCurrentTabSession() {
  try {
    const { [CURRENT_SESSION_KEY]: current } = await chrome.storage.local.get([CURRENT_SESSION_KEY]);
    if (!current || !current.domain || !current.startedAt) {
      await chrome.storage.local.remove(CURRENT_SESSION_KEY);
      return;
    }
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(current.startedAt).getTime()) / 1000)
    );
    await chrome.storage.local.remove(CURRENT_SESSION_KEY);
    if (durationSeconds <= 0) return;

    const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get([QUEUE_KEY]);
    queue.push({
      domain: current.domain,
      startedAt: current.startedAt,
      endedAt,
      durationSeconds,
      title: current.title || ''
    });
    const trimmed = queue.length > MAX_QUEUE_LENGTH ? queue.slice(queue.length - MAX_QUEUE_LENGTH) : queue;
    await chrome.storage.local.set({ [QUEUE_KEY]: trimmed });
  } catch {
    // Never let session bookkeeping crash the service worker.
  }
}

async function startTabSession(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = getDomainFromUrl(tab && tab.url);
    if (!domain) return;
    await chrome.storage.local.set({
      [CURRENT_SESSION_KEY]: {
        domain,
        startedAt: new Date().toISOString(),
        title: (tab && tab.title) || ''
      }
    });
  } catch {
    // Tab may have closed already, or URL is not accessible (e.g. chrome:// pages).
  }
}

async function initCurrentTabSession() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab) {
      await closeCurrentTabSession();
      await startTabSession(activeTab.id);
    }
  } catch {
    // Ignore — will pick up tracking on the next tab/window event.
  }
}

// New tab becomes active in a window.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await closeCurrentTabSession();
  await startTabSession(tabId);
});

// Active tab navigates to a new URL (only react to url-changed events).
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  if (!tab || !tab.active) return;
  await closeCurrentTabSession();
  await startTabSession(tabId);
});

// Browser window gains/loses OS focus.
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus entirely — stop tracking time until it regains focus.
    await closeCurrentTabSession();
    return;
  }
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab) {
      await closeCurrentTabSession();
      await startTabSession(activeTab.id);
    }
  } catch {
    // Ignore transient errors during window focus changes.
  }
});

async function flushBrowserSessionQueue() {
  if (isFlushingQueue) return;
  isFlushingQueue = true;
  try {
    const { focusos_token: token, [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get([
      'focusos_token',
      QUEUE_KEY
    ]);
    if (!token || !queue.length) return;

    const sentCount = queue.length;
    const toSend = queue.slice(0, sentCount);
    const { instanceKey, browserLabel } = await ensureInstanceIdentity();

    try {
      const res = await fetch(`${API_BASE}/v5/browser/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceId: null,
          sessions: toSend,
          instanceKey,
          browserLabel
        })
      });

      if (res.ok) {
        // Only clear the entries we actually sent; keep anything appended meanwhile.
        const { [QUEUE_KEY]: latestQueue = [] } = await chrome.storage.local.get([QUEUE_KEY]);
        await chrome.storage.local.set({ [QUEUE_KEY]: latestQueue.slice(sentCount) });
      }
      // Non-2xx: leave the queue untouched, retry on next alarm.
    } catch {
      // Network error: leave the queue untouched, retry on next alarm.
    }
  } finally {
    isFlushingQueue = false;
  }
}
