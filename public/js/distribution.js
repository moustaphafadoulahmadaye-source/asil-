let activeMode = 'book';
let customerType = 'company';
let distribTab = 'overview';
let S = { overview: null, cargo: [] };
let trackingResult = null;

// Expose on window for runtime compatibility
window.setMode = setMode;
window.setCustomerType = setCustomerType;
window.setDistribTab = setDistribTab;
window.handleCargoSubmit = handleCargoSubmit;

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
    if (e.target && e.target.id === 'cargo-form') {
      handleCargoSubmit(e);
    }
  });

  render();
});
let selectedCargoForAssign = null;
let uploadedFiles = [];

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

function setDistribTab(tab) {
  distribTab = tab;
  render();
}

async function loadDistribData() {
  try {
    const [ov, cList] = await Promise.all([
      api('GET', '/api/departments/distribution/overview').catch(() => null),
      api('GET', '/api/departments/distribution/cargo').catch(() => [])
    ]);
    S.overview = ov;
    S.cargo = cList || [];
  } catch (e) { }
}

// 1. Render Public Cargo Booking Form
function renderCargoBookingForm() {
  const isCorp = customerType === 'company';
  return `
        <div class="premium-form-card" id="cargoBookingCard">
          <div class="premium-form-header">
            <span class="status-tag" style="background:rgba(14,59,67,0.08);color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-size:12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              Commercial Cargo Intake
            </span>
            <h2 class="premium-form-title">Cargo &amp; Freight Haulage Booking</h2>
            <p class="premium-form-sub">Interstate linehaul, Full-Truckload (FTL), Reefer cold-chain transit, and port container drayage across Sudan.</p>
          </div>

          <!-- Stepper Progress Bar -->
          <div class="form-stepper" aria-label="Booking Progress">
            <div class="stepper-item active">
              <div class="stepper-bubble">1</div>
              <span class="stepper-label">Shipper Account</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">2</div>
              <span class="stepper-label">Cargo Specs</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">3</div>
              <span class="stepper-label">Route &amp; Carrier</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">4</div>
              <span class="stepper-label">Waybill Dispatch</span>
            </div>
          </div>

          <!-- Account Category Toggle Pills -->
          <div class="type-toggle-pills" role="tablist">
            <button type="button" class="type-pill-btn ${isCorp ? 'active' : ''}" id="btnTypeCorporate" data-customer-type="company">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
              Corporate Shipper
            </button>
            <button type="button" class="type-pill-btn ${!isCorp ? 'active' : ''}" id="btnTypeIndividual" data-customer-type="individual">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Individual Consignor
            </button>
          </div>

          <form id="cargo-form">
            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              <span>1. Shipper &amp; Account Details</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">${isCorp ? 'Company Legal Entity Name *' : 'Shipper Full Name *'}</label>
                <input name="fullName" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="${isCorp ? 'e.g. Nile Grains & Agricultural Exports Ltd' : 'e.g. Othman Babiker'}" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Official Email Address *</label>
                <input type="email" name="email" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="logistics@company.sd" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Telephone / WhatsApp *</label>
                <input name="phone" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="+249 ... or local phone" required>
              </div>
            </div>

            ${isCorp ? `
              <div class="form-row" style="background:var(--bg-soft);padding:18px;border-radius:var(--radius-md);margin:14px 0;border:1px dashed var(--border-medium);">
                <div class="form-group" style="flex:1;">
                  <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Supply Chain Contact Person *</label>
                  <input name="contactPerson" style="height:46px;border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;width:100%;" placeholder="e.g. Dr. Fatima Abdelrahman (Logistics VP)" required>
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Commercial Registration (CR)</label>
                  <input name="companyReg" style="height:46px;border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;width:100%;" placeholder="e.g. CR-AGRO-773910">
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Billing LC / PO Number</label>
                  <input name="billingDetails" style="height:46px;border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;width:100%;" placeholder="e.g. AGRO-EXPORT-LC-9901">
                </div>
              </div>
            ` : ''}

            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              <span>2. Cargo Specifications &amp; Handling</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1.5;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Cargo Goods Classification *</label>
                <select name="cargoType" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14px;width:100%;background:#fff;" required>
                  <option value="Industrial Heavy Machinery">Industrial Heavy Machinery &amp; Equipment</option>
                  <option value="Perishable Foodstuff & Cold-Chain">Perishable Foodstuff &amp; Cold-Chain (Reefer)</option>
                  <option value="Agricultural Grains & Sesame">Agricultural Grains, Sesame &amp; Gum Arabic</option>
                  <option value="Hazardous & Chemical Materials">Hazardous &amp; Chemical Materials (Hazmat)</option>
                  <option value="General Packaged Freight">General Packaged Freight &amp; Commercial Cargo</option>
                </select>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Estimated Total Weight *</label>
                <input name="cargoWeight" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. 24 tons or 3,500 kg" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Package Count *</label>
                <input type="number" name="packagesCount" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" min="1" value="1" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:2;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Detailed Description of Goods *</label>
                <input name="cargoDesc" id="cargoDesc" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. 800 heavy sacks of export-grade white sesame seeds on standard pallets" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Special Handling Instructions</label>
                <input name="specialHandling" id="specialHandling" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Tarpaulin Cover, Reefer 15°C, Fragile">
              </div>
            </div>

            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>3. Pickup &amp; Delivery Logistics</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Pickup Location / Silos *</label>
                <input name="pickupLocation" id="pickupLocation" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Al-Gadarif Central Silos &amp; Depot" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Delivery Destination / Port Terminal *</label>
                <input name="deliveryDestination" id="deliveryDestination" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Port Sudan Container Berth 12, Export Wharf" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Preferred Pickup Date *</label>
                <input type="date" name="pickupDate" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" required value="${new Date().toISOString().slice(0, 10)}">
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Target Delivery Date *</label>
                <input type="date" name="deliveryDate" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" required value="${new Date(Date.now() + 864e5 * 3).toISOString().slice(0, 10)}">
              </div>
              <div class="form-group" style="flex:1.5;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Requested Carrier Vehicle *</label>
                <select name="vehiclePreference" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14px;width:100%;background:#fff;" required>
                  <option value="Heavy Freight Flatbed (40 Tons)">Heavy Freight Flatbed (40 Tons Linehaul)</option>
                  <option value="Refrigerated Reefer Truck (-20°C to +15°C)">Refrigerated Reefer Truck (-20°C to +15°C)</option>
                  <option value="Box Cargo Truck (10 Tons Closed)">Box Cargo Truck (10 Tons Closed Body)</option>
                  <option value="Container Chassis Hauler (40ft)">Container Chassis Hauler (40ft Maritime)</option>
                  <option value="Lowbed Heavy Machinery Carrier">Lowbed Heavy Machinery Carrier (60 Tons)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Waybill &amp; Dispatch Instructions</label>
              <textarea name="instructions" rows="2" style="border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:12px 14px;font-size:14.5px;width:100%;" placeholder="e.g. Customs bonded inspection clearance check at Port entrance Gate 4"></textarea>
            </div>

            <div class="form-status-feedback" style="display:none;margin-top:16px;"></div>

            <div style="margin-top:24px;text-align:right;">
              <button type="submit" class="btn-gold" style="min-height:50px;padding:0 36px;font-size:15px;font-weight:700;border:none;border-radius:var(--radius-md);cursor:pointer;width:100%;">
                Register Cargo Consignment Request &rarr;
              </button>
            </div>
          </form>
        </div>
      `;
}

