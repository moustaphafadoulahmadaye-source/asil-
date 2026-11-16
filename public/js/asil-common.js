/* ==========================================================================
   ASIL LOGISTICS - COMMON CONFIGURATION, UTILITIES & DESIGN SYSTEM
   ========================================================================== */

/**
 * Global Company Configuration
 * Update the fields below with verified company data.
 * If any field is empty, it will be automatically hidden across all pages.
 */
const COMPANY = {
  name: 'ASIL Logistics',
  legalName: 'ASIL Logistics & Transportation Services Co. Ltd.',
  tagline: 'Premier Passenger Transport, Freight Distribution & Logistics Management',
  phone: '', // Real company phone number
  email: '', // Real company email address
  whatsapp: '', // Real WhatsApp hotline number
  address: '', // Real physical headquarters address
  registration: '', // Official commercial registration number
  workingHours: '24/7 Operations Desk & Customer Support'
};

if (typeof window !== 'undefined') window.COMPANY = COMPANY;
if (typeof globalThis !== 'undefined') globalThis.COMPANY = COMPANY;

// Check if a company config field has been configured with real data
function isCompanyConfigured(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed.startsWith('[') || trimmed.includes('example.com') || trimmed === 'contact@asillogistics.sd' || trimmed.includes('Commercial District, Khartoum')) {
    return false;
  }
  return true;
}

const ICONS = {
  truck: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
  travel: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
  maint: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
  client: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>',
  userLock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
  stats: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.16c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.13 8.13 0 0 1-1.25-4.39c0-4.52 3.68-8.19 8.2-8.19 2.19 0 4.24.85 5.79 2.4 1.55 1.55 2.4 3.6 2.4 5.79 0 4.51-3.67 8.18-8.19 8.18zm4.49-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.17 1.74 2.66 4.22 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.1-.23-.17-.48-.29z"/></svg>'
};

// Official Brand Logo Component (SVG Image element builder)
function getBrandLogoHtml(variant = 'default') {
  return `<img src="/img/logo.svg" alt="ASIL Logistics Logo" height="38" class="asil-brand-logo" style="display:inline-block;vertical-align:middle;">`;
}

// Helper: Escape HTML strings
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Date & time formatting
function fmtDate(ts) {
  if (!ts) return '–';
  const d = new Date(typeof ts === 'string' && ts.includes('-') && !ts.includes('T') ? ts + 'T00:00:00' : ts);
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Status tag HTML builder
function statusBadge(status) {
  const s = String(status || 'Pending').toLowerCase().replace(/\s+/g, '');
  return `<span class="status-tag ${s}">${esc(status || 'Pending')}</span>`;
}

// Standardized API request helper - supports both:
// api('POST', '/api/path', body) AND api('/api/path', { method, body })
function api(methodOrUrl, urlOrOpts, maybeBody) {
  let method = 'GET';
  let url = '';
  let body = undefined;

  if (typeof methodOrUrl === 'string' && (methodOrUrl.startsWith('/') || methodOrUrl.startsWith('http'))) {
    url = methodOrUrl;
    if (urlOrOpts && typeof urlOrOpts === 'object') {
      method = (urlOrOpts.method || 'GET').toUpperCase();
      body = urlOrOpts.body;
    }
  } else {
    method = String(methodOrUrl || 'GET').toUpperCase();
    url = String(urlOrOpts || '');
    body = maybeBody;
  }

  const opts = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body !== undefined && body !== null) {
    opts.body = typeof body === 'object' ? JSON.stringify(body) : body;
  }
  return fetch(url, opts).then(async r => {
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) {
      return Promise.reject(data || { error: `Request failed with status ${r.status}` });
    }
    return data;
  });
}

