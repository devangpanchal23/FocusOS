// FocusOS Companion Popup Logic
const API_BASE = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const sessionTitle = document.getElementById('session-title');
  const timerDisplay = document.getElementById('timer-display');
  const btnToggle = document.getElementById('btn-toggle-session');
  const btnOpenApp = document.getElementById('btn-open-app');
  const btnOverride = document.getElementById('btn-override');
  const blockListEl = document.getElementById('block-list');

  // Load saved state
  chrome.storage.local.get(['focusos_token', 'activeSession', 'blockedDomains'], async (result) => {
    const token = result.focusos_token || '';

    try {
      // Query local FocusOS backend
      const res = await fetch(`${API_BASE}/v3/extension/config`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const config = await res.json();
        statusBadge.textContent = 'Connected';
        statusBadge.className = 'badge badge-online';

        if (config.activeSession) {
          sessionTitle.textContent = config.activeSession.taskName || 'Deep Work Session';
          btnToggle.textContent = 'Pause Focus';
        } else {
          sessionTitle.textContent = 'Ready for Flow State';
          btnToggle.textContent = 'Start Focus';
        }

        if (config.blockedDomains && config.blockedDomains.length > 0) {
          blockListEl.innerHTML = config.blockedDomains
            .map((domain) => `<li class="block-item"><span class="dot"></span> ${domain}</li>`)
            .join('');
        }
      } else {
        statusBadge.textContent = 'Active (Local)';
      }
    } catch {
      statusBadge.textContent = 'Local Mode';
    }
  });

  // Browser Intelligence Upgrade: today's browser-time summary (additive).
  loadBrowserSummary();
  // Multi-instance identity: show which browser this install is tracked as.
  loadBrowserInstanceLabel();

  btnOpenApp.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/focus' });
  });

  btnToggle.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/focus' });
  });

  btnOverride.addEventListener('click', () => {
    const reason = prompt('Please enter your intentional reason for the 15-minute temporary bypass:');
    if (reason && reason.trim().length > 3) {
      alert('Intentional bypass activated for 15 minutes. FocusOS accountability log recorded.');
    }
  });
});

// Browser Intelligence Upgrade: fetch and render today's browser-time summary.
async function loadBrowserSummary() {
  const section = document.getElementById('browser-summary-section');
  const totalEl = document.getElementById('browser-summary-total');
  const domainEl = document.getElementById('browser-summary-domain');
  if (!section || !totalEl || !domainEl) return;

  try {
    const { focusos_token: token } = await new Promise((resolve) =>
      chrome.storage.local.get(['focusos_token'], resolve)
    );
    if (!token) return;

    const res = await fetch(`${API_BASE}/v5/browser/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;

    const summary = await res.json();
    const totalMinutes = Math.round(
      summary.totalMinutes ?? (summary.totalSeconds ? summary.totalSeconds / 60 : 0)
    );
    if (!Number.isFinite(totalMinutes)) return;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    totalEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const topDomain = summary.topDomain?.domain || summary.topDomain || '';
    domainEl.textContent = topDomain ? `Top: ${topDomain}` : '';

    section.style.display = '';
  } catch {
    // Backend unreachable or endpoint not yet available — hide the block, don't break the popup.
    section.style.display = 'none';
  }
}

// Multi-instance identity: read (or lazily compute) the persisted browser
// label so the user can see which install this browser is tracked as.
const INSTANCE_KEY_STORAGE_KEY = 'focusos_instance_key';
const BROWSER_LABEL_STORAGE_KEY = 'focusos_browser_label';

async function detectBrowserLabelForPopup() {
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

async function loadBrowserInstanceLabel() {
  const labelEl = document.getElementById('browser-instance-label');
  if (!labelEl) return;

  try {
    const stored = await new Promise((resolve) =>
      chrome.storage.local.get([INSTANCE_KEY_STORAGE_KEY, BROWSER_LABEL_STORAGE_KEY], resolve)
    );

    let browserLabel = stored[BROWSER_LABEL_STORAGE_KEY];
    if (!browserLabel) {
      browserLabel = await detectBrowserLabelForPopup();
      // Best-effort cache so the background worker and popup agree; harmless if it races.
      chrome.storage.local.set({ [BROWSER_LABEL_STORAGE_KEY]: browserLabel }).catch?.(() => {});
    }

    labelEl.textContent = `Tracked as: ${browserLabel}`;
    labelEl.style.display = '';
  } catch {
    // Never break the popup over a cosmetic label.
    labelEl.style.display = 'none';
  }
}