async function handleCargoSubmit(e) {
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
  submitBtn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Processing Consignment...`;
  statusBox.style.display = 'none';

  const f = Object.fromEntries(new FormData(form));
  f.customerType = customerType;
  try {
    const res = await api('POST', '/api/cargo/bookings', f);
    if (res && res.ok) {
      const card = document.getElementById('cargoBookingCard');
      const verifier = f.phone ? f.phone.slice(-4) : (f.email || '');
      if (card) {
        card.innerHTML = `
              <div class="premium-success-card">
                <div class="success-badge-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span class="status-tag" style="background:#ecfdf5;color:#059669;font-weight:700;padding:6px 16px;border-radius:20px;font-size:12.5px;">
                  REGISTERED &bull; QUEUED FOR FREIGHT DISPATCH
                </span>
                <h3 style="font-size:26px;font-weight:800;color:var(--primary);margin:14px 0 6px;">Cargo Consignment Registered!</h3>
                <p style="font-size:14.5px;color:var(--text-secondary);max-width:540px;margin:0 auto 18px;line-height:1.6;">
                  Your freight consignment request has been logged in the active freight dispatch system. Use your tracking reference code below to track carrier haulage and milestone updates.
                </p>

                <div class="ref-box">
                  <span class="ref-code" id="cargoSuccessRef">${esc(res.id)}</span>
                  <button type="button" class="btn-copy-ref" onclick="navigator.clipboard.writeText('${esc(res.id)}'); this.querySelector('span').innerText='Copied!'; setTimeout(()=>this.querySelector('span').innerText='Copy', 2000);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy</span>
                  </button>
                </div>

                <p style="font-size:13px;color:var(--text-muted);margin:0 0 24px;">
                  Security Verifier: Last 4 digits of phone (<strong>${esc(verifier || '9888')}</strong>)
                </p>

                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                  <button type="button" class="btn-gold" style="padding:12px 28px;font-size:14.5px;border-radius:var(--radius-md);border:none;cursor:pointer;" onclick="setMode('track'); setTimeout(()=>{ const ri=document.getElementById('cargo-ref-input'); const vi=document.getElementById('cargo-verify-input'); if(ri) ri.value='${esc(res.id)}'; if(vi) vi.value='${esc(verifier)}'; lookupShipment('${esc(res.id)}', '${esc(verifier)}'); }, 80);">
                    Track Consignment Status &rarr;
                  </button>
                  <button type="button" class="btn-glass" style="padding:12px 24px;font-size:14.5px;color:var(--primary);border:1.5px solid var(--border-medium);border-radius:var(--radius-md);cursor:pointer;background:#fff;" onclick="render()">
                    Register Another Consignment
                  </button>
                </div>
              </div>
            `;
        card.scrollIntoView({ behavior: 'smooth' });
      }
      showToast(`Cargo registered! Reference: ${res.id}`, 'success');
    }
  } catch (err) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#fef2f2';
    statusBox.style.border = '1px solid #fecaca';
    statusBox.style.color = '#991b1b';
    statusBox.innerHTML = `<strong>Consignment Failed:</strong> ${esc(err.error || err.message || 'Server error')}`;
    showToast(err.error || err.message || 'Cargo registration failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// 2. Render Status Tracker View
function renderShipmentTracker() {
  return `
        <div class="booking-card" style="max-width:760px;margin:32px auto;">
          <h3 style="font-size:22px;font-weight:800;color:var(--primary-dark);margin-bottom:8px;">Cargo &amp; Freight Tracking</h3>
          <p style="font-size:13.5px;color:var(--ink-secondary);margin-bottom:20px;">Enter your consignment reference plus your phone's last 4 digits or email for verification.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px;">
            <input id="cargo-ref-input" placeholder="Reference ID (e.g. CR-2026-K7M4Q9)" style="flex:1;min-width:180px;padding:12px;border:1.5px solid var(--line);border-radius:var(--radius-md);font-size:15px;text-transform:uppercase;">
            <input id="cargo-verify-input" placeholder="Phone last 4 digits or Email" style="flex:1;min-width:180px;padding:12px;border:1.5px solid var(--line);border-radius:var(--radius-md);font-size:15px;">
            <button class="btn-primary" onclick="lookupShipment(document.getElementById('cargo-ref-input').value, document.getElementById('cargo-verify-input').value)">Track &rarr;</button>
          </div>
          <div id="tracking-result-box">
            ${trackingResult ? renderCargoTrackingDetails(trackingResult) : '<p style="color:var(--ink-muted);text-align:center;padding:24px;border:1px dashed var(--line);border-radius:var(--radius-md);">Enter a consignment reference and verification code above to query live telemetry.</p>'}
          </div>
        </div>
      `;
}

async function lookupShipment(ref, verifier) {
  if (!ref) {
    showToast('Please enter your consignment reference', 'error');
    return;
  }
  verifier = (verifier || (document.getElementById('cargo-verify-input') ? document.getElementById('cargo-verify-input').value : '')).trim();
  if (!verifier) {
    showToast('Please enter phone last 4 digits or email for verification', 'error');
    return;
  }
  try {
    const data = await api('GET', '/api/bookings/' + encodeURIComponent(ref.trim().toUpperCase()) + '?verifier=' + encodeURIComponent(verifier));
    trackingResult = data;
    setMode('track');
  } catch (err) {
    alert('Consignment not found: ' + (err.error || 'Invalid reference or verification mismatch'));
  }
}

function renderCargoTrackingDetails(d) {
  return `
        <div style="border:1px solid var(--line);border-radius:var(--radius-md);padding:20px;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px;">
            <div>
              <span class="status-tag" style="background:rgba(14,59,67,0.08);color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                Cargo Transportation
              </span>
              <h4 style="font-size:22px;font-weight:800;margin-top:6px;color:var(--primary-dark);font-family:monospace;">${esc(d.id)}</h4>
            </div>
            <div>${statusBadge(d.status)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13.5px;">
            <div><strong>Shipper / Account:</strong> ${esc(d.maskedClient)}</div>
            <div><strong>Cargo Type:</strong> ${esc(d.cargoType)}</div>
            <div><strong>Total Payload:</strong> ${esc(d.cargoWeight)} (${esc(d.packagesCount)} pkgs)</div>
            <div><strong>Carrier Requested:</strong> ${esc(d.vehiclePreference)}</div>
            <div><strong>Origin Pickup:</strong> ${esc(d.pickupLocation || d.departure)}</div>
            <div><strong>Target Terminal:</strong> ${esc(d.deliveryDestination || d.destination)}</div>
            ${d.specialHandling ? `<div style="grid-column:1/-1;color:#b91c1c;"><strong>Special Handling:</strong> ⚠️ ${esc(d.specialHandling)}</div>` : ''}
            ${d.assignedVehicle ? `<div style="grid-column:1/-1;background:var(--ok-soft);padding:10px;border-radius:6px;border:1px solid var(--ok-border);"><strong>Allocated Carrier:</strong> ${esc(d.assignedVehicle)} &bull; Driver: ${esc(d.assignedDriver || 'Assigned Crew')}</div>` : ''}
          </div>
        </div>
      `;
}

// 3. Render Staff Dashboard
function renderDashboard() {
  if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'dept_distribution')) {
    return `
          <div class="booking-card" style="max-width:480px;margin:40px auto;text-align:center;">
            ${LOGO_SVG}
            <h3 style="font-size:20px;font-weight:800;color:var(--primary-dark);margin:14px 0 6px;">Distribution Staff Console</h3>
            <p style="font-size:13.5px;color:var(--ink-secondary);margin-bottom:20px;">Restricted to certified cargo dispatchers and freight coordinators.</p>
            <form onsubmit="handleStaffLogin(event)">
              <div class="form-group" style="text-align:left;">
                <label>Staff Username or ID</label>
                <input name="username" value="officer_distribution" required>
              </div>
              <div class="form-group" style="text-align:left;">
                <label>Security Password</label>
                <input type="password" name="password" value="distrib123" required>
              </div>
              <button type="submit" class="btn-primary" style="width:100%;padding:12px;margin-top:8px;">Sign In to Freight Console</button>
            </form>
          </div>
        `;
  }

  const ov = S.overview || { total: 0, pending: 0, inTransit: 0, delivered: 0, carriers: 0 };

  return `
        <div class="dept-layout">
          <!-- Sidebar -->
          <aside class="dept-sidebar">
            <div class="dept-sidebar-header">
              <span class="dept-badge">Distribution Division</span>
              <div class="dept-name">Freight Control</div>
            </div>

            <div class="dept-user-pill">
              <div class="dept-user-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              </div>
              <div class="dept-user-info">
                <div class="dept-user-name">${esc(currentUser.fullName)}</div>
                <div class="dept-user-role">${esc(currentUser.role)}</div>
              </div>
            </div>

            <ul class="dept-nav-list">
              <li class="dept-nav-item ${distribTab === 'overview' ? 'active' : ''}" onclick="setDistribTab('overview')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  Dashboard Overview
                </span>
              </li>
              <li class="dept-nav-item ${distribTab === 'consignments' ? 'active' : ''}" onclick="setDistribTab('consignments')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  Cargo Consignments
                </span>
                <span class="dept-count-badge">${ov.pending}</span>
              </li>
              <li class="dept-nav-item ${distribTab === 'intransit' ? 'active' : ''}" onclick="setDistribTab('intransit')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  In-Transit Telemetry
                </span>
                <span class="dept-count-badge">${ov.inTransit}</span>
              </li>
            </ul>

            <div class="dept-sidebar-footer">
              <button class="btn-outline" style="width:100%;font-size:12.5px;" onclick="logoutUser()">Sign Out</button>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="dept-main">
            ${distribTab === 'overview' ? renderDistribOverview(ov) : ''}
            ${distribTab === 'consignments' || distribTab === 'intransit' ? renderCargoList() : ''}
          </main>
        </div>

        ${selectedCargoForAssign ? renderCargoModal(selectedCargoForAssign) : ''}
      `;
}

async function handleStaffLogin(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const res = await loginUser(f.username, f.password);
  if (res && res.ok) {
    showToast('Authenticated as ' + res.user.fullName, 'success');
    await loadDistribData();
    render();
  } else {
    alert(res.error || 'Login failed');
  }
}

function renderDistribOverview(ov) {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Freight &amp; Cargo Distribution Overview</h2>
            <div class="dept-page-subtitle">Real-time status of commercial consignments, heavy flatbeds, and reefer shipments.</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Cargo Consignments</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></span>
            </div>
            <div class="kpi-val">${ov.total}</div>
            <div class="kpi-sub">Commercial &amp; individual shipments logged</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Pending Dispatch</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--warn);">${ov.pending}</div>
            <div class="kpi-sub">Awaiting manifest clearance &amp; carrier booking</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">In-Transit Corridors</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--info);">${ov.inTransit}</div>
            <div class="kpi-sub">En route with scheduled transit updates</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Delivered &amp; Signed</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--ok);">${ov.delivered}</div>
            <div class="kpi-sub">Proof of Delivery (POD) archived</div>
          </div>
        </div>

        <div class="dept-table-wrap">
          <div class="dept-table-toolbar">
            <h4 style="font-size:15px;font-weight:700;color:var(--primary-dark);">Recent Commercial Freight Consignments</h4>
            <button class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="setDistribTab('consignments')">View All Consignments &rarr;</button>
          </div>
          <table class="dept-table">
            <thead>
              <tr><th>Ref</th><th>Shipper</th><th>Goods Type</th><th>Weight</th><th>Pickup &rarr; Destination</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.cargo.slice(0, 5).map(c => `
                <tr>
                  <td><strong>${esc(c.id)}</strong></td>
                  <td>${esc(c.companyName || c.fullName)}</td>
                  <td>${esc(c.cargoType)}</td>
                  <td>${esc(c.cargoWeight)}</td>
                  <td>${esc(c.pickupLocation)} &rarr; ${esc(c.deliveryDestination)}</td>
                  <td>${statusBadge(c.status)}</td>
                  <td><button class="btn-outline" style="padding:4px 10px;font-size:12px;" onclick="openCargoModal('${esc(c.id)}')">Manage</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function renderCargoList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Commercial Cargo Consignments Queue</h2>
            <div class="dept-page-subtitle">Schedule pickups, allocate heavy carriers, update GPS telemetry checkpoints, and sign Proof of Delivery.</div>
          </div>
        </div>

        <div class="dept-table-wrap">
          <div class="dept-table-toolbar">
            <div class="dept-table-search"><input placeholder="Search cargo..." oninput="filterCargo(this.value)"></div>
            <div>Total: <strong>${S.cargo.length}</strong> consignments</div>
          </div>
          <table class="dept-table" id="cargo-table">
            <thead>
              <tr><th>Ref</th><th>Shipper</th><th>Cargo Classification</th><th>Payload</th><th>Route</th><th>Dates</th><th>Carrier Asset</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.cargo.map(c => `
                <tr>
                  <td><strong>${esc(c.id)}</strong></td>
                  <td>${esc(c.companyName || c.fullName)}</td>
                  <td>${esc(c.cargoType)}</td>
                  <td>${esc(c.cargoWeight)} (${esc(c.packagesCount)} pkgs)</td>
                  <td>${esc(c.pickupLocation)} &rarr; ${esc(c.deliveryDestination)}</td>
                  <td>${esc(c.pickupDate)} to ${esc(c.deliveryDate)}</td>
                  <td>${esc(c.assignedVehicle || '–')}</td>
                  <td>${statusBadge(c.status)}</td>
                  <td><button class="btn-primary" style="padding:4px 8px;font-size:11.5px;" onclick="openCargoModal('${esc(c.id)}')">Dispatch / Update</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function openCargoModal(id) {
  const c = S.cargo.find(x => x.id === id);
  if (!c) return;
  selectedCargoForAssign = c;
  render();
}

function closeCargoModal() {
  selectedCargoForAssign = null;
  render();
}

function renderCargoModal(c) {
  return `
        <div class="dept-modal-overlay">
          <div class="dept-modal">
            <div class="dept-modal-header">
              <div class="dept-modal-title">Manage Freight Consignment: ${esc(c.id)}</div>
              <button onclick="closeCargoModal()" style="border:none;background:none;font-size:20px;cursor:pointer;">&times;</button>
            </div>
            <form onsubmit="handleSaveCargoUpdate(event, '${esc(c.id)}')">
              <div class="dept-modal-body">
                <div style="background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;">
                  <div><strong>Shipper:</strong> ${esc(c.companyName || c.fullName)} &bull; ${esc(c.phone)}</div>
                  <div><strong>Goods:</strong> ${esc(c.cargoType)} (${esc(c.cargoWeight)}, ${c.packagesCount} packages)</div>
                  <div><strong>Route:</strong> ${esc(c.pickupLocation)} &rarr; ${esc(c.deliveryDestination)}</div>
                  ${c.specialHandling ? `<div style="color:#b91c1c;margin-top:4px;"><strong>Special Handling:</strong> ⚠️ ${esc(c.specialHandling)}</div>` : ''}
                </div>

                <div class="form-group">
                  <label>Consignment Operational Status</label>
                  <select name="status">
                    <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending (Intake Review)</option>
                    <option value="Approved" ${c.status === 'Approved' ? 'selected' : ''}>Approved (Staged for Pickup)</option>
                    <option value="Pickup Scheduled" ${c.status === 'Pickup Scheduled' ? 'selected' : ''}>Pickup Scheduled</option>
                    <option value="Picked Up" ${c.status === 'Picked Up' ? 'selected' : ''}>Picked Up &amp; Loaded</option>
                    <option value="In Transit" ${c.status === 'In Transit' ? 'selected' : ''}>In Transit (GPS Telemetry Active)</option>
                    <option value="Out for Delivery" ${c.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery (Destination Hub)</option>
                    <option value="Delivered" ${c.status === 'Delivered' ? 'selected' : ''}>Delivered &amp; Signed (POD)</option>
                    <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="Cancelled" ${c.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Allocated Freight Vehicle / Carrier</label>
                  <input name="assignedVehicle" value="${esc(c.assignedVehicle || '')}" placeholder="e.g. Scania R500 Flatbed Heavy Carrier (KRT-7788-H)">
                </div>

                <div class="form-group">
                  <label>Assigned Certified Driver / Escort</label>
                  <input name="assignedDriver" value="${esc(c.assignedDriver || '')}" placeholder="e.g. Senior Driver / Escort">
                </div>

                <div class="form-group">
                  <label>Internal Consignment Notes</label>
                  <textarea name="internalNotes" rows="3" placeholder="Add weighbridge station records or port customs clearance notes...">${esc(c.internalNotes || '')}</textarea>
                </div>
              </div>
              <div class="dept-modal-footer">
                <button type="button" class="btn-outline" onclick="closeCargoModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Consignment &amp; Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      `;
}

async function handleSaveCargoUpdate(e, id) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  try {
    await api('PATCH', `/api/departments/distribution/cargo/${encodeURIComponent(id)}`, f);
    showToast('Consignment updated successfully', 'success');
    closeCargoModal();
    await loadDistribData();
    render();
  } catch (err) {
    alert('Failed to update consignment: ' + (err.error || 'Server error'));
  }
}

function render() {
  const root = document.getElementById('content-root');
  if (activeMode === 'book') {
    root.innerHTML = renderCargoBookingForm();
  } else if (activeMode === 'track') {
    root.innerHTML = renderShipmentTracker();
  } else {
    root.innerHTML = renderDashboard();
  }
}

// Initial boot
checkAuth().then(u => {
  if (u && (u.role === 'super_admin' || u.role === 'dept_distribution')) {
    activeMode = 'dashboard';
    setMode('dashboard');
    loadDistribData().then(() => render());
  } else {
    render();
  }
});