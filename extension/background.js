// FocusOS Service Worker (Manifest V3)
const DEFAULT_BLOCKED = ['instagram.com', 'tiktok.com', 'twitter.com', 'x.com', 'facebook.com', 'reddit.com'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    blockedDomains: DEFAULT_BLOCKED,
    activeSession: null,
    isShieldEnabled: true
  });

  chrome.alarms.create('focusos_sync', { periodInMinutes: 1 });
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