// Toast notification helper
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:90vw;';
    document.body.appendChild(toastContainer);
  }
  const el = document.createElement('div');
  const bg = type === 'success' ? '#16a34a' : (type === 'error' ? '#dc2626' : '#0e3b43');
  el.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 8px 16px rgba(0,0,0,0.18);pointer-events:auto;transition:all 0.3s;opacity:0;transform:translateY(10px);word-break:break-word;`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 10);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }, 4500);
}

/**
 * Handle form submission with automatic:
 * - Button disable & spinner state
 * - Clear in-form status message rendering
 * - Toast notification
 * - Safe reset on success
 */
function handleFormSubmit(formEl, submitBtn, apiFn, options = {}) {
  if (!formEl || !submitBtn) return;
  const originalHtml = submitBtn.innerHTML;
  let statusBox = formEl.querySelector('.form-status-feedback');
  if (!statusBox) {
    statusBox = document.createElement('div');
    statusBox.className = 'form-status-feedback';
    statusBox.style.cssText = 'margin-top:16px;padding:12px 16px;border-radius:8px;font-size:14px;display:none;';
    formEl.appendChild(statusBox);
  }

  // Set processing state
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';
  submitBtn.style.cursor = 'not-allowed';
  submitBtn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Sending...`;
  statusBox.style.display = 'none';

  return Promise.resolve()
    .then(() => apiFn())
    .then((result) => {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
      submitBtn.style.cursor = '';
      submitBtn.innerHTML = originalHtml;

      const successMsg = (options.successMessage && typeof options.successMessage === 'function')
        ? options.successMessage(result)
        : (options.successMessage || 'Action completed successfully.');

      statusBox.style.display = 'block';
      statusBox.style.background = '#f0fdf4';
      statusBox.style.border = '1px solid #bbf7d0';
      statusBox.style.color = '#166534';
      statusBox.innerHTML = `<strong>Success:</strong> ${esc(successMsg)}`;
      showToast(successMsg, 'success');

      if (options.resetOnSuccess !== false) {
        formEl.reset();
      }
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    })
    .catch((err) => {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
      submitBtn.style.cursor = '';
      submitBtn.innerHTML = originalHtml;

      const errorMsg = (err && (err.error || err.message)) ? (err.error || err.message) : 'An error occurred. Please try again.';
      statusBox.style.display = 'block';
      statusBox.style.background = '#fef2f2';
      statusBox.style.border = '1px solid #fecaca';
      statusBox.style.color = '#991b1b';
      statusBox.innerHTML = `<strong>Error:</strong> ${esc(errorMsg)}`;
      showToast(errorMsg, 'error');

      if (options.onError) {
        options.onError(err);
      }
      throw err;
    });
}

/**
 * WhatsApp Float Button Creator
 */
function injectWhatsAppFloat() {
  if (document.getElementById('asil-whatsapp-float')) return;

  const container = document.createElement('div');
  container.id = 'asil-whatsapp-float';
  container.innerHTML = `
    <a href="#" id="asil-wa-anchor" class="wa-float-btn" aria-label="Contact ASIL Logistics on WhatsApp" title="Chat with ASIL Logistics Desk">
      ${ICONS.whatsapp}
      <span class="wa-float-label">Operations Desk</span>
    </a>
  `;
  document.body.appendChild(container);

  const anchor = document.getElementById('asil-wa-anchor');
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    if (isCompanyConfigured(COMPANY.whatsapp)) {
      const digits = String(COMPANY.whatsapp).replace(/\D/g, '');
      const msg = encodeURIComponent(`Hello ASIL Logistics operations desk, I would like to inquire about transport and logistics services.`);
      window.open(`https://wa.me/${digits}?text=${msg}`, '_blank', 'noopener,noreferrer');
    } else {
      showToast('Our WhatsApp hotline is being initialized. For urgent inquiries, please submit a tracking or booking request or contact our dispatch desk.', 'info');
    }
  });
}

/**
 * Standard Footer Injector/Enhancer
 */
function injectStandardFooter() {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;

  const contactListItems = [];

  if (isCompanyConfigured(COMPANY.address)) {
    contactListItems.push(`
      <li style="display:flex;gap:10px;align-items:flex-start;font-size:13px;">
        <span style="color:var(--gold);margin-top:2px;">${ICONS.pin}</span>
        <span>${esc(COMPANY.address)}</span>
      </li>
    `);
  }

  if (isCompanyConfigured(COMPANY.phone)) {
    const phoneClean = COMPANY.phone.replace(/\s+/g, '');
    contactListItems.push(`
      <li style="display:flex;gap:10px;align-items:center;font-size:13px;">
        <span style="color:var(--gold);">${ICONS.phone}</span>
        <a href="tel:${esc(phoneClean)}" style="color:#ffffff;font-weight:600;">${esc(COMPANY.phone)}</a>
      </li>
    `);
  }

  if (isCompanyConfigured(COMPANY.email)) {
    contactListItems.push(`
      <li style="display:flex;gap:10px;align-items:center;font-size:13px;">
        <span style="color:var(--gold);">${ICONS.email}</span>
        <a href="mailto:${esc(COMPANY.email)}" style="color:#ffffff;">${esc(COMPANY.email)}</a>
      </li>
    `);
  }

  if (COMPANY.workingHours && String(COMPANY.workingHours).trim()) {
    contactListItems.push(`
      <li style="display:flex;gap:10px;align-items:center;font-size:12.5px;color:rgba(255,255,255,0.7);">
        <span style="color:var(--gold);">${ICONS.clock}</span>
        <span>${esc(COMPANY.workingHours)}</span>
      </li>
    `);
  }

  const regBadge = isCompanyConfigured(COMPANY.registration)
    ? `Reg No: ${esc(COMPANY.registration)} &bull; 24/7 Dispatch Control`
    : `24/7 Dispatch Control`;

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <img src="/img/logo.svg" alt="ASIL Logistics" height="38">
          </div>
          <p style="font-size:13.5px;line-height:1.7;color:rgba(255,255,255,0.78);max-width:340px;margin-bottom:14px;">
            ASIL Logistics delivers professional passenger travel, cargo freight, facility maintenance, and commercial onboarding services across key trade corridors.
          </p>
          <div style="font-size:12px;color:var(--gold);font-weight:600;">
            ${regBadge}
          </div>
        </div>

        <div class="footer-col">
          <h4>Multi-Modal Logistics</h4>
          <ul class="footer-links">
            <li><a href="/sea">Port Sudan Sea Freight</a></li>
            <li><a href="/air">Air Cargo &amp; Charters</a></li>
            <li><a href="/transport">Executive Fleet &amp; Cars</a></li>
            <li><a href="/distribution">Freight Distribution</a></li>
            <li><a href="/order" style="color:var(--gold);font-weight:700;">Instant Booking Engine</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Enterprise &amp; Legal</h4>
          <ul class="footer-links">
            <li><a href="/subscription" style="color:var(--gold);font-weight:700;">Corporate Subscriptions</a></li>
            <li><a href="/maintenance">Facilities Maintenance</a></li>
            <li><a href="/onboarding">Client Onboarding (KYC)</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Contact &amp; Operations</h4>
          <ul class="footer-links" style="gap:10px;">
            ${contactListItems.join('')}
          </ul>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <div class="footer-copy">&copy; ${new Date().getFullYear()} ${esc(COMPANY.legalName)}. All rights reserved. Khartoum, Sudan.</div>
        <div class="footer-legal-links">
          <a href="#" data-pwa-install class="footer-install-link" style="color:var(--gold);font-weight:700;cursor:pointer;">📲 Install App</a>
          <span class="sep">&bull;</span>
          <a href="/privacy">Privacy Policy</a>
          <span class="sep">&bull;</span>
          <a href="/terms">Terms of Service</a>
          <span class="sep">&bull;</span>
          <a href="/portal" class="footer-portal-link">Customer Portal</a>
          <span class="sep">&bull;</span>
          <a href="/admin" class="footer-portal-link">Staff Console</a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Update topbars with configured company phone and email
 */
function updateHeaderContacts() {
  const phoneEl = document.getElementById('topbar-phone');
  const emailEl = document.getElementById('topbar-email');
  if (phoneEl) {
    if (isCompanyConfigured(COMPANY.phone)) {
      phoneEl.style.display = 'inline-flex';
      phoneEl.innerHTML = `<a href="tel:${COMPANY.phone.replace(/\s+/g, '')}" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">${ICONS.phone} <span>${esc(COMPANY.phone)}</span></a>`;
    } else {
      phoneEl.style.display = 'none';
    }
  }
  if (emailEl) {
    if (isCompanyConfigured(COMPANY.email)) {
      emailEl.style.display = 'inline-flex';
      emailEl.innerHTML = `<a href="mailto:${COMPANY.email}" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">${ICONS.email} <span>${esc(COMPANY.email)}</span></a>`;
    } else {
      emailEl.style.display = 'none';
    }
  }

  // Update any brand logos that might have placeholder graphics
  document.querySelectorAll('.brand-link').forEach(link => {
    // If it has no img logo inside, ensure our logo is present
    if (!link.querySelector('img[src*="logo.svg"]')) {
      const existingText = link.querySelector('.brand-text') || link.querySelector('span');
      if (link.firstElementChild && link.firstElementChild.tagName === 'svg') {
        link.firstElementChild.remove();
      }
      const img = document.createElement('img');
      img.src = '/img/logo.svg';
      img.alt = 'ASIL Logistics Logo';
      img.height = 38;
      img.style.verticalAlign = 'middle';
      link.prepend(img);
    }
  });
}

/**
 * Mobile Bottom Tab Bar Navigation (< 720px)
 * Single authoritative implementation: 5 high-contrast touch targets
 * Home, Services, Track, Contact, Account
 */
function initBottomTabBar() {
  if (typeof window === 'undefined') return;
  const path = (window.location.pathname || '').toLowerCase();
  // Never inject mobile bottom bar on admin management console
  if (path.startsWith('/admin')) return;

  if (document.querySelector('.app-bottom-bar')) return;
  const hash = (window.location.hash || '').toLowerCase();

  const isServices = path === '/transport' || path === '/distribution' || path === '/maintenance' || path === '/onboarding' || path === '/sea' || path === '/air' || hash.includes('services');
  const isTrack = path === '/track' || hash.includes('track');
  const isContact = hash.includes('contact');
  const isAccount = path === '/portal' || path === '/customer' || path === '/order' || path === '/subscription';
  const isHome = !isServices && !isTrack && !isContact && !isAccount;

  const bar = document.createElement('nav');
  bar.className = 'app-bottom-bar';
  bar.setAttribute('aria-label', 'Mobile Bottom Navigation');

  const isMobile = window.innerWidth < 768;
  bar.style.cssText = `position:fixed !important;bottom:0 !important;left:0 !important;right:0 !important;width:100% !important;height:56px !important;max-height:56px !important;z-index:99999 !important;background:#071f24 !important;display:${isMobile ? 'flex' : 'none'} !important;align-items:center !important;justify-content:space-around !important;box-shadow:0 -4px 16px rgba(0,0,0,0.3) !important;border-top:1px solid rgba(242,194,48,0.2) !important;margin:0 !important;padding:0 !important;`;

  bar.innerHTML = `
    <a href="/" class="app-tab-item ${isHome ? 'active' : ''}" aria-label="Home" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:56px;color:${isHome ? '#f2c230' : '#94a3b8'};text-decoration:none;font-size:11px;font-weight:600;">
      <svg class="tab-svg" width="20" height="20" style="width:20px !important;height:20px !important;max-width:20px !important;max-height:20px !important;min-width:20px;min-height:20px;display:block;margin:0 auto 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span class="tab-label">Home</span>
    </a>
    <a href="/transport" class="app-tab-item ${isServices ? 'active' : ''}" aria-label="Services" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:56px;color:${isServices ? '#f2c230' : '#94a3b8'};text-decoration:none;font-size:11px;font-weight:600;">
      <svg class="tab-svg" width="20" height="20" style="width:20px !important;height:20px !important;max-width:20px !important;max-height:20px !important;min-width:20px;min-height:20px;display:block;margin:0 auto 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      <span class="tab-label">Services</span>
    </a>
    <a href="/track" class="app-tab-item ${isTrack ? 'active' : ''}" aria-label="Track Shipment" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:56px;color:${isTrack ? '#f2c230' : '#94a3b8'};text-decoration:none;font-size:11px;font-weight:600;">
      <svg class="tab-svg" width="20" height="20" style="width:20px !important;height:20px !important;max-width:20px !important;max-height:20px !important;min-width:20px;min-height:20px;display:block;margin:0 auto 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><circle cx="11" cy="11" r="3"/></svg>
      <span class="tab-label">Track</span>
    </a>
    <a href="/#contact" class="app-tab-item ${isContact ? 'active' : ''}" aria-label="Contact" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:56px;color:${isContact ? '#f2c230' : '#94a3b8'};text-decoration:none;font-size:11px;font-weight:600;">
      <svg class="tab-svg" width="20" height="20" style="width:20px !important;height:20px !important;max-width:20px !important;max-height:20px !important;min-width:20px;min-height:20px;display:block;margin:0 auto 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <span class="tab-label">Contact</span>
    </a>
    <a href="/portal" class="app-tab-item ${isAccount ? 'active' : ''}" aria-label="Customer Account" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:56px;color:${isAccount ? '#f2c230' : '#94a3b8'};text-decoration:none;font-size:11px;font-weight:600;">
      <svg class="tab-svg" width="20" height="20" style="width:20px !important;height:20px !important;max-width:20px !important;max-height:20px !important;min-width:20px;min-height:20px;display:block;margin:0 auto 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span class="tab-label">Account</span>
    </a>
  `;
  document.body.appendChild(bar);

  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
      bar.style.setProperty('display', 'flex', 'important');
    } else {
      bar.style.setProperty('display', 'none', 'important');
    }
  });
}

// Global initialization
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderContacts();
    initBottomTabBar();
    injectStandardFooter();
    injectWhatsAppFloat();
  });
}
