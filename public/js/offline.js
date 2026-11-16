/**
 * ASIL Logistics - Offline Fallback Script (offline.js)
 * CSP-compliant (no inline scripts) connection retry and reconnection monitoring.
 */

document.addEventListener('DOMContentLoaded', () => {
  const retryBtn = document.getElementById('retryBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  function reconnect() {
    if (statusDot) {
      statusDot.style.background = '#10b981';
      statusDot.style.boxShadow = '0 0 8px #10b981';
    }
    if (statusText) {
      statusText.textContent = 'Connection restored! Loading portal...';
    }
    setTimeout(() => {
      if (window.location.pathname.includes('offline')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }, 400);
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.textContent = 'Connecting...';
      retryBtn.style.opacity = '0.7';
      retryBtn.disabled = true;

      try {
        const res = await fetch('/favicon.svg?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok || res.status < 500) {
          reconnect();
          return;
        }
      } catch (e) {
        // network still down
      }

      // If check failed, restore button after 1s
      setTimeout(() => {
        retryBtn.textContent = 'Try Again';
        retryBtn.style.opacity = '1';
        retryBtn.disabled = false;
        if (statusText) statusText.textContent = 'Still attempting to connect to server...';
      }, 1000);
    });
  }

  // Active polling: auto-detect server reconnection every 2.5s
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/favicon.svg?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok || res.status < 500) {
        clearInterval(pollTimer);
        reconnect();
      }
    } catch (e) {
      // still offline
    }
  }, 2500);

  window.addEventListener('online', () => {
    reconnect();
  });
});

