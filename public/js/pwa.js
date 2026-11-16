/**
 * ASIL Logistics - Progressive Web App (PWA) Client Controller (pwa.js)
 * Service Worker management, installation lifecycle, offline detection,
 * and mobile navigation bar.
 */

(function () {
  'use strict';

  const IS_ADMIN = window.location.pathname.startsWith('/admin');
  const IS_STANDALONE = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // ==========================================
  // 1. SERVICE WORKER REGISTRATION & UPDATES
  // ==========================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Detect waiting service worker updates
          if (registration.waiting && navigator.serviceWorker.controller) {
            showUpdateBanner(registration.waiting);
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdateBanner(newWorker);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('ASIL PWA Service Worker registration:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PWA_CACHE_PURGED') {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        }
      });
    });
  }

  // Banner for app update availability
  function showUpdateBanner(worker) {
    if (document.getElementById('pwaUpdateBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaUpdateBanner';
    banner.className = 'pwa-banner-bar';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f2c230" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>A new version of <strong>ASIL Logistics</strong> is available.</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="pwaUpdateBtn" style="min-height:36px;padding:6px 14px;background:#f2c230;color:#071f24;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Update Now</button>
        <button id="pwaDismissUpdateBtn" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:0 6px;" aria-label="Close">&times;</button>
      </div>
    `;
    document.body.appendChild(banner);

    const updateBtn = document.getElementById('pwaUpdateBtn');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        worker.postMessage('SKIP_WAITING');
      });
    }

    const dismissBtn = document.getElementById('pwaDismissUpdateBtn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        banner.remove();
      });
    }
  }

  // ==========================================
  // 2. OFFLINE & ONLINE CONNECTIVITY STATUS
  // ==========================================
  function showNetworkStatus(online) {
    let bar = document.getElementById('pwaNetworkBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pwaNetworkBar';
      bar.className = 'pwa-banner-bar';
      document.body.appendChild(bar);
    }

    if (!online) {
      bar.style.background = '#0f172a';
      bar.style.borderBottom = '2px solid #ef4444';
      bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;width:100%;justify-content:center;">
          <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444;"></span>
          <span>You are currently offline. Cached views and verified tracking remain available.</span>
        </div>
      `;
      bar.style.display = 'flex';
    } else {
      bar.style.background = '#064e3b';
      bar.style.borderBottom = '2px solid #10b981';
      bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;width:100%;justify-content:center;">
          <span style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></span>
          <span>Connection restored!</span>
        </div>
      `;
      bar.style.display = 'flex';
      setTimeout(() => {
        if (bar) bar.style.display = 'none';
      }, 3000);
    }
  }

  window.addEventListener('offline', () => showNetworkStatus(false));
  window.addEventListener('online', () => showNetworkStatus(true));

  // ==========================================
  // 3. INSTALLATION CARDS (Android, Desktop, iOS)
  // ==========================================
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    if (IS_STANDALONE || IS_ADMIN) return;

    // Check if dismissed within 7 days
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Show install card after 4 seconds
    setTimeout(showInstallCard, 4000);
  });

  function showInstallCard() {
    if (document.getElementById('pwaInstallCard') || IS_STANDALONE || IS_ADMIN) return;

    const card = document.createElement('div');
    card.id = 'pwaInstallCard';
    card.className = 'pwa-install-card';
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="/img/icons/icon-192.png" alt="ASIL" style="width:48px;height:48px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
          <div>
            <h4 style="margin:0;font-size:16px;font-weight:800;color:#0e3b43;">Install ASIL Logistics</h4>
            <p style="margin:2px 0 0;font-size:12.5px;color:#64748b;">Fast 1-tap bookings, cargo manifests, &amp; offline tracking</p>
          </div>
        </div>
        <button id="pwaDismissBtn" style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:0 4px;" aria-label="Dismiss">&times;</button>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <button id="pwaConfirmInstallBtn" class="btn-gold" style="flex:1;min-height:40px;font-size:13.5px;border-radius:10px;">
          Install App
        </button>
        <button id="pwaLaterBtn" style="min-height:40px;padding:0 14px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">
          Maybe Later
        </button>
      </div>
    `;
    document.body.appendChild(card);

    function dismissCard() {
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
      if (card) card.remove();
    }

    document.getElementById('pwaDismissBtn').addEventListener('click', dismissCard);
    document.getElementById('pwaLaterBtn').addEventListener('click', dismissCard);

    document.getElementById('pwaConfirmInstallBtn').addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          dismissCard();
        }
        deferredInstallPrompt = null;
      }
    });
  }

  // iOS Safari "Add to Home Screen" Tip
  function showIosInstallTip() {
    if (document.getElementById('iosInstallTip') || IS_STANDALONE || IS_ADMIN) return;
    const tip = document.createElement('div');
    tip.id = 'iosInstallTip';
    tip.className = 'pwa-install-card';
    tip.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="/img/icons/apple-touch-icon.png" alt="ASIL" style="width:44px;height:44px;border-radius:10px;">
          <div>
            <h4 style="margin:0;font-size:15px;font-weight:800;color:#0e3b43;">Install ASIL on iPhone</h4>
            <p style="margin:3px 0 0;font-size:12px;color:#64748b;">
              Tap the Safari <strong>Share</strong> button <span style="font-size:14px;">⎙</span>, then select <strong>Add to Home Screen</strong> <span style="font-size:14px;">⊞</span>.
            </p>
          </div>
        </div>
        <button id="pwaIosDismissBtn" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;" aria-label="Close">&times;</button>
      </div>
    `;
    document.body.appendChild(tip);

    const dismiss = document.getElementById('pwaIosDismissBtn');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        localStorage.setItem('ios_pwa_dismissed', Date.now().toString());
        tip.remove();
      });
    }
  }

  if (IS_IOS && !IS_STANDALONE && !IS_ADMIN) {
    const iosDismissed = localStorage.getItem('ios_pwa_dismissed');
    if (!iosDismissed || Date.now() - parseInt(iosDismissed, 10) > 7 * 24 * 60 * 60 * 1000) {
      setTimeout(showIosInstallTip, 4000);
    }
  }

  // ==========================================
  // Global Install Trigger & Event Delegation
  // ==========================================
  window.promptPwaInstall = async function () {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        const card = document.getElementById('pwaInstallCard');
        if (card) card.remove();
        deferredInstallPrompt = null;
      }
      return choice;
    } else if (IS_IOS) {
      showIosInstallTip();
    } else {
      if (typeof showToast === 'function') {
        showToast('To install ASIL Logistics, open your browser menu (⋮) and tap "Add to Home screen" or "Install App".', 'info');
      } else {
        alert('To install ASIL Logistics, open your browser menu (⋮) and tap "Add to Home screen" or "Install App".');
      }
    }
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pwa-install], .btn-install-app');
    if (btn) {
      e.preventDefault();
      window.promptPwaInstall();
    }
  });

})();
