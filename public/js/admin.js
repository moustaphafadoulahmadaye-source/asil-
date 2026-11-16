/**
 * ASIL Logistics - Operations Command & Administration Console (admin.js)
 * Fully CSP-compliant (no inline event handlers), RBAC-secured operations manager.
 */

(function () {
  'use strict';

  let bookingsCache = [];
  let vehiclesCache = [];
  let driversCache = [];
  let inquiriesCache = [];
  let auditLogsCache = [];
  let currentAdmin = null;
  let activeInquiry = null;

  // Helper: Escape HTML strings to prevent XSS
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Helper: Format Dates
  function fmtDate(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return String(d);
    }
  }

  function fmtTime(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  // Helper: Render Status Badge
  function statusBadge(s) {
    const val = (s || 'Pending').toLowerCase();
    let cls = 'badge-neutral';
    if (val.includes('approved') || val.includes('completed') || val.includes('delivered') || val.includes('active')) {
      cls = 'badge-success';
    } else if (val.includes('progress') || val.includes('transit') || val.includes('pickup') || val.includes('scheduled')) {
      cls = 'badge-info';
    } else if (val.includes('pending') || val.includes('review')) {
      cls = 'badge-warning';
    } else if (val.includes('rejected') || val.includes('cancelled') || val.includes('failed')) {
      cls = 'badge-danger';
    }
    return `<span class="badge ${cls}">${esc(s || 'Pending')}</span>`;
  }

  // ==========================================
  // 1. AUTHENTICATION & ACCESS CONTROL GUARD
  // ==========================================
  async function checkAdminAuth() {
    try {
      const user = await checkAuth();
      if (user && user.role === 'super_admin') {
        currentAdmin = user;
        const gate = document.getElementById('adminAuthGate');
        const main = document.getElementById('adminMainContent');
        const dName = document.getElementById('admDisplayName');
        const avatar = document.getElementById('admAvatar');
        if (gate) gate.style.display = 'none';
        if (main) main.style.display = 'block';
        if (dName) dName.innerText = user.fullName || user.username || 'Super Admin';
        if (avatar) avatar.innerText = (user.username || 'SA').slice(0, 2).toUpperCase();
        loadAllAdminData();
      } else {
        const gate = document.getElementById('adminAuthGate');
        const main = document.getElementById('adminMainContent');
        if (gate) gate.style.display = 'block';
        if (main) main.style.display = 'none';
      }
    } catch (err) {
      console.warn('Admin auth check failed:', err);
      const gate = document.getElementById('adminAuthGate');
      const main = document.getElementById('adminMainContent');
      if (gate) gate.style.display = 'block';
      if (main) main.style.display = 'none';
    }
  }

  async function submitAdminLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = (document.getElementById('admUser')?.value || '').trim();
    const p = document.getElementById('admPass')?.value || '';
    const btn = document.getElementById('btnAdminSignIn');

    if (!u || !p) {
      if (typeof showToast === 'function') showToast('Please enter both administrator username and password.', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Authenticating...';
    }

    try {
      const res = await loginUser(u, p);
      if (!res || !res.ok || !res.user) {
        const errMsg = (res && res.error) ? res.error : 'Invalid administrator credentials. Please check your username and password.';
        if (typeof showToast === 'function') showToast(errMsg, 'error');
        return;
      }
      if (res.user.role !== 'super_admin') {
        const roleMsg = 'Account authenticated as "' + (res.user.role || 'standard') + '", but Super Administrator role is required for operations command.';
        if (typeof showToast === 'function') showToast(roleMsg, 'error');
        return;
      }
      if (typeof showToast === 'function') showToast('Super Administrator authenticated successfully! Loading command console...', 'success');
      await checkAdminAuth();
    } catch (err) {
      const msg = err.message || 'Authentication error. Please verify server connection.';
      if (typeof showToast === 'function') showToast(msg, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Authenticate \u2192';
      }
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (e) {}
    window.location.reload();
  }

  // ==========================================
  // 2. TAB NAVIGATION
  // ==========================================
  function showTab(tab) {
    const tabs = ['overview', 'bookings', 'fleet', 'customers', 'inquiries', 'users', 'reports', 'audit'];
    tabs.forEach(t => {
      const el = document.getElementById('tab-' + t);
      const btn = document.getElementById('btn-tab-' + t);
      if (el) el.style.display = t === tab ? 'block' : 'none';
      if (btn) btn.classList.toggle('active', t === tab);
    });

    if (tab === 'inquiries') loadInquiries();
    if (tab === 'reports') loadReportsData();
    if (tab === 'audit') loadAuditLogs();
    if (tab === 'users') loadRbacUsers();
    if (tab === 'customers') loadCustomerRegistries();
  }

  // ==========================================
  // 3. DATA LOADING & KPI DASHBOARD
  // ==========================================
  async function loadAllAdminData() {
    try {
      loadInquiries().catch(() => {});
      const [stats, bookings, vehicles, drivers] = await Promise.all([
        api('/api/admin/stats'),
        api('/api/admin/bookings'),
        api('/api/admin/fleet/vehicles'),
        api('/api/admin/fleet/drivers')
      ]);

      bookingsCache = bookings || [];
      vehiclesCache = vehicles || [];
      driversCache = drivers || [];

      // Populate Overview KPIs
      const elTotal = document.getElementById('ovTotalBookings');
      const elPending = document.getElementById('ovPending');
      const elPass = document.getElementById('ovPassenger');
      const elCargo = document.getElementById('ovCargo');
      const elComp = document.getElementById('ovCompleted');
      const elCorp = document.getElementById('ovCorporate');

      if (elTotal) elTotal.innerText = stats.totalBookings || bookingsCache.length;
      if (elPending) elPending.innerText = stats.pendingBookings || 0;
      if (elPass) elPass.innerText = stats.passengerBookings || 0;
      if (elCargo) elCargo.innerText = stats.cargoBookings || 0;
      if (elComp) elComp.innerText = stats.completedBookings || 0;
      if (elCorp) elCorp.innerText = stats.corporateClients || 0;

      // Update Sidebar pending badge
      const pendingCount = bookingsCache.filter(b => b.status === 'Pending').length;
      const sideBadge = document.getElementById('sidePendingCount');
      if (sideBadge) {
        if (pendingCount > 0) {
          sideBadge.innerText = pendingCount;
          sideBadge.style.display = 'inline-block';
        } else {
          sideBadge.style.display = 'none';
        }
      }

      const sumV = document.getElementById('sumVehicles');
      const sumD = document.getElementById('sumDrivers');
      const sumC = document.getElementById('sumCargoVol');
      const sumT = document.getElementById('sumInTransit');
      const sumCo = document.getElementById('sumCorpOnb');

      if (sumV) sumV.innerText = vehiclesCache.length;
      if (sumD) sumD.innerText = driversCache.length;
      if (sumC) sumC.innerText = stats.cargoBookings || 0;
      if (sumT) sumT.innerText = stats.inProgressBookings || 0;
      if (sumCo) sumCo.innerText = stats.corporateClients || 0;

      renderOverviewQueue(bookingsCache);
      renderUniversalBookings(bookingsCache);
      renderFleetAndDrivers(vehiclesCache, driversCache);
    } catch (e) {
      if (typeof showToast === 'function') showToast('Error loading administrative data: ' + e.message, 'error');
    }
  }

  function renderOverviewQueue(list) {
    const pendingList = (list || []).filter(b => b.status === 'Pending').slice(0, 8);
    const body = document.getElementById('overviewQueueBody');
    if (!body) return;

    if (pendingList.length === 0) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:28px;color:#059669;font-weight:600;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> All requests reviewed! No pending bookings in queue.</td></tr>';
      return;
    }

    body.innerHTML = pendingList.map(b => {
      const isCargo = b.booking_category === 'cargo' || b.id.startsWith('CR-');
      const catBadge = isCargo 
        ? '<span class="badge badge-info"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px;"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> Cargo</span>' 
        : '<span class="badge badge-neutral"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px;"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Passenger</span>';

      return `
        <tr>
          <td><code class="ref-tag">${esc(b.id)}</code></td>
          <td>${catBadge}</td>
          <td><strong>${esc(b.fullName || b.companyName)}</strong></td>
          <td>${esc(b.departure)}</td>
          <td>${esc(b.destination)}</td>
          <td>${statusBadge(b.status)}</td>
          <td><button class="btn-primary btn-sm" data-dispatch-id="${esc(b.id)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Review &amp; Dispatch</button></td>
        </tr>
      `;
    }).join('');
  }

  function renderUniversalBookings(list) {
    const body = document.getElementById('allBookingsBody');
    if (!body) return;

    if (!list || list.length === 0) {
      body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:28px;color:#94a3b8;">No bookings match filter.</td></tr>';
      return;
    }

    body.innerHTML = list.map(b => {
      const isCargo = b.booking_category === 'cargo' || b.id.startsWith('CR-');
      const catBadge = isCargo 
        ? '<span class="badge badge-info"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px;"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> Cargo</span>' 
        : '<span class="badge badge-neutral"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px;"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Passenger</span>';

      return `
        <tr>
          <td><code class="ref-tag">${esc(b.id)}</code></td>
          <td>${catBadge}</td>
          <td>${b.customerType === 'company' ? '<span class="badge badge-info">Corporate</span>' : '<span class="badge badge-neutral">Individual</span>'}</td>
          <td><strong>${esc(b.fullName || b.companyName)}</strong><br><small style="color:var(--text-muted);">${esc(b.phone)}</small></td>
          <td>${esc(b.departure)} &rarr; ${esc(b.destination)}</td>
          <td><small>${esc(b.travelDate || 'N/A')}</small></td>
          <td><small>${b.assignedVehicle ? `Veh: <strong>${esc(b.assignedVehicle)}</strong>` : 'Unassigned'}<br>${b.assignedDriver ? `Drv: ${esc(b.assignedDriver)}` : ''}</small></td>
          <td>${statusBadge(b.status)}</td>
          <td>
            <button class="btn-primary btn-sm" data-dispatch-id="${esc(b.id)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Manage</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterBookings() {
    const q = (document.getElementById('bookingSearch')?.value || '').toLowerCase();
    const cat = document.getElementById('bookingCatFilter')?.value || 'all';
    const ctype = document.getElementById('bookingCustTypeFilter')?.value || 'all';
    const stat = document.getElementById('bookingStatusFilter')?.value || 'all';

    const filtered = bookingsCache.filter(b => {
      const isCargo = b.booking_category === 'cargo' || b.id.startsWith('CR-');
      const matchesQ = (b.id + ' ' + (b.fullName || '') + ' ' + (b.companyName || '') + ' ' + (b.phone || '') + ' ' + (b.departure || '') + ' ' + (b.destination || '')).toLowerCase().includes(q);
      const matchesCat = cat === 'all' || (cat === 'cargo' ? isCargo : !isCargo);
      const matchesType = ctype === 'all' || (b.customerType || 'individual') === ctype;
      const matchesStat = stat === 'all' || b.status === stat;
      return matchesQ && matchesCat && matchesType && matchesStat;
    });

    renderUniversalBookings(filtered);
  }

  function renderFleetAndDrivers(vehicles, drivers) {
    const vBody = document.getElementById('fleetVehiclesBody');
    if (vBody) {
      vBody.innerHTML = (vehicles || []).map(v => `
        <tr>
          <td><strong>${esc(v.id)}</strong></td>
          <td><strong>${esc(v.plate)}</strong></td>
          <td>${esc(v.model)}</td>
          <td>${esc(v.category)}</td>
          <td>${esc(v.capacity)}</td>
          <td>${esc(v.assigned_driver || 'None')}</td>
          <td>${statusBadge(v.status)}</td>
        </tr>
      `).join('');
    }

    const dBody = document.getElementById('fleetDriversBody');
    if (dBody) {
      dBody.innerHTML = (drivers || []).map(d => `
        <tr>
          <td><strong>${esc(d.id)}</strong></td>
          <td><strong>${esc(d.name)}</strong></td>
          <td>${esc(d.phone)}<br><small style="color:var(--text-muted);">${esc(d.email || '')}</small></td>
          <td>${esc(d.category)}</td>
          <td>${esc(d.license_type || 'Commercial Class A')}</td>
          <td>${esc(d.assigned_vehicle || 'None')}</td>
          <td>${statusBadge(d.status)}</td>
        </tr>
      `).join('');
    }
  }

  // ==========================================
  // 4. DISPATCH MODAL & WORKFLOW
  // ==========================================
  function openDispatchModal(id) {
    const b = bookingsCache.find(x => x.id === id);
    if (!b) return;

    const hiddenId = document.getElementById('mdlHiddenId');
    const bId = document.getElementById('mdlBookingId');
    const status = document.getElementById('mdlStatus');
    const notes = document.getElementById('mdlNotes');
    const vSel = document.getElementById('mdlVehicle');
    const dSel = document.getElementById('mdlDriver');
    const details = document.getElementById('mdlBookingDetails');

    if (hiddenId) hiddenId.value = b.id;
    if (bId) bId.innerText = b.id;
    if (status) status.value = b.status || 'Pending';
    if (notes) notes.value = b.internalNotes || '';

    if (vSel) {
      vSel.innerHTML = '<option value="">-- No Vehicle Assigned --</option>' + vehiclesCache.map(v => `
        <option value="${esc(v.plate)} - ${esc(v.model)}" ${b.assignedVehicle && b.assignedVehicle.includes(v.plate) ? 'selected' : ''}>${esc(v.plate)} (${esc(v.model)} - ${esc(v.category)})</option>
      `).join('');
    }

    if (dSel) {
      dSel.innerHTML = '<option value="">-- No Driver Assigned --</option>' + driversCache.map(d => `
        <option value="${esc(d.name)}" ${b.assignedDriver === d.name ? 'selected' : ''}>${esc(d.name)} (${esc(d.category)} - ${esc(d.phone)})</option>
      `).join('');
    }

    if (details) {
      const isCargo = b.booking_category === 'cargo' || b.id.startsWith('CR-');
      details.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><strong>Category:</strong> ${isCargo ? 'Cargo / Freight' : 'Passenger Transit'}</div>
          <div><strong>Client Entity:</strong> ${esc(b.fullName || b.companyName)} (${esc(b.customerType || 'individual')})</div>
          <div><strong>Route:</strong> ${esc(b.departure)} &rarr; ${esc(b.destination)}</div>
          <div><strong>Travel / Delivery Date:</strong> ${esc(b.travelDate || b.deliveryDate || 'N/A')}</div>
          <div><strong>Phone &amp; Email:</strong> ${esc(b.phone)} / ${esc(b.email)}</div>
          <div><strong>Vehicle Preference:</strong> ${esc(b.vehiclePreference || 'Standard')}</div>
        </div>
      `;
    }

    const modal = document.getElementById('dispatchModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeDispatchModal() {
    const modal = document.getElementById('dispatchModal');
    if (modal) modal.style.display = 'none';
  }

  async function saveBookingDispatch(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('mdlHiddenId')?.value;
    const status = document.getElementById('mdlStatus')?.value;
    const assignedVehicle = document.getElementById('mdlVehicle')?.value;
    const assignedDriver = document.getElementById('mdlDriver')?.value;
    const internalNotes = (document.getElementById('mdlNotes')?.value || '').trim();

    const btn = document.getElementById('btnSaveDispatch');
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Saving...';
    }

    try {
      await api('/api/admin/bookings/' + id, {
        method: 'PATCH',
        body: { status, assignedVehicle, assignedDriver, internalNotes }
      });
      if (typeof showToast === 'function') showToast('Booking updated successfully: ' + id, 'success');
      closeDispatchModal();
      loadAllAdminData();
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Failed to update booking', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Save Dispatch Changes';
      }
    }
  }

  // ==========================================
  // 5. MODAL HELPERS & ENTITY CREATION
  // ==========================================
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function openAddVehicleModal() { openModal('addVehicleModal'); }
  function openAddDriverModal() { openModal('addDriverModal'); }
  function openAddUserModal() { openModal('addUserModal'); }

  async function saveNewVehicle(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await api('/api/admin/fleet/vehicles', {
        method: 'POST',
        body: {
          plate: (document.getElementById('vPlate')?.value || '').trim(),
          model: (document.getElementById('vModel')?.value || '').trim(),
          category: document.getElementById('vCategory')?.value,
          capacity: (document.getElementById('vCapacity')?.value || '').trim()
        }
      });
      if (typeof showToast === 'function') showToast('Vehicle registered successfully', 'success');
      closeModal('addVehicleModal');
      document.getElementById('addVehicleForm')?.reset();
      loadAllAdminData();
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Error creating vehicle', 'error');
    }
  }

  async function saveNewDriver(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await api('/api/admin/fleet/drivers', {
        method: 'POST',
        body: {
          name: (document.getElementById('dName')?.value || '').trim(),
          phone: (document.getElementById('dPhone')?.value || '').trim(),
          category: document.getElementById('dCategory')?.value,
          licenseType: (document.getElementById('dLicense')?.value || '').trim()
        }
      });
      if (typeof showToast === 'function') showToast('Driver registered successfully', 'success');
      closeModal('addDriverModal');
      document.getElementById('addDriverForm')?.reset();
      loadAllAdminData();
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Error creating driver', 'error');
    }
  }

  function syncDepartmentField() {
    const r = document.getElementById('uRole')?.value;
    const deptMap = {
      dept_transport: 'transport',
      dept_distribution: 'distribution',
      dept_maintenance: 'maintenance',
      dept_onboarding: 'onboarding',
      super_admin: 'all'
    };
    const deptEl = document.getElementById('uDepartment');
    if (deptEl) deptEl.value = deptMap[r] || '';
  }

  async function saveNewUser(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: {
          fullName: (document.getElementById('uFullName')?.value || '').trim(),
          username: (document.getElementById('uUsername')?.value || '').trim(),
          email: (document.getElementById('uEmail')?.value || '').trim(),
          phone: (document.getElementById('uPhone')?.value || '').trim(),
          password: document.getElementById('uPassword')?.value || '',
          role: document.getElementById('uRole')?.value,
          department: document.getElementById('uDepartment')?.value
        }
      });
      if (typeof showToast === 'function') showToast('Staff account created successfully', 'success');
      closeModal('addUserModal');
      document.getElementById('addUserForm')?.reset();
      loadRbacUsers();
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Error creating staff user', 'error');
    }
  }

  async function loadRbacUsers() {
    try {
      const users = await api('/api/admin/users');
      const body = document.getElementById('rbacUsersBody');
      if (body) {
        body.innerHTML = (users || []).map(u => `
          <tr>
            <td><strong>${esc(u.id)}</strong></td>
            <td><strong>${esc(u.username)}</strong></td>
            <td>${esc(u.full_name)}</td>
            <td><small>${esc(u.email)}<br>${esc(u.phone || 'N/A')}</small></td>
            <td><span class="badge badge-info">${esc(u.role)}</span></td>
            <td><strong>${esc(u.department || 'All')}</strong></td>
            <td>${statusBadge(u.status)}</td>
            <td>
              ${u.id !== 'USR-001' ? `<button class="btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" data-delete-user-id="${esc(u.id)}">Delete</button>` : '<small style="color:var(--text-muted);">Root</small>'}
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('Error loading users: ' + e.message, 'error');
    }
  }

  async function deleteStaffUser(id) {
    if (!confirm('Are you sure you want to remove staff user ' + id + '?')) return;
    try {
      await api('/api/admin/users/' + id, { method: 'DELETE' });
      if (typeof showToast === 'function') showToast('User deleted', 'success');
      loadRbacUsers();
    } catch (e) {
      if (typeof showToast === 'function') showToast(e.message, 'error');
    }
  }

  async function loadCustomerRegistries() {
    try {
      const [ind, corp] = await Promise.all([
        api('/api/admin/customers/individual'),
        api('/api/admin/customers/corporate')
      ]);

      const corpBody = document.getElementById('corporateCustBody');
      if (corpBody) {
        corpBody.innerHTML = (corp || []).map(c => `
          <tr>
            <td><strong>${esc(c.company_name)}</strong></td>
            <td>${esc(c.contact_person || c.full_name)}</td>
            <td><small>${esc(c.email)}<br>${esc(c.phone)}</small></td>
            <td><strong>${c.total_bookings || 0}</strong></td>
            <td><small>${fmtDate(c.last_active)}</small></td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No corporate customers yet.</td></tr>';
      }

      const indBody = document.getElementById('individualCustBody');
      if (indBody) {
        indBody.innerHTML = (ind || []).map(i => `
          <tr>
            <td><strong>${esc(i.full_name)}</strong></td>
            <td>${esc(i.email)}</td>
            <td>${esc(i.phone)}</td>
            <td><strong>${i.total_bookings || 0}</strong></td>
            <td><small>${fmtDate(i.last_active)}</small></td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No individual customers yet.</td></tr>';
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('Error loading customer registry: ' + e.message, 'error');
    }
  }

  async function loadReportsData() {
    const period = document.getElementById('reportPeriod')?.value || '30d';
    try {
      const rep = await api('/api/admin/reports?period=' + period);
      const fEl = document.getElementById('repFulfillment');
      const rEl = document.getElementById('repRejection');
      const pEl = document.getElementById('repPassenger');
      const cEl = document.getElementById('repCargo');

      if (fEl) fEl.innerText = (rep.fulfillmentRate || 100) + '%';
      if (rEl) rEl.innerText = (rep.rejectionRate || 0) + '%';
      if (pEl) pEl.innerText = rep.passengerVolume || 0;
      if (cEl) cEl.innerText = rep.cargoVolume || 0;

      const routesBox = document.getElementById('repTopRoutes');
      if (routesBox) {
        if (rep.topRoutes && rep.topRoutes.length > 0) {
          routesBox.innerHTML = rep.topRoutes.map(r => `
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0;">
              <span>${esc(r.route)}</span>
              <strong>${r.count} trips</strong>
            </div>
          `).join('');
        } else {
          routesBox.innerHTML = '<div style="color:var(--text-muted);">No corridor data available for period.</div>';
        }
      }

      const cargoBox = document.getElementById('repCargoTypes');
      if (cargoBox) {
        if (rep.cargoTypes && rep.cargoTypes.length > 0) {
          cargoBox.innerHTML = rep.cargoTypes.map(c => `
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0;">
              <span>${esc(c.type || 'General Freight')}</span>
              <strong>${c.count} consignments</strong>
            </div>
          `).join('');
        } else {
          cargoBox.innerHTML = '<div style="color:var(--text-muted);">No cargo classifications for period.</div>';
        }
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('Error loading reports: ' + e.message, 'error');
    }
  }

  async function loadAuditLogs() {
    try {
      const logs = await api('/api/admin/audit-logs');
      auditLogsCache = logs || [];
      renderAuditLogs(auditLogsCache);
    } catch (e) {
      if (typeof showToast === 'function') showToast('Error loading audit logs: ' + e.message, 'error');
    }
  }

  function renderAuditLogs(logs) {
    const body = document.getElementById('auditLogsBody');
    if (!body) return;

    body.innerHTML = (logs || []).slice(0, 50).map(l => {
      let actionBadge = 'badge-neutral';
      const a = (l.action || '').toLowerCase();
      if (a.includes('create') || a.includes('approve') || a.includes('delivered')) actionBadge = 'badge-success';
      else if (a.includes('delete') || a.includes('reject') || a.includes('failed')) actionBadge = 'badge-danger';
      else if (a.includes('login') || a.includes('update') || a.includes('transit')) actionBadge = 'badge-info';
      else if (a.includes('password') || a.includes('security')) actionBadge = 'badge-warning';

      return `
        <tr>
          <td style="white-space:nowrap;font-size:12.5px;">
            <span style="font-weight:600;color:#0f172a;">${fmtDate(l.timestamp)}</span><br>
            <small style="color:#64748b;">${fmtTime(l.timestamp)}</small>
          </td>
          <td><span class="badge ${actionBadge}">${esc(l.action)}</span></td>
          <td><code class="ref-tag">${esc(l.target || l.target_id || 'System')}</code></td>
          <td style="font-size:13px;color:#334155;line-height:1.5;">${esc(l.details || '')}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:32px;color:#94a3b8;">No audit records found in registry.</td></tr>';
  }

  function filterAuditLogs() {
    const q = (document.getElementById('auditSearchInput')?.value || '').toLowerCase();
    if (!q) {
      renderAuditLogs(auditLogsCache);
      return;
    }
    const filtered = auditLogsCache.filter(l => {
      return (l.action + ' ' + (l.target || '') + ' ' + (l.target_id || '') + ' ' + (l.details || '')).toLowerCase().includes(q);
    });
    renderAuditLogs(filtered);
  }

  function updatePasswordStrength(val) {
    const bar = document.getElementById('pwdStrengthBar');
    const fill = document.getElementById('pwdStrengthFill');
    if (!bar || !fill) return;
    if (!val) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'block';
    let score = 0;
    if (val.length >= 10) score += 35;
    if (val.length >= 14) score += 20;
    if (/[A-Z]/.test(val)) score += 15;
    if (/[0-9]/.test(val)) score += 15;
    if (/[^A-Za-z0-9]/.test(val)) score += 15;
    score = Math.min(score, 100);
    fill.style.width = score + '%';
    if (score < 50) fill.style.backgroundColor = '#ef4444';
    else if (score < 80) fill.style.backgroundColor = '#f59e0b';
    else fill.style.backgroundColor = '#10b981';
  }

  async function changeAdminPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const currentPassword = document.getElementById('currPass')?.value || '';
    const newPassword = document.getElementById('newPass')?.value || '';
    const btn = document.getElementById('btnChangePass');

    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Updating Password...';
    }

    try {
      await api('/api/admin/settings/password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      });
      if (typeof showToast === 'function') showToast('Administrator password updated successfully!', 'success');
      document.getElementById('passChangeForm')?.reset();
      const bar = document.getElementById('pwdStrengthBar');
      if (bar) bar.style.display = 'none';
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Failed to update password', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Update Admin Password';
      }
    }
  }

  // ==========================================
  // 6. CUSTOMER INQUIRIES MANAGEMENT
  // ==========================================
  async function loadInquiries() {
    try {
      const res = await api('/api/admin/inquiries');
      inquiriesCache = (res && res.inquiries) ? res.inquiries : [];
      renderInquiries(inquiriesCache);

      const newCount = inquiriesCache.filter(i => i.status === 'new').length;
      const badge = document.getElementById('sideInquiryCount');
      if (badge) {
        badge.innerText = newCount;
        badge.style.display = newCount > 0 ? 'inline-block' : 'none';
      }
    } catch (err) {
      const tbody = document.getElementById('inquiriesTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#ef4444;">Failed to load inquiries: ${esc(err.message)}</td></tr>`;
    }
  }

  function filterInquiries() {
    const filter = document.getElementById('inquiryStatusFilter')?.value || 'all';
    if (filter === 'all') {
      renderInquiries(inquiriesCache);
    } else {
      renderInquiries(inquiriesCache.filter(i => i.status === filter));
    }
  }

  function renderInquiries(list) {
    const tbody = document.getElementById('inquiriesTableBody');
    if (!tbody) return;
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8;">No customer inquiries found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(i => {
      const dateStr = i.created ? new Date(i.created).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
      let statusPill = '<span class="status-badge" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">New</span>';
      if (i.status === 'read') {
        statusPill = '<span class="status-badge" style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Read</span>';
      } else if (i.status === 'replied') {
        statusPill = '<span class="status-badge" style="background:#ecfdf5;color:#065f46;border:1px solid #bbf7d0;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Replied</span>';
      }

      const previewMsg = esc(i.message || '').slice(0, 50) + (i.message && i.message.length > 50 ? '...' : '');

      return `
        <tr>
          <td><strong>${esc(i.id)}</strong></td>
          <td style="font-size:12.5px;color:#64748b;">${dateStr}</td>
          <td><strong>${esc(i.name)}</strong></td>
          <td style="font-size:12.5px;">
            <div><a href="mailto:${esc(i.email)}" style="color:var(--primary);font-weight:600;">${esc(i.email)}</a></div>
            <div style="color:#64748b;">${esc(i.phone)}</div>
          </td>
          <td><span class="status-tag" style="font-size:11.5px;text-transform:capitalize;">${esc(i.department)}</span></td>
          <td style="max-width:220px;font-size:13px;color:#334155;">
            ${previewMsg}
            <a href="#" data-inquiry-id="${esc(i.id)}" style="font-size:11px;color:var(--primary);font-weight:700;margin-left:4px;">[View]</a>
          </td>
          <td>${statusPill}</td>
          <td style="text-align:right;white-space:nowrap;">
            <select style="font-size:11.5px;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;margin-right:6px;" data-inquiry-select-id="${esc(i.id)}">
              <option value="new" ${i.status === 'new' ? 'selected' : ''}>New</option>
              <option value="read" ${i.status === 'read' ? 'selected' : ''}>Read</option>
              <option value="replied" ${i.status === 'replied' ? 'selected' : ''}>Replied</option>
            </select>
            <button class="btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5;padding:2px 8px;font-size:11.5px;" data-delete-inquiry-id="${esc(i.id)}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function updateInquiryStatus(id, newStatus) {
    try {
      await api('/api/admin/inquiries/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: { status: newStatus }
      });
      if (typeof showToast === 'function') showToast(`Inquiry ${id} status updated to ${newStatus}`, 'success');
      loadInquiries();
    } catch (err) {
      if (typeof showToast === 'function') showToast('Failed to update inquiry status: ' + err.message, 'error');
    }
  }

  async function deleteInquiry(id) {
    if (!confirm(`Are you sure you want to delete inquiry ${id}?`)) return;
    try {
      await api('/api/admin/inquiries/' + encodeURIComponent(id), { method: 'DELETE' });
      if (typeof showToast === 'function') showToast(`Inquiry ${id} deleted successfully`, 'success');
      loadInquiries();
    } catch (err) {
      if (typeof showToast === 'function') showToast('Failed to delete inquiry: ' + err.message, 'error');
    }
  }

  function viewInquiry(id) {
    const item = inquiriesCache.find(i => i.id === id);
    if (!item) return;
    activeInquiry = item;
    const title = document.getElementById('mdlInqTitle');
    const name = document.getElementById('mdlInqName');
    const dept = document.getElementById('mdlInqDept');
    const email = document.getElementById('mdlInqEmail');
    const phone = document.getElementById('mdlInqPhone');
    const date = document.getElementById('mdlInqDate');
    const status = document.getElementById('mdlInqStatus');
    const msg = document.getElementById('mdlInqMessage');

    if (title) title.innerText = `Inquiry: ${item.id}`;
    if (name) name.innerText = item.name;
    if (dept) dept.innerText = item.department;
    if (email) email.innerText = item.email;
    if (phone) phone.innerText = item.phone;
    if (date) date.innerText = item.created ? new Date(item.created).toLocaleString() : '-';
    if (status) status.innerText = (item.status || 'NEW').toUpperCase();
    if (msg) msg.innerText = item.message;
    openModal('viewInquiryModal');
  }

  async function setCurrentInquiryStatus(status) {
    if (!activeInquiry) return;
    await updateInquiryStatus(activeInquiry.id, status);
    closeModal('viewInquiryModal');
  }

  async function deleteCurrentInquiry() {
    if (!activeInquiry) return;
    closeModal('viewInquiryModal');
    await deleteInquiry(activeInquiry.id);
  }

  // ==========================================
  // 7. CSP EVENT LISTENERS & DELEGATION
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Hook up all 6 forms
    const loginForm = document.getElementById('adminSignInForm');
    if (loginForm) loginForm.addEventListener('submit', submitAdminLogin);

    const dispatchForm = document.getElementById('dispatchForm');
    if (dispatchForm) dispatchForm.addEventListener('submit', saveBookingDispatch);

    const addVehicleForm = document.getElementById('addVehicleForm');
    if (addVehicleForm) addVehicleForm.addEventListener('submit', saveNewVehicle);

    const addDriverForm = document.getElementById('addDriverForm');
    if (addDriverForm) addDriverForm.addEventListener('submit', saveNewDriver);

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) addUserForm.addEventListener('submit', saveNewUser);

    const passChangeForm = document.getElementById('passChangeForm');
    if (passChangeForm) passChangeForm.addEventListener('submit', changeAdminPassword);

    // 2. Filter & Input listeners
    const bookingSearch = document.getElementById('bookingSearch');
    if (bookingSearch) bookingSearch.addEventListener('input', filterBookings);

    const bookingCatFilter = document.getElementById('bookingCatFilter');
    if (bookingCatFilter) bookingCatFilter.addEventListener('change', filterBookings);

    const bookingCustTypeFilter = document.getElementById('bookingCustTypeFilter');
    if (bookingCustTypeFilter) bookingCustTypeFilter.addEventListener('change', filterBookings);

    const bookingStatusFilter = document.getElementById('bookingStatusFilter');
    if (bookingStatusFilter) bookingStatusFilter.addEventListener('change', filterBookings);

    const inquiryStatusFilter = document.getElementById('inquiryStatusFilter');
    if (inquiryStatusFilter) inquiryStatusFilter.addEventListener('change', filterInquiries);

    const auditSearchInput = document.getElementById('auditSearchInput');
    if (auditSearchInput) auditSearchInput.addEventListener('input', filterAuditLogs);

    const reportPeriod = document.getElementById('reportPeriod');
    if (reportPeriod) reportPeriod.addEventListener('change', loadReportsData);

    const uRole = document.getElementById('uRole');
    if (uRole) uRole.addEventListener('change', syncDepartmentField);

    const newPass = document.getElementById('newPass');
    if (newPass) newPass.addEventListener('input', (e) => updatePasswordStrength(e.target.value));

    // 3. Central Click Delegation
    document.addEventListener('click', (e) => {
      // Tabs
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        e.preventDefault();
        showTab(tabBtn.getAttribute('data-tab'));
        return;
      }

      // Modals
      const openModalBtn = e.target.closest('[data-open-modal]');
      if (openModalBtn) {
        e.preventDefault();
        openModal(openModalBtn.getAttribute('data-open-modal'));
        return;
      }

      const closeModalBtn = e.target.closest('[data-close-modal]');
      if (closeModalBtn) {
        e.preventDefault();
        closeModal(closeModalBtn.getAttribute('data-close-modal'));
        return;
      }

      // Actions
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.preventDefault();
        const action = actionBtn.getAttribute('data-action');
        if (action === 'logout') handleLogout();
        else if (action === 'refresh-all') loadAllAdminData();
        else if (action === 'refresh-inquiries') loadInquiries();
        else if (action === 'refresh-audit') loadAuditLogs();
        else if (action === 'close-dispatch') closeDispatchModal();
        else if (action === 'delete-current-inquiry') deleteCurrentInquiry();
        else if (action === 'mark-inquiry-read') setCurrentInquiryStatus('read');
        else if (action === 'mark-inquiry-replied') setCurrentInquiryStatus('replied');
        return;
      }

      // Dynamic table actions: Dispatch review
      const dispatchBtn = e.target.closest('[data-dispatch-id]');
      if (dispatchBtn) {
        e.preventDefault();
        openDispatchModal(dispatchBtn.getAttribute('data-dispatch-id'));
        return;
      }

      // View inquiry
      const viewInqBtn = e.target.closest('[data-inquiry-id]');
      if (viewInqBtn) {
        e.preventDefault();
        viewInquiry(viewInqBtn.getAttribute('data-inquiry-id'));
        return;
      }

      // Delete inquiry
      const delInqBtn = e.target.closest('[data-delete-inquiry-id]');
      if (delInqBtn) {
        e.preventDefault();
        deleteInquiry(delInqBtn.getAttribute('data-delete-inquiry-id'));
        return;
      }

      // Delete staff user
      const delUserBtn = e.target.closest('[data-delete-user-id]');
      if (delUserBtn) {
        e.preventDefault();
        deleteStaffUser(delUserBtn.getAttribute('data-delete-user-id'));
        return;
      }
    });

    // Dynamic Select Delegation: Inquiry Status
    document.addEventListener('change', (e) => {
      const inqSel = e.target.closest('[data-inquiry-select-id]');
      if (inqSel) {
        const id = inqSel.getAttribute('data-inquiry-select-id');
        updateInquiryStatus(id, inqSel.value);
      }
    });

    // Run initial admin authentication check
    checkAdminAuth();
  });

  // Global window exports for external callers and test runners
  window.checkAdminAuth = checkAdminAuth;
  window.submitAdminLogin = submitAdminLogin;
  window.handleLogout = handleLogout;
  window.showTab = showTab;
  window.loadAllAdminData = loadAllAdminData;
  window.openDispatchModal = openDispatchModal;
  window.closeDispatchModal = closeDispatchModal;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.openAddVehicleModal = openAddVehicleModal;
  window.openAddDriverModal = openAddDriverModal;
  window.openAddUserModal = openAddUserModal;
  window.saveBookingDispatch = saveBookingDispatch;
  window.saveNewVehicle = saveNewVehicle;
  window.saveNewDriver = saveNewDriver;
  window.saveNewUser = saveNewUser;
  window.changeAdminPassword = changeAdminPassword;
  window.loadInquiries = loadInquiries;
  window.filterInquiries = filterInquiries;
  window.viewInquiry = viewInquiry;
  window.updateInquiryStatus = updateInquiryStatus;
  window.deleteInquiry = deleteInquiry;
  window.deleteStaffUser = deleteStaffUser;

})();
