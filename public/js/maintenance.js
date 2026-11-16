let activeMode = 'request';
let maintTab = 'overview';
let S = { overview: null, requests: [], facilities: [], technicians: [] };
let trackingResult = null;
let selectedOrderForAssign = null;

// Expose on window for runtime compatibility
window.setMode = setMode;
window.setMaintTab = setMaintTab;
window.handleMaintSubmit = handleMaintSubmit;

document.addEventListener('DOMContentLoaded', () => {
  const btnReq = document.getElementById('btn-mode-request');
  if (btnReq) btnReq.addEventListener('click', () => setMode('request'));
  const btnTrack = document.getElementById('btn-mode-track');
  if (btnTrack) btnTrack.addEventListener('click', () => setMode('track'));
  const btnDash = document.getElementById('btn-mode-dash');
  if (btnDash) btnDash.addEventListener('click', () => setMode('dashboard'));

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'maint-form') {
      handleMaintSubmit(e);
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

function setMaintTab(tab) {
  maintTab = tab;
  render();
}

async function loadMaintData() {
  try {
    const [ov, reqs, facs, techs] = await Promise.all([
      api('GET', '/api/departments/maintenance/overview').catch(() => null),
      api('GET', '/api/departments/maintenance/requests').catch(() => []),
      api('GET', '/api/departments/maintenance/facilities').catch(() => []),
      api('GET', '/api/departments/maintenance/technicians').catch(() => [])
    ]);
    S.overview = ov;
    S.requests = reqs || [];
    S.facilities = facs || [];
    S.technicians = techs || [];
  } catch (e) { }
}

// 1. Render Public Service Request Form
function renderRequestForm() {
  return `
        <div class="premium-form-card" id="maintBookingCard">
          <div class="premium-form-header">
            <span class="status-tag" style="background:rgba(14,59,67,0.08);color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-size:12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Engineering Dispatch Intake
            </span>
            <h2 class="premium-form-title">Building Maintenance Service Request</h2>
            <p class="premium-form-sub">Commercial building repairs, HVAC servicing, electrical systems, plumbing, structural repairs, and rapid technician dispatch.</p>
          </div>

          <!-- Stepper Progress Bar -->
          <div class="form-stepper" aria-label="Booking Progress">
            <div class="stepper-item active">
              <div class="stepper-bubble">1</div>
              <span class="stepper-label">Property Location</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">2</div>
              <span class="stepper-label">Trade &amp; Priority</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">3</div>
              <span class="stepper-label">Facility Contact</span>
            </div>
            <div class="stepper-item">
              <div class="stepper-bubble">4</div>
              <span class="stepper-label">Work Order</span>
            </div>
          </div>

          <form id="maint-form">
            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3l3-2 3 2v4H9V3z"/></svg>
              <span>1. Property &amp; Facility Location</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Building / Property Name *</label>
                <input name="buildingName" id="buildingName" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Al-Baraka Financial Center or Nile Agro Plant" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Physical Address / Zone *</label>
                <input name="location" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Zone A, Nile Avenue, Khartoum" required>
              </div>
            </div>

            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              <span>2. Maintenance Specifications &amp; Severity</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1.5;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Trade / Specialty Required *</label>
                <select name="serviceType" id="serviceType" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14px;width:100%;background:#fff;" required>
                  <option value="Industrial HVAC & Chiller Systems">Industrial HVAC &amp; Chiller Systems</option>
                  <option value="Commercial High-Voltage Electrical & Generator">Commercial High-Voltage &amp; Generator Backup</option>
                  <option value="Plumbing & Fire Suppression Hydraulics">Plumbing &amp; Fire Suppression Hydraulics</option>
                  <option value="Structural & Roofing Civil Repairs">Structural &amp; Roofing Civil Repairs</option>
                  <option value="Cold-Chain Refrigeration Telemetry">Cold-Chain Refrigeration Telemetry</option>
                  <option value="General Preventative Facility Audit">General Preventative Facility Audit</option>
                </select>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Priority Severity *</label>
                <select name="priority" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14px;width:100%;background:#fff;">
                  <option value="normal">Normal (Routine servicing / 48-72h)</option>
                  <option value="urgent">Urgent / Emergency (Rapid Response / 4-12h)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Detailed Issue Description *</label>
              <textarea name="description" id="description" rows="3" style="border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:12px 14px;font-size:14.5px;width:100%;" placeholder="Describe the fault, symptoms, equipment brand/model, and any urgent safety concerns..." required></textarea>
            </div>

            <div class="form-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              <span>3. Facility Contact Person</span>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Contact Person / Facility Manager *</label>
                <input name="fullName" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="e.g. Eng. Kamal Mansoor" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Official Email</label>
                <input type="email" name="email" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="facility@domain.sd">
              </div>
              <div class="form-group" style="flex:1;">
                <label style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;display:block;">Telephone / Emergency Contact *</label>
                <input name="phone" style="height:48px;border:1.5px solid var(--border-medium);border-radius:var(--radius-md);padding:0 14px;font-size:14.5px;width:100%;" placeholder="Telephone number" required>
              </div>
            </div>

            <div class="form-status-feedback" style="display:none;margin-top:16px;"></div>

            <div style="margin-top:24px;text-align:right;">
              <button type="submit" class="btn-gold" style="min-height:50px;padding:0 36px;font-size:15px;font-weight:700;border:none;border-radius:var(--radius-md);cursor:pointer;width:100%;">
                Submit Maintenance Work Order &rarr;
              </button>
            </div>
          </form>
        </div>
      `;
}

async function handleMaintSubmit(e) {
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
  submitBtn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Submitting Work Order...`;
  statusBox.style.display = 'none';

  const f = Object.fromEntries(new FormData(form));
  try {
    const res = await api('POST', '/api/maintenance/requests', f);
    if (res && res.ok) {
      const card = document.getElementById('maintBookingCard');
      const verifier = f.phone ? f.phone.slice(-4) : (f.email || '');
      if (card) {
        card.innerHTML = `
              <div class="premium-success-card">
                <div class="success-badge-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span class="status-tag" style="background:#ecfdf5;color:#059669;font-weight:700;padding:6px 16px;border-radius:20px;font-size:12.5px;">
                  WORK ORDER REGISTERED &bull; QUEUED FOR TRIAGE
                </span>
                <h3 style="font-size:26px;font-weight:800;color:var(--primary);margin:14px 0 6px;">Maintenance Order Registered!</h3>
                <p style="font-size:14.5px;color:var(--text-secondary);max-width:540px;margin:0 auto 18px;line-height:1.6;">
                  Your facility work order has been logged in the engineering dispatch queue. Use the work order reference below to track technician assignments and on-site completion.
                </p>

                <div class="ref-box">
                  <span class="ref-code" id="maintSuccessRef">${esc(res.id)}</span>
                  <button type="button" class="btn-copy-ref" onclick="navigator.clipboard.writeText('${esc(res.id)}'); this.querySelector('span').innerText='Copied!'; setTimeout(()=>this.querySelector('span').innerText='Copy', 2000);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy</span>
                  </button>
                </div>

                <p style="font-size:13px;color:var(--text-muted);margin:0 0 24px;">
                  Security Verifier: Last 4 digits of phone (<strong>${esc(verifier || '9888')}</strong>)
                </p>

                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                  <button type="button" class="btn-gold" style="padding:12px 28px;font-size:14.5px;border-radius:var(--radius-md);border:none;cursor:pointer;" onclick="setMode('track'); setTimeout(()=>{ const ri=document.getElementById('maint-ref-input'); const vi=document.getElementById('maint-verify-input'); if(ri) ri.value='${esc(res.id)}'; if(vi) vi.value='${esc(verifier)}'; lookupWorkOrder('${esc(res.id)}', '${esc(verifier)}'); }, 80);">
                    Track Work Order Status &rarr;
                  </button>
                  <button type="button" class="btn-glass" style="padding:12px 24px;font-size:14.5px;color:var(--primary);border:1.5px solid var(--border-medium);border-radius:var(--radius-md);cursor:pointer;background:#fff;" onclick="render()">
                    Submit Another Request
                  </button>
                </div>
              </div>
            `;
        card.scrollIntoView({ behavior: 'smooth' });
      }
      showToast(`Work order registered! Reference: ${res.id}`, 'success');
    }
  } catch (err) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#fef2f2';
    statusBox.style.border = '1px solid #fecaca';
    statusBox.style.color = '#991b1b';
    statusBox.innerHTML = `<strong>Order Submission Failed:</strong> ${esc(err.error || err.message || 'Server error')}`;
    showToast(err.error || err.message || 'Maintenance request failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// 2. Render Work Order Tracking
function renderWorkOrderTracker() {
  return `
        <div class="booking-card" style="max-width:760px;margin:32px auto;">
          <h3 style="font-size:22px;font-weight:800;color:var(--primary-dark);margin-bottom:8px;">Facility Work Order Tracking</h3>
          <p style="font-size:13.5px;color:var(--ink-secondary);margin-bottom:20px;">Enter your maintenance order reference plus phone last 4 digits or email for verification.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px;">
            <input id="maint-ref-input" placeholder="Work Order Reference (e.g. MT-2026-K7M4Q9)" style="flex:1;min-width:180px;padding:12px;border:1.5px solid var(--line);border-radius:var(--radius-md);font-size:15px;text-transform:uppercase;">
            <input id="maint-verify-input" placeholder="Phone last 4 digits or Email" style="flex:1;min-width:180px;padding:12px;border:1.5px solid var(--line);border-radius:var(--radius-md);font-size:15px;">
            <button class="btn-primary" onclick="lookupWorkOrder(document.getElementById('maint-ref-input').value, document.getElementById('maint-verify-input').value)">Track &rarr;</button>
          </div>
          <div id="tracking-result-box">
            ${trackingResult ? renderWorkOrderDetails(trackingResult) : '<p style="color:var(--ink-muted);text-align:center;padding:24px;border:1px dashed var(--line);border-radius:var(--radius-md);">Enter a work order reference and verification code above to query engineering status.</p>'}
          </div>
        </div>
      `;
}

async function lookupWorkOrder(ref, verifier) {
  if (!ref) {
    showToast('Please enter your work order reference', 'error');
    return;
  }
  verifier = (verifier || (document.getElementById('maint-verify-input') ? document.getElementById('maint-verify-input').value : '')).trim();
  if (!verifier) {
    showToast('Please enter phone last 4 digits or email for verification', 'error');
    return;
  }
  try {
    const data = await api('GET', '/api/bookings/' + encodeURIComponent(ref.trim().toUpperCase()) + '?verifier=' + encodeURIComponent(verifier));
    trackingResult = data;
    setMode('track');
  } catch (err) {
    alert('Work order not found: ' + (err.error || 'Invalid reference or verification mismatch'));
  }
}

function renderWorkOrderDetails(d) {
  return `
        <div style="border:1px solid var(--line);border-radius:var(--radius-md);padding:20px;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px;">
            <div>
              <span class="status-tag" style="background:rgba(14,59,67,0.08);color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                Maintenance Work Order
              </span>
              <h4 style="font-size:22px;font-weight:800;margin-top:6px;color:var(--primary-dark);font-family:monospace;">${esc(d.id)}</h4>
            </div>
            <div>${statusBadge(d.status)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13.5px;">
            <div><strong>Facility / Client:</strong> ${esc(d.maskedClient || d.client)}</div>
            <div><strong>Location:</strong> ${esc(d.departure || d.a)}</div>
            <div><strong>Target Due:</strong> ${esc(d.travelDate || d.due)}</div>
            <div><strong>Active Checkpoint:</strong> Step ${d.step + 1} of 10</div>
          </div>
        </div>
      `;
}

// 3. Render Staff Dashboard
function renderDashboard() {
  if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'dept_maintenance')) {
    return `
          <div class="booking-card" style="max-width:480px;margin:40px auto;text-align:center;">
            ${LOGO_SVG}
            <h3 style="font-size:20px;font-weight:800;color:var(--primary-dark);margin:14px 0 6px;">Maintenance Staff Console</h3>
            <p style="font-size:13.5px;color:var(--ink-secondary);margin-bottom:20px;">Restricted to certified facilities engineers and maintenance managers.</p>
            <form onsubmit="handleStaffLogin(event)">
              <div class="form-group" style="text-align:left;">
                <label>Staff Username or ID</label>
                <input name="username" value="officer_maintenance" required>
              </div>
              <div class="form-group" style="text-align:left;">
                <label>Security Password</label>
                <input type="password" name="password" value="maint123" required>
              </div>
              <button type="submit" class="btn-primary" style="width:100%;padding:12px;margin-top:8px;">Sign In to Engineering Console</button>
            </form>
          </div>
        `;
  }

  const ov = S.overview || { total: 0, pending: 0, inProgress: 0, completed: 0, facilities: 0, technicians: 0 };

  return `
        <div class="dept-layout">
          <!-- Sidebar -->
          <aside class="dept-sidebar">
            <div class="dept-sidebar-header">
              <span class="dept-badge">Engineering Division</span>
              <div class="dept-name">Facility Maintenance</div>
            </div>

            <div class="dept-user-pill">
              <div class="dept-user-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <div class="dept-user-info">
                <div class="dept-user-name">${esc(currentUser.fullName)}</div>
                <div class="dept-user-role">${esc(currentUser.role)}</div>
              </div>
            </div>

            <ul class="dept-nav-list">
              <li class="dept-nav-item ${maintTab === 'overview' ? 'active' : ''}" onclick="setMaintTab('overview')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  Dashboard Overview
                </span>
              </li>
              <li class="dept-nav-item ${maintTab === 'orders' ? 'active' : ''}" onclick="setMaintTab('orders')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Work Orders Queue
                </span>
                <span class="dept-count-badge">${ov.pending}</span>
              </li>
              <li class="dept-nav-item ${maintTab === 'facilities' ? 'active' : ''}" onclick="setMaintTab('facilities')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
                  Building Assets
                </span>
                <span class="dept-count-badge">${ov.facilities}</span>
              </li>
              <li class="dept-nav-item ${maintTab === 'technicians' ? 'active' : ''}" onclick="setMaintTab('technicians')">
                <span class="dept-nav-label" style="display:inline-flex;align-items:center;gap:8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Technician Roster
                </span>
                <span class="dept-count-badge">${ov.technicians}</span>
              </li>
            </ul>

            <div class="dept-sidebar-footer">
              <button class="btn-outline" style="width:100%;font-size:12.5px;" onclick="logoutUser()">Sign Out</button>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="dept-main">
            ${maintTab === 'overview' ? renderMaintOverview(ov) : ''}
            ${maintTab === 'orders' ? renderOrdersList() : ''}
            ${maintTab === 'facilities' ? renderFacilitiesList() : ''}
            ${maintTab === 'technicians' ? renderTechniciansList() : ''}
          </main>
        </div>

        ${selectedOrderForAssign ? renderOrderModal(selectedOrderForAssign) : ''}
      `;
}

async function handleStaffLogin(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const res = await loginUser(f.username, f.password);
  if (res && res.ok) {
    showToast('Authenticated as ' + res.user.fullName, 'success');
    await loadMaintData();
    render();
  } else {
    alert(res.error || 'Login failed');
  }
}

function renderMaintOverview(ov) {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Facility Maintenance Operations Overview</h2>
            <div class="dept-page-subtitle">Real-time work order status, technician schedules, and property asset maintenance records.</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Work Orders</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
            </div>
            <div class="kpi-val">${ov.total}</div>
            <div class="kpi-sub">Commercial &amp; warehouse repair orders</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Pending Triage</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--warn);">${ov.pending}</div>
            <div class="kpi-sub">Awaiting technician assignment</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Active In-Progress</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--info);">${ov.inProgress}</div>
            <div class="kpi-sub">Under active engineering repair</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Certified Facilities</span>
              <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg></span>
            </div>
            <div class="kpi-val" style="color:var(--primary);">${ov.facilities}</div>
            <div class="kpi-sub">Headquarters, maritime hubs &amp; warehouses</div>
          </div>
        </div>

        <div class="dept-table-wrap">
          <div class="dept-table-toolbar">
            <h4 style="font-size:15px;font-weight:700;color:var(--primary-dark);">Recent Maintenance Work Orders</h4>
            <button class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="setMaintTab('orders')">View All Orders &rarr;</button>
          </div>
          <table class="dept-table">
            <thead>
              <tr><th>Order Ref</th><th>Facility / Property</th><th>Service Type</th><th>Target Due</th><th>Stage</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.requests.slice(0, 5).map(r => `
                <tr>
                  <td><strong>${esc(r.id)}</strong></td>
                  <td>${esc(r.title || r.client)}</td>
                  <td>${esc(r.client)}</td>
                  <td>${esc(r.due)}</td>
                  <td>Step ${r.step + 1} of 10 ${r.done ? '<span class="status-tag approved">Certified</span>' : '<span class="status-tag in-review">Active</span>'}</td>
                  <td><button class="btn-outline" style="padding:4px 10px;font-size:12px;" onclick="openOrderModal('${esc(r.id)}')">Manage</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function renderOrdersList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Facility Work Orders Queue</h2>
            <div class="dept-page-subtitle">Assign certified engineers, record repair milestones, and certify completed work.</div>
          </div>
        </div>

        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead>
              <tr><th>Ref</th><th>Facility / Property</th><th>Client</th><th>Priority</th><th>Due</th><th>Milestone</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.requests.map(r => `
                <tr>
                  <td><strong>${esc(r.id)}</strong></td>
                  <td>${esc(r.title)}</td>
                  <td>${esc(r.client)}</td>
                  <td><span class="status-tag ${r.pri === 'urgent' ? 'rejected' : 'pending'}">${esc(r.pri)}</span></td>
                  <td>${esc(r.due)}</td>
                  <td>Step ${r.step + 1} / 10 ${r.done ? '(Completed)' : ''}</td>
                  <td><button class="btn-primary" style="padding:4px 8px;font-size:11.5px;" onclick="openOrderModal('${esc(r.id)}')">Assign / Step</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function renderFacilitiesList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Building &amp; Facility Assets Registry</h2>
            <div class="dept-page-subtitle">Directory of managed commercial headquarters, marine port terminals, and cold storage warehouses.</div>
          </div>
          <button class="btn-primary" onclick="alert('Register building dialog')">+ Add Facility Asset</button>
        </div>

        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead>
              <tr><th>ID</th><th>Building Name</th><th>Location</th><th>Zone</th><th>Facility Type</th><th>Status</th><th>Notes</th></tr>
            </thead>
            <tbody>
              ${S.facilities.map(f => `
                <tr>
                  <td><strong>${esc(f.id)}</strong></td>
                  <td>${esc(f.building_name)}</td>
                  <td>${esc(f.location)}</td>
                  <td>${esc(f.zone)}</td>
                  <td>${esc(f.facility_type)}</td>
                  <td><span class="status-tag approved">${esc(f.status)}</span></td>
                  <td>${esc(f.notes)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function renderTechniciansList() {
  return `
        <div class="dept-main-header">
          <div>
            <h2 class="dept-page-title">Certified Technicians &amp; Engineering Staff</h2>
            <div class="dept-page-subtitle">In-house mechanical, HVAC, electrical, and hydraulic engineering specialists.</div>
          </div>
          <button class="btn-primary" onclick="alert('Add technician dialog')">+ Add Technician</button>
        </div>

        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead>
              <tr><th>ID</th><th>Technician Name</th><th>Telephone</th><th>Trade Specialty</th><th>Experience</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${S.technicians.map(t => `
                <tr>
                  <td><strong>${esc(t.id)}</strong></td>
                  <td>${esc(t.name)}</td>
                  <td>${esc(t.phone)}</td>
                  <td>${esc(t.specialty)}</td>
                  <td>${esc(t.experience_years)} Years</td>
                  <td><span class="status-tag ${t.status === 'Available' ? 'approved' : 'pending'}">${esc(t.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
}

function openOrderModal(id) {
  const r = S.requests.find(x => x.id === id);
  if (!r) return;
  selectedOrderForAssign = r;
  render();
}

function closeOrderModal() {
  selectedOrderForAssign = null;
  render();
}

function renderOrderModal(r) {
  return `
        <div class="dept-modal-overlay">
          <div class="dept-modal">
            <div class="dept-modal-header">
              <div class="dept-modal-title">Manage Work Order: ${esc(r.id)}</div>
              <button onclick="closeOrderModal()" style="border:none;background:none;font-size:20px;cursor:pointer;">&times;</button>
            </div>
            <form onsubmit="handleSaveOrderUpdate(event, '${esc(r.id)}')">
              <div class="dept-modal-body">
                <div style="background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;">
                  <div><strong>Title:</strong> ${esc(r.title)}</div>
                  <div><strong>Client:</strong> ${esc(r.client)} &bull; Due: ${esc(r.due)}</div>
                  <div style="margin-top:4px;color:var(--ink-secondary);">${esc(r.t)}</div>
                </div>

                <div class="form-group">
                  <label>Assign Qualified Technician</label>
                  <select name="technician">
                    <option value="">-- Select Specialist --</option>
                    ${S.technicians.map(t => `<option value="${esc(t.name)} (${esc(t.specialty)})">${esc(t.name)} - ${esc(t.specialty)}</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label>Work Order Milestone Step</label>
                  <select name="step">
                    <option value="0" ${r.step === 0 ? 'selected' : ''}>Step 1: Request Intake &amp; Triage</option>
                    <option value="2" ${r.step === 2 ? 'selected' : ''}>Step 3: Technician Dispatched On-Site</option>
                    <option value="4" ${r.step === 4 ? 'selected' : ''}>Step 5: Parts Sourced &amp; Repairs Underway</option>
                    <option value="8" ${r.step === 8 ? 'selected' : ''}>Step 9: Testing &amp; Safety Certification</option>
                    <option value="10" ${r.step >= 10 ? 'selected' : ''}>Step 10: Work Order Certified &amp; Closed</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Engineering Service Notes</label>
                  <textarea name="note" rows="3" placeholder="Record diagnostic notes, replacement parts used, or inspection results..."></textarea>
                </div>
              </div>
              <div class="dept-modal-footer">
                <button type="button" class="btn-outline" onclick="closeOrderModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Work Order</button>
              </div>
            </form>
          </div>
        </div>
      `;
}

async function handleSaveOrderUpdate(e, id) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  try {
    await api('PATCH', `/api/departments/maintenance/requests/${encodeURIComponent(id)}`, f);
    showToast('Work order updated successfully', 'success');
    closeOrderModal();
    await loadMaintData();
    render();
  } catch (err) {
    alert('Update failed: ' + (err.error || 'Server error'));
  }
}

function render() {
  const root = document.getElementById('content-root');
  if (activeMode === 'request') {
    root.innerHTML = renderRequestForm();
  } else if (activeMode === 'track') {
    root.innerHTML = renderWorkOrderTracker();
  } else {
    root.innerHTML = renderDashboard();
  }
}

// Initial boot
checkAuth().then(u => {
  if (u && (u.role === 'super_admin' || u.role === 'dept_maintenance')) {
    activeMode = 'dashboard';
    setMode('dashboard');
    loadMaintData().then(() => render());
  } else {
    render();
  }
});