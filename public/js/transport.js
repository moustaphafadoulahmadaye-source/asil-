let activeMode = 'book';
let customerType = 'individual';
let transportTab = 'overview';
let S = { overview: null, bookings: [], vehicles: [], drivers: [] };
let trackingResult = null;
let selectedBookingForAssign = null;

// Expose on window for runtime compatibility
window.setMode = setMode;
window.setCustomerType = setCustomerType;
window.setTransportTab = setTransportTab;
window.handlePassengerSubmit = handlePassengerSubmit;

document.addEventListener('DOMContentLoaded', () => {
  const btnBook = document.getElementById('btn-mode-book');
  if (btnBook) btnBook.addEventListener('click', () => setMode('book'));
  const btnTrack = document.getElementById('btn-mode-track');
  if (btnTrack) btnTrack.addEventListener('click', () => setMode('track'));
  const btnDash = document.getElementById('btn-mode-dash');
  if (btnDash) btnDash.addEventListener('click', () => setMode('dashboard'));

  // Event delegation for customer type buttons and forms
  document.addEventListener('click', (e) => {
    const typeBtn = e.target.closest('[data-customer-type]');
    if (typeBtn) {
      setCustomerType(typeBtn.getAttribute('data-customer-type'));
      return;
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'passenger-form') {
      handlePassengerSubmit(e);
    }
  });

  render();
});

function setMode(mode) {
  activeMode = mode;
  document.querySelectorAll('.switcher-pill').forEach(p => p.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-mode-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');
  render();
}

function setCustomerType(type) {
  customerType = type;
  render();
}

function setTransportTab(tab) {
  transportTab = tab;
  render();
}

async function loadTransportData() {
  try {
    const [ov, bks, vehs, drvs] = await Promise.all([
      api('GET', '/api/departments/transport/overview').catch(() => null),
      api('GET', '/api/departments/transport/bookings').catch(() => []),
      api('GET', '/api/departments/transport/vehicles').catch(() => []),
      api('GET', '/api/departments/transport/drivers').catch(() => [])
    ]);
    S.overview = ov;
    S.bookings = bks || [];
    S.vehicles = vehs || [];
    S.drivers = drvs || [];
  } catch (e) { }
}

// 1. Render Public Booking View
function renderBookingForm() {
  const isCorp = customerType === 'company';
  return `
        <!-- Executive Fleet Showcase -->
        <div style="margin:28px 0 16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <div>
              <span class="status-tag" style="background:rgba(14,59,67,0.08);color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/></svg>
                Verified Commercial Fleet
              </span>
              <h3 style="font-size:22px;font-weight:800;color:var(--primary);margin:6px 0 2px;">Chauffeur &amp; Shuttle Fleet</h3>
              <p style="font-size:13.5px;color:var(--text-muted);margin:0;">Equipped with climate control, comfortable seating, and experienced commercial drivers.</p>
            </div>
          </div>

          <div class="fleet-preview-strip">
            <div class="fleet-preview-card">
              <div class="fleet-card-media">
                <img src="/img/executive-sedan.jpg" alt="Executive VIP Sedan">
                <span class="fleet-card-badge">Sedan Class</span>
              </div>
              <div class="fleet-card-body">
                <h4 class="fleet-card-title">Executive Sedan</h4>
                <div class="fleet-card-sub">Toyota Camry / Mercedes-Benz Sedan</div>
                <div class="fleet-spec-row">
                  <span>Capacity: 3 Pax</span>
                  <span>&bull;</span>
                  <span>Airport &amp; Executive Travel</span>
                </div>
              </div>
            </div>

            <div class="fleet-preview-card">
              <div class="fleet-card-media">
                <img src="/img/passenger-travel.jpg" alt="4x4 Land Cruiser SUV">
                <span class="fleet-card-badge">4x4 SUV</span>
              </div>
              <div class="fleet-card-body">
                <h4 class="fleet-card-title">4x4 Land Cruiser SUV</h4>
                <div class="fleet-card-sub">Toyota Land Cruiser / Prado</div>
                <div class="fleet-spec-row">
                  <span>Capacity: 4 Pax</span>
                  <span>&bull;</span>
                  <span>Intercity Routes</span>
                </div>
              </div>
            </div>

            <div class="fleet-preview-card">
              <div class="fleet-card-media">
                <img src="/img/corporate-onboarding.jpg" alt="Executive VIP Minivan">
                <span class="fleet-card-badge">Delegations</span>
              </div>
              <div class="fleet-card-body">
                <h4 class="fleet-card-title">Executive VIP Minivan</h4>
                <div class="fleet-card-sub">Mercedes V-Class / Luxury Van</div>
                <div class="fleet-spec-row">
                  <span>Capacity: 6 Pax</span>
                  <span>&bull;</span>
                  <span>Corporate Delegation</span>
                </div>
              </div>
            </div>

            <div class="fleet-preview-card">
              <div class="fleet-card-media">
                <img src="/img/fleet-truck.jpg" alt="Regional Fleet Coach">
                <span class="fleet-card-badge">Group Transit</span>
              </div>
              <div class="fleet-card-body">
                <h4 class="fleet-card-title">Coaster Executive Shuttle</h4>
                <div class="fleet-card-sub">Toyota Coaster Commercial Coach</div>
                <div class="fleet-spec-row">
                  <span>Capacity: 28 Pax</span>
                  <span>&bull;</span>
                  <span>Workforce Shuttles</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="premium-form-card" id="passengerBookingCard">
          <div class="premium-form-header">
            <span class="status-tag" style="background:rgba(14,59,67,0.08);color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-size:12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/></svg>
              Fast-Track Fleet Dispatch
            </span>
            <h2 class="premium-form-title">Passenger Transportation Booking</h2>
            <p class="premium-form-sub">Direct chauffeured travel reservations, VIP corporate convoys, and airport transfers with verified commercial drivers.</p>
          </div>

          <!-- Stepper Progress Bar -->
          <div class="form-stepper" aria-label="Booking Progress">
            <div class="stepper-item active">
              <div class="stepper-bubble">1</div>
              <span class="stepper-label">Account Category</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">2</div>
              <span class="stepper-label">Passenger Contact</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">3</div>
              <span class="stepper-label">Route &amp; Fleet</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">4</div>
              <span class="stepper-label">Confirmation</span>
            </div>
          </div>

          <!-- Account Category Toggle Pills -->
          <div class="type-toggle-pills" role="tablist">
            <button type="button" class="type-pill-btn ${!isCorp ? 'active' : ''}" id="btnTypeIndividual" data-customer-type="individual">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Individual Passenger
            </button>
            <button type="button" class="type-pill-btn ${isCorp ? 'active' : ''}" id="btnTypeCorporate" data-customer-type="company">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
              Corporate Enterprise
            </button>
          </div>

          <form id="passenger-form">
            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              <span>1. Contact &amp; Passenger Information</span>
            </div>
            
            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">${isCorp ? 'Company Legal Entity Name *' : 'Passenger Full Name *'}</label>
                <input name="fullName" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="${isCorp ? 'e.g. Nile Agro Industries Ltd' : 'e.g. Yousif Mustafa Al-Nur'}" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Official Email Address *</label>
                <input type="email" name="email" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="contact@domain.com" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Telephone / WhatsApp *</label>
                <input name="phone" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="+249 ... or local phone" required>
              </div>
            </div>

            ${isCorp ? `
              <div class="form-row" style="background:var(--bg-soft);padding:18px;border-radius:var(--radius-md);margin:14px 0;border:1px dashed var(--border-medium);">
                <div class="form-group" style="flex:1;">
                  <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Company Authorizing Officer *</label>
                  <input name="contactPerson" style="height:46px;border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;width:100%;" placeholder="e.g. Eng. Hisham Al-Hadi (Operations Director)" required>
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Commercial Registration (CR)</label>
                  <input name="companyReg" style="height:46px;border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;width:100%;" placeholder="e.g. CR-KRT-994821">
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Cost Center / PO Number</label>
                  <input name="billingDetails" style="height:46px;border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;width:100%;" placeholder="e.g. PO-2026-SPC-0098">
                </div>
              </div>
            ` : ''}

            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>2. Route Specifications &amp; Schedule</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Pickup / Departure Point *</label>
                <input name="departure" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Khartoum International Airport (Terminal 1)" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Destination Address / Corridor *</label>
                <input name="destination" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Corinthia Hotel or Port Sudan Operations Base" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Travel Date *</label>
                <input type="date" name="travelDate" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" required value="${new Date().toISOString().slice(0, 10)}">
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Departure Time *</label>
                <input type="time" name="departureTime" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" required value="08:00">
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Headcount (Passengers) *</label>
                <input type="number" name="passengers" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" min="1" max="60" value="1" required>
              </div>
              <div class="form-group" style="flex:1.5;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Vehicle Preference *</label>
                <select name="vehiclePreference" id="vehiclePreference" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14px;width:100%;background:#fff;" required>
                  <option value="Executive VIP Sedan">Executive Sedan (Toyota Camry / Mercedes - 3 Pax)</option>
                  <option value="Executive 4x4 Land Cruiser">4x4 Land Cruiser SUV (Land Cruiser / Prado - 4 Pax)</option>
                  <option value="Executive VIP Minivan">Passenger Minivan (Mercedes V-Class - 6 Pax)</option>
                  <option value="Coaster Executive Shuttle">Coaster Executive Shuttle (Toyota Coaster - 28 Pax)</option>
                  <option value="Inter-City Passenger Coach">Inter-City Passenger Coach (Luxury Bus - 50 Pax)</option>
                </select>
              </div>
            </div>

            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>3. Luggage &amp; Special Handling Requirements</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Luggage Specifications</label>
                <input name="luggage" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. 2 large hardcases + 1 briefcase per traveler">
              </div>
              <div class="form-group" style="flex:2;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Travel / Flight Notes &amp; Instructions</label>
                <input name="instructions" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Meet &amp; Greet with name signboard at Terminal 1, convoy clearance">
              </div>
            </div>

            <div class="form-status-feedback" style="display:none;margin-top:16px;"></div>

            <div style="margin-top:24px;text-align:right;">
              <button type="submit" class="btn-gold" style="min-height:50px;padding:0 36px;font-size:15px;font-weight:700;border:none;border-radius:var(--radius-md);cursor:pointer;width:100%;">
                Submit Passenger Travel Reservation &rarr;
              </button>
            </div>
          </form>
        </div>
      `;
}

async function handlePassengerSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-gold');
  const originalText = submitBtn.innerHTML;

  let statusBox = form.querySelector('.form-status-feedback');
  if (!statusBox) {
    statusBox = document.createElement('div');
    statusBox.className = 'form-status-feedback';
    form.appendChild(statusBox);
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Processing Reservation...`;
  statusBox.style.display = 'none';

  const f = Object.fromEntries(new FormData(form));
  f.customerType = customerType;
  try {
    const res = await api('POST', '/api/bookings', f);
    if (res && res.ok) {
      const card = document.getElementById('passengerBookingCard');
      const verifier = f.phone ? f.phone.slice(-4) : (f.email || '');
      if (card) {
        card.innerHTML = `
              <div class="premium-success-card">
                <div class="success-badge-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span class="status-tag" style="background:#ecfdf5;color:#059669;font-weight:700;padding:6px 16px;border-radius:20px;font-size:12.5px;">
                  CONFIRMED &bull; QUEUED FOR FLEET DISPATCH
                </span>
                <h3 style="font-size:26px;font-weight:800;color:var(--primary);margin:14px 0 6px;">Passenger Reservation Registered!</h3>
                <p style="font-size:14.5px;color:var(--text-secondary);max-width:540px;margin:0 auto 18px;line-height:1.6;">
                  Your chauffeured travel booking has been logged in the active dispatch registry. Save your tracking reference code below to follow live vehicle assignments.
                </p>

                <div class="ref-box">
                  <span class="ref-code" id="bookingSuccessRef">${esc(res.id)}</span>
                  <button type="button" class="btn-copy-ref" onclick="navigator.clipboard.writeText('${esc(res.id)}'); this.querySelector('span').innerText='Copied!'; setTimeout(()=>this.querySelector('span').innerText='Copy', 2000);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy</span>
                  </button>
                </div>

                <p style="font-size:13px;color:var(--text-muted);margin:0 0 24px;">
                  Security Verifier: Last 4 digits of phone (<strong>${esc(verifier || '9888')}</strong>)
                </p>

                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                  <button type="button" class="btn-gold" style="padding:12px 28px;font-size:14.5px;border-radius:var(--radius-md);border:none;cursor:pointer;" onclick="setMode('track'); setTimeout(()=>{ const ri=document.getElementById('track-ref-input'); const vi=document.getElementById('track-verify-input'); if(ri) ri.value='${esc(res.id)}'; if(vi) vi.value='${esc(verifier)}'; lookupBooking('${esc(res.id)}', '${esc(verifier)}'); }, 80);">
                    Track Journey Status &rarr;
                  </button>
                  <button type="button" class="btn-glass" style="padding:12px 24px;font-size:14.5px;color:var(--primary);border:1.5px solid var(--border-medium);border-radius:var(--radius-md);cursor:pointer;background:#fff;" onclick="render()">
                    Book Another Journey
                  </button>
                </div>
              </div>
            `;
        card.scrollIntoView({ behavior: 'smooth' });
      }
      showToast(`Booking registered! Reference: ${res.id}`, 'success');
    }
  } catch (err) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#fef2f2';
    statusBox.style.border = '1px solid #fecaca';
    statusBox.style.color = '#991b1b';
    statusBox.innerHTML = `<strong>Submission Failed:</strong> ${esc(err.error || err.message || 'Server error')}`;
    showToast(err.error || err.message || 'Booking submission failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// 2. Render Status Tracker View
function renderStatusTracker() {
  return `
        <div class="booking-card" style="max-width:760px;margin:32px auto;">
          <h3 style="font-size:22px;font-weight:800;color:var(--primary-dark);margin-bottom:8px;">Passenger Journey Tracking</h3>
          <p style="font-size:13.5px;color:var(--ink-secondary);margin-bottom:20px;">Enter your unique booking reference plus your phone's last 4 digits or email for verification.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px;">
            <input id="track-ref-input" placeholder="Reference ID (e.g. TR-2026-K7M4Q9)" style="flex:1;min-width:180px;padding:12px;border:1.5px solid var(--line);border-radius:var(--radius-md);font-size:15px;text-transform:uppercase;">
            <input id="track-verify-input" placeholder="Phone last 4 digits or Email" style="flex:1;min-width:180px;padding:12px;border:1.5px solid var(--line);border-radius:var(--radius-md);font-size:15px;">
            <button class="btn-primary" onclick="lookupBooking(document.getElementById('track-ref-input').value, document.getElementById('track-verify-input').value)">Track &rarr;</button>
          </div>
          <div id="tracking-result-box">
            ${trackingResult ? renderTrackingDetails(trackingResult) : '<p style="color:var(--ink-muted);text-align:center;padding:24px;border:1px dashed var(--line);border-radius:var(--radius-md);">Enter your reference and verification code above to query live status.</p>'}
          </div>
        </div>
      `;
}

async function lookupBooking(ref, verifier) {
  if (!ref) {
    showToast('Please enter your reference ID', 'error');
    return;
  }
  verifier = (verifier || (document.getElementById('track-verify-input') ? document.getElementById('track-verify-input').value : '')).trim();
  if (!verifier) {
    showToast('Please enter phone last 4 digits or email for verification', 'error');
    return;
  }
  try {
    const data = await api('GET', '/api/bookings/' + encodeURIComponent(ref.trim().toUpperCase()) + '?verifier=' + encodeURIComponent(verifier));
    trackingResult = data;
    setMode('track');
  } catch (err) {
    alert('Reference not found: ' + (err.error || 'Invalid reference or verification mismatch'));
  }
}

function renderTrackingDetails(d) {
  return `
        <div style="border:1px solid var(--line);border-radius:var(--radius-md);padding:20px;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px;">
            <div>
              <span class="status-tag approved">${esc(d.bookingType)}</span>
              <h4 style="font-size:22px;font-weight:800;margin-top:6px;color:var(--primary-dark);font-family:monospace;">${esc(d.id)}</h4>
            </div>
            <div>${statusBadge(d.status)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13.5px;">
            <div><strong>Passenger:</strong> ${esc(d.maskedClient)}</div>
            <div><strong>Travel Date:</strong> ${esc(d.travelDate)} at ${esc(d.departureTime)}</div>
            <div><strong>Departure:</strong> ${esc(d.departure)}</div>
            <div><strong>Destination:</strong> ${esc(d.destination)}</div>
            <div><strong>Vehicle Class:</strong> ${esc(d.vehiclePreference)}</div>
            <div><strong>Passengers:</strong> ${esc(d.passengers)} pax</div>
            ${d.assignedVehicle ? `<div style="grid-column:1/-1;background:var(--ok-soft);padding:10px;border-radius:6px;border:1px solid var(--ok-border);"><strong>Allocated Fleet Asset:</strong> ${esc(d.assignedVehicle)} &bull; Chauffeur: ${esc(d.assignedDriver || 'Assigned')}</div>` : ''}
          </div>
        </div>
      `;
}

// 3. Render Staff Dashboard
function renderDashboard() {
  if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'dept_transport')) {
    return `
          <div class="booking-card" style="max-width:480px;margin:40px auto;text-align:center;">
            ${LOGO_SVG}
            <h3 style="font-size:20px;font-weight:800;color:var(--primary-dark);margin:14px 0 6px;">Transport &amp; Fleet Staff Console</h3>
            <p style="font-size:13.5px;color:var(--ink-secondary);margin-bottom:20px;">Restricted to certified fleet dispatchers and operations managers.</p>
            <form onsubmit="handleStaffLogin(event)">
              <div class="form-group" style="text-align:left;">
                <label>Staff Username or ID</label>
                <input name="username" value="officer_transport" required>
              </div>
              <div class="form-group" style="text-align:left;">
                <label>Security Password</label>
                <input type="password" name="password" value="transport123" required>
              </div>
              <button type="submit" class="btn-primary" style="width:100%;padding:12px;margin-top:8px;">Sign In to Fleet Console</button>
            </form>
          </div>
        `;
  }

  const ov = S.overview || { total: 0, pending: 0, approved: 0, completed: 0, vehicles: 0, drivers: 0 };

  return `
        <div class="dept-layout">
          <!-- Sidebar -->
          <aside class="dept-sidebar">
            <div class="dept-sidebar-header">
              <span class="dept-badge">Transport &amp; Fleet</span>
              <div class="dept-name">Fleet Command</div>
            </div>

            <div class="dept-user-pill">
              <div class="dept-user-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="dept-user-info">
                <div class="dept-user-name">${esc(currentUser.fullName)}</div>
                <div class="dept-user-role">${esc(currentUser.role)}</div>
              </div>
            </div>

            <ul class="dept-nav-list">
              <li class="dept-nav-item ${transportTab === 'overview' ? 'active' : ''}" onclick="setTransportTab('overview')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  Dashboard Overview
                </span>
              </li>
              <li class="dept-nav-item ${transportTab === 'bookings' ? 'active' : ''}" onclick="setTransportTab('bookings')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/></svg>
                  Passenger Requests
                </span>
                <span class="dept-count-badge">${ov.pending}</span>
              </li>
              <li class="dept-nav-item ${transportTab === 'vehicles' ? 'active' : ''}" onclick="setTransportTab('vehicles')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  Fleet Vehicles
                </span>
                <span class="dept-count-badge">${ov.vehicles}</span>
              </li>
              <li class="dept-nav-item ${transportTab === 'drivers' ? 'active' : ''}" onclick="setTransportTab('drivers')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  Chauffeurs &amp; Drivers
                </span>
                <span class="dept-count-badge">${ov.drivers}</span>
              </li>
            </ul>

            <div class="dept-sidebar-footer">
              <button class="btn-outline" style="width:100%;font-size:12.5px;" onclick="logoutUser()">Sign Out</button>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="dept-main">
            ${transportTab === 'overview' ? renderTransportOverview(ov) : ''}
            ${transportTab === 'bookings' ? renderTransportBookingsList() : ''}
            ${transportTab === 'vehicles' ? renderVehiclesList() : ''}
            ${transportTab === 'drivers' ? renderDriversList() : ''}
          </main>
        </div>

        ${selectedBookingForAssign ? renderAssignModal(selectedBookingForAssign) : ''}
      `;
}

async function handleStaffLogin(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const res = await loginUser(f.username, f.password);
  if (res && res.ok) {
    showToast('Authenticated as ' + res.user.fullName, 'success');
    await loadTransportData();
    render();
  } else {
    alert(res.error || 'Login failed');
  }
}

function renderTransportOverview(ov) {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Fleet Dispatch Operations Overview</h2>
            <div class="dept-page-subtitle">Real-time status of passenger shuttles, driver assignments, and vehicle telemetry.</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Passenger Bookings</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/></svg></span>
            </div>
            <div class="kpi-val">${ov.total}</div>
            <div class="kpi-sub">Registered across all corporate &amp; VIP channels</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Pending Review</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--warn);">${ov.pending}</div>
            <div class="kpi-sub">Awaiting route clearance &amp; assignment</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Approved Journeys</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--ok);">${ov.approved}</div>
            <div class="kpi-sub">Chauffeurs &amp; vehicles allocated</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Registered Fleet Assets</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--primary);">${ov.vehicles}</div>
            <div class="kpi-sub">Executive sedans, SUVs &amp; passenger coaches</div>
          </div>
        </div>
            <div class="kpi-sub">Executive sedans, SUVs &amp; passenger coaches</div>
          </div>
        </div>

        <div class="dept-table-wrap">
          <div class="dept-table-toolbar">
            <h4 style="font-size:15px;font-weight:700;color:var(--primary-dark);">Recent Passenger Booking Requests</h4>
            <button class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="setTransportTab('bookings')">View All Requests &rarr;</button>
          </div>
          <div class="dept-table-wrapper">
            <table class="dept-table">
              <thead>
                <tr><th>Ref</th><th>Passenger / Account</th><th>Route</th><th>Travel Date</th><th>Vehicle Class</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                ${S.bookings.slice(0, 5).map(b => `
                  <tr>
                    <td><strong>${esc(b.id)}</strong></td>
                    <td>${esc(b.companyName || b.fullName)} <span style="font-size:11px;color:var(--ink-muted);">(${b.customerType})</span></td>
                    <td>${esc(b.departure)} &rarr; ${esc(b.destination)}</td>
                    <td>${esc(b.travelDate)} ${esc(b.departureTime)}</td>
                    <td>${esc(b.vehiclePreference)}</td>
                    <td>${statusBadge(b.status)}</td>
                    <td><button class="btn-outline" style="padding:4px 10px;font-size:12px;" onclick="openAssignModal('${esc(b.id)}')">Manage</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
}

function renderTransportBookingsList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Passenger Transportation Requests Queue</h2>
            <div class="dept-page-subtitle">Review, approve, reject, and assign vehicles and dedicated chauffeurs.</div>
          </div>
        </div>

        <div class="dept-table-wrap">
          <div class="dept-table-toolbar">
            <div class="dept-table-search">
              <input placeholder="Search bookings..." oninput="filterBookings(this.value)">
            </div>
            <div>Total: <strong>${S.bookings.length}</strong> bookings</div>
          </div>
          <table class="dept-table" id="bookings-table">
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Contact</th><th>Route</th><th>Date/Time</th><th>Pax</th><th>Vehicle</th><th>Chauffeur</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.bookings.map(b => `
                <tr>
                  <td><strong>${esc(b.id)}</strong></td>
                  <td>${esc(b.companyName || b.fullName)}</td>
                  <td>${esc(b.phone)}</td>
                  <td>${esc(b.departure)} &rarr; ${esc(b.destination)}</td>
                  <td>${esc(b.travelDate)} ${esc(b.departureTime)}</td>
                  <td>${esc(b.passengers)}</td>
                  <td>${esc(b.assignedVehicle || '–')}</td>
                  <td>${esc(b.assignedDriver || '–')}</td>
                  <td>${statusBadge(b.status)}</td>
                  <td>
                    <button class="btn-primary" style="padding:4px 8px;font-size:11.5px;" onclick="openAssignModal('${esc(b.id)}')">Assign / Update</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function renderVehiclesList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Fleet Vehicles Management</h2>
            <div class="dept-page-subtitle">Real-time status of passenger sedans, 4x4 SUVs, and passenger coaches.</div>
          </div>
          <button class="btn-primary" onclick="alert('Add vehicle dialog')">+ Register Vehicle</button>
        </div>

        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead>
              <tr><th>Plate</th><th>Make &amp; Model</th><th>Category</th><th>Type</th><th>Capacity</th><th>Status</th><th>Assigned Chauffeur</th></tr>
            </thead>
            <tbody>
              ${S.vehicles.map(v => `
                <tr>
                  <td><strong>${esc(v.plate)}</strong></td>
                  <td>${esc(v.model)}</td>
                  <td>${esc(v.category)}</td>
                  <td>${esc(v.type)}</td>
                  <td>${esc(v.capacity)}</td>
                  <td><span class="status-tag ${v.status === 'Available' ? 'approved' : 'pending'}">${esc(v.status)}</span></td>
                  <td>${esc(v.assigned_driver || 'Unassigned')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function renderDriversList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Chauffeur &amp; Driver Management</h2>
            <div class="dept-page-subtitle">Active professional chauffeurs, commercial license qualifications, and contact details.</div>
          </div>
          <button class="btn-primary" onclick="alert('Add driver dialog')">+ Add Driver</button>
        </div>

        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>License Type</th><th>Category</th><th>Experience</th><th>Status</th><th>Allocated Vehicle</th></tr>
            </thead>
            <tbody>
              ${S.drivers.map(d => `
                <tr>
                  <td><strong>${esc(d.name)}</strong></td>
                  <td>${esc(d.phone)}</td>
                  <td>${esc(d.license_type)}</td>
                  <td>${esc(d.category)}</td>
                  <td>${esc(d.experience_years)} Years</td>
                  <td><span class="status-tag ${d.status === 'Active' ? 'approved' : 'pending'}">${esc(d.status)}</span></td>
                  <td>${esc(d.assigned_vehicle || 'Pool Driver')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function openAssignModal(id) {
  const b = S.bookings.find(x => x.id === id);
  if (!b) return;
  selectedBookingForAssign = b;
  render();
}

function closeAssignModal() {
  selectedBookingForAssign = null;
  render();
}

function renderAssignModal(b) {
  return `
        <div class="dept-modal-overlay">
          <div class="dept-modal">
            <div class="dept-modal-header">
              <div class="dept-modal-title">Manage Transport Booking: ${esc(b.id)}</div>
              <button onclick="closeAssignModal()" style="border:none;background:none;font-size:20px;cursor:pointer;">&times;</button>
            </div>
            <form onsubmit="handleSaveAssignment(event, '${esc(b.id)}')">
              <div class="dept-modal-body">
                <div style="background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;">
                  <div><strong>Customer:</strong> ${esc(b.companyName || b.fullName)} &bull; ${esc(b.phone)}</div>
                  <div><strong>Route:</strong> ${esc(b.departure)} &rarr; ${esc(b.destination)}</div>
                  <div><strong>Schedule:</strong> ${esc(b.travelDate)} ${esc(b.departureTime)} (${b.passengers} pax)</div>
                </div>

                <div class="form-group">
                  <label>Booking Status</label>
                  <select name="status">
                    <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending (Under Review)</option>
                    <option value="Approved" ${b.status === 'Approved' ? 'selected' : ''}>Approved (Confirmed)</option>
                    <option value="In Progress" ${b.status === 'In Progress' ? 'selected' : ''}>In Progress (Dispatched / En Route)</option>
                    <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed (Safely Arrived)</option>
                    <option value="Rejected" ${b.status === 'Rejected' ? 'selected' : ''}>Rejected (Decline Request)</option>
                    <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Assign Vehicle</label>
                  <select name="assignedVehicle">
                    <option value="">-- Select Available Vehicle --</option>
                    ${S.vehicles.map(v => `
                      <option value="${esc(v.model)} (${esc(v.plate)})" ${b.assignedVehicle && b.assignedVehicle.includes(v.plate) ? 'selected' : ''}>
                        ${esc(v.model)} - ${esc(v.plate)} (${esc(v.capacity)})
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label>Assign Chauffeur / Driver</label>
                  <select name="assignedDriver">
                    <option value="">-- Select Qualified Chauffeur --</option>
                    ${S.drivers.map(d => `
                      <option value="${esc(d.name)} (${esc(d.phone)})" ${b.assignedDriver && b.assignedDriver.includes(d.name) ? 'selected' : ''}>
                        ${esc(d.name)} - ${esc(d.phone)} (${esc(d.category)})
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label>Internal Dispatch Notes</label>
                  <textarea name="internalNotes" rows="3" placeholder="Add operational notes or gate clearance instructions...">${esc(b.internalNotes || '')}</textarea>
                </div>
              </div>
              <div class="dept-modal-footer">
                <button type="button" class="btn-outline" onclick="closeAssignModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Changes &amp; Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      `;
}

async function handleSaveAssignment(e, id) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  try {
    await api('PATCH', `/api/departments/transport/bookings/${encodeURIComponent(id)}`, f);
    showToast('Booking updated successfully', 'success');
    closeAssignModal();
    await loadTransportData();
    render();
  } catch (err) {
    alert('Failed to update booking: ' + (err.error || 'Server error'));
  }
}

function render() {
  const root = document.getElementById('content-root');
  if (activeMode === 'book') {
    root.innerHTML = renderBookingForm();
  } else if (activeMode === 'track') {
    root.innerHTML = renderStatusTracker();
  } else {
    root.innerHTML = renderDashboard();
  }
}

// Initial boot
checkAuth().then(u => {
  if (u && (u.role === 'super_admin' || u.role === 'dept_transport')) {
    activeMode = 'dashboard';
    setMode('dashboard');
    loadTransportData().then(() => render());
  } else {
    render();
  }
});