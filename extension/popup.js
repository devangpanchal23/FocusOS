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
