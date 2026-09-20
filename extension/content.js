// FocusOS Content Script: Intentionality Shield
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === 'BLOCK_PAGE') {
    renderFocusShield();
  }
});

// Also check on immediate load
chrome.storage.local.get(['blockedDomains', 'isShieldEnabled'], (result) => {
  if (!result.isShieldEnabled) return;
  const currentUrl = window.location.href.toLowerCase();
  const domains = result.blockedDomains || ['instagram.com', 'tiktok.com', 'twitter.com', 'x.com'];
  if (domains.some((d) => currentUrl.includes(d.toLowerCase()))) {
    renderFocusShield();
  }
});

function renderFocusShield() {
  if (document.getElementById('focusos-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'focusos-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle at center, #1e1b4b 0%, #030712 100%);
    color: #f8fafc;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 24px;
    box-sizing: border-box;
    text-align: center;
  `;

  overlay.innerHTML = `
    <div style="max-width: 480px; background: rgba(15, 23, 42, 0.85); padding: 40px 32px; border-radius: 20px; border: 1px solid rgba(99, 102, 241, 0.3); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
      <div style="font-size: 42px; margin-bottom: 16px;">🛡️</div>
      <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.02em; color: #f1f5f9;">FocusOS Shield Active</h1>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
        This site is flagged as an active distractor. Pause for a breath: is visiting this site intentional right now?
      </p>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="focusos-btn-return" style="background: #6366f1; color: #ffffff; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          Return to Flow State
        </button>
        <button id="focusos-btn-bypass" style="background: transparent; color: #64748b; border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 500; cursor: pointer;">
          I have an intentional 15-minute reason
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('focusos-btn-return')?.addEventListener('click', () => {
    window.location.href = 'http://localhost:5173/focus';
  });

  document.getElementById('focusos-btn-bypass')?.addEventListener('click', () => {
    const reason = prompt('Please enter your intentional purpose for this 15-minute visit:');
    if (reason && reason.trim().length > 3) {
      overlay.remove();
    }
  });
}
