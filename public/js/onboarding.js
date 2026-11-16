let clientsCache = [];
let currentMode = 'apply';

// Expose on window for runtime compatibility
window.setMode = setMode;
window.toggleCustomerType = toggleCustomerType;
window.submitOnboarding = submitOnboarding;

document.addEventListener('DOMContentLoaded', () => {
  const p = new URLSearchParams(window.location.search);
  if (p.get('mode')) setMode(p.get('mode'));
  else if (p.get('track')) {
    setMode('track');
    const tInp = document.getElementById('trackInput');
    if (tInp) tInp.value = p.get('track');
    lookupClientStatus();
  }

  const pillApply = document.getElementById('pill-apply');
  if (pillApply) pillApply.addEventListener('click', () => setMode('apply'));
  const pillTrack = document.getElementById('pill-track');
  if (pillTrack) pillTrack.addEventListener('click', () => setMode('track'));
  const pillDash = document.getElementById('pill-dash');
  if (pillDash) pillDash.addEventListener('click', () => setMode('dashboard'));

  const form = document.getElementById('onboardingForm');
  if (form) form.addEventListener('submit', submitOnboarding);

  document.querySelectorAll('input[name="customerType"]').forEach(r => {
    r.addEventListener('change', toggleCustomerType);
  });

  // Global event delegation for onboarding actions
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btnTrackNewClient')) { trackNewClient(); return; }
    if (e.target.closest('#btnLookupClientStatus')) { lookupClientStatus(); return; }
    if (e.target.closest('#btnPromptLogin')) { promptLogin(); return; }
    if (e.target.closest('#btnLogoutOfficer')) { logoutOfficer(); return; }
    if (e.target.closest('#btnReloadOnboarding')) { loadOnboardingData(); return; }
    if (e.target.closest('#btnCloseKycModal') || e.target.closest('#btnCancelKycModal')) { closeKycModal(); return; }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { switchTab(tabBtn.getAttribute('data-tab')); return; }
    const kycBtn = e.target.closest('[data-kyc-id]');
    if (kycBtn) { openKycReview(kycBtn.getAttribute('data-kyc-id')); return; }
  });

  const qFilter = document.getElementById('queueFilter');
  if (qFilter) qFilter.addEventListener('change', filterClients);
  const qSearch = document.getElementById('queueSearch');
  if (qSearch) qSearch.addEventListener('input', filterClients);

  const kycForm = document.getElementById('kycActionForm');
  if (kycForm) kycForm.addEventListener('submit', saveKycDecision);
});

    function toggleCustomerType() {
      const isComp = document.querySelector('input[name="customerType"]:checked').value === 'company';
      document.getElementById('corporateFields').style.display = isComp ? 'block' : 'none';
      document.getElementById('lbl-ind').classList.toggle('active', !isComp);
      document.getElementById('lbl-comp').classList.toggle('active', isComp);
      document.getElementById('nameLabel').innerText = isComp ? 'Primary Account Contact Full Name *' : 'Full Name (Primary Account Holder) *';
      document.getElementById('companyName').required = isComp;
    }

    function setMode(mode) {
      currentMode = mode;
      document.getElementById('view-apply').style.display = mode === 'apply' ? 'block' : 'none';
      document.getElementById('view-track').style.display = mode === 'track' ? 'block' : 'none';
      document.getElementById('view-dashboard').style.display = mode === 'dashboard' ? 'block' : 'none';

      document.getElementById('pill-apply').classList.toggle('active', mode === 'apply');
      document.getElementById('pill-track').classList.toggle('active', mode === 'track');
      document.getElementById('pill-dashboard').classList.toggle('active', mode === 'dashboard');

      if (mode === 'dashboard') {
        initDashboard();
      }
    }

    async function submitOnboarding(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitOnboarding');
      btn.disabled = true;
      btn.innerText = 'Registering Account...';

      const custType = document.querySelector('input[name="customerType"]:checked').value;
      const payload = {
        customerType: custType,
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        billingAddress: document.getElementById('billingAddress').value.trim(),
        companyName: custType === 'company' ? document.getElementById('companyName').value.trim() : '',
        companyReg: custType === 'company' ? document.getElementById('companyReg').value.trim() : '',
        taxId: custType === 'company' ? document.getElementById('taxId').value.trim() : '',
        contactPerson: custType === 'company' ? document.getElementById('contactPerson').value.trim() : '',
        serviceInterest: document.getElementById('serviceInterest').value,
        volumeScope: document.getElementById('volumeScope').value,
        notes: document.getElementById('notes').value.trim()
      };

      try {
        const res = await api('/api/onboarding/apply', { method: 'POST', body: payload });
        document.getElementById('onboardingForm').reset();
        toggleCustomerType();
        document.getElementById('onboardingSuccessNotice').style.display = 'block';
        document.getElementById('newClientRef').innerText = res.id;
        document.getElementById('newClientRef').dataset.ref = res.id;
        showToast('Onboarding application registered successfully: ' + res.id, 'success');
        document.getElementById('onboardingSuccessNotice').scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        showToast(err.message || 'Failed to submit onboarding application', 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Submit Onboarding Application \u2192';
      }
    }

    function trackNewClient() {
      const ref = document.getElementById('newClientRef').dataset.ref;
      setMode('track');
      document.getElementById('trackInput').value = ref;
      lookupClientStatus();
    }

    async function lookupClientStatus() {
      const q = document.getElementById('trackInput').value.trim().toUpperCase();
      if (!q) {
        showToast('Please enter an application reference ID', 'error');
        return;
      }
      const box = document.getElementById('trackResultBox');
      box.style.display = 'block';
      box.innerHTML = '<div style="text-align:center;padding:20px;">Checking registry database...</div>';

      try {
        const res = await api('/api/bookings/' + encodeURIComponent(q));
        const b = res.booking;
        box.innerHTML = `
          <div style="background:var(--bg-soft);border:1px solid var(--line);border-radius:var(--radius-md);padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:16px;">
              <div>
                <span style="font-size:12px;color:var(--text-muted);font-weight:700;">REFERENCE NUMBER</span>
                <div style="font-size:20px;font-weight:800;color:var(--primary);letter-spacing:1px;">${esc(b.id)}</div>
              </div>
              <div>${statusBadge(b.status || 'Pending')}</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;font-size:14px;margin-bottom:16px;">
              <div><strong>Application Type:</strong> ${esc(b.bookingType || 'Client Onboarding')}</div>
              <div><strong>Client Entity:</strong> ${esc(b.fullName || b.companyName || b.client || 'N/A')}</div>
              <div><strong>Registered Date:</strong> ${fmtDate(b.created)}</div>
              <div><strong>Compliance Status:</strong> ${esc(b.status || 'Under Compliance Review')}</div>
            </div>

            <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:16px;">
              <h4 style="font-size:14px;font-weight:700;color:var(--primary);margin-bottom:8px;">Compliance Timeline:</h4>
              <div style="font-size:13px;line-height:1.6;color:var(--text-muted);">
                ${(b.log || []).map(l => `<div>&bull; <strong>${esc(l.step || 'Step')}:</strong> ${esc(l.note || '')} <small>(${fmtDate(l.ts)})</small></div>`).join('') || '<div>Application under formal compliance verification.</div>'}
              </div>
            </div>
          </div>
        `;
      } catch (e) {
        box.innerHTML = `<div class="badge badge-danger" style="display:block;padding:16px;text-align:center;">${esc(e.message || 'Application reference not found')}</div>`;
      }
    }

    // ==========================================
    // DASHBOARD & RBAC
    // ==========================================
    async function initDashboard() {
      const sess = await enforceDepartmentAccess('onboarding');
      if (!sess) {
        document.getElementById('authGateNotice').style.display = 'block';
        document.getElementById('staffInterface').style.display = 'none';
        return;
      }
      document.getElementById('authGateNotice').style.display = 'none';
      document.getElementById('staffInterface').style.display = 'block';

      document.getElementById('officerName').innerText = sess.fullName || sess.username;
      document.getElementById('officerRole').innerText = sess.role === 'super_admin' ? 'Super Administrator' : 'Onboarding Specialist';
      document.getElementById('officerAvatar').innerText = (sess.username || 'OB').slice(0, 2).toUpperCase();

      loadOnboardingData();
    }

    async function loadOnboardingData() {
      try {
        const [stats, clients] = await Promise.all([
          api('/api/departments/onboarding/overview'),
          api('/api/departments/onboarding/clients')
        ]);

        document.getElementById('metric-total').innerText = stats.total || 0;
        document.getElementById('metric-pending').innerText = stats.pending || 0;
        document.getElementById('metric-approved').innerText = stats.approved || 0;
        document.getElementById('metric-corporate').innerText = stats.corporate || 0;

        clientsCache = clients;
        renderClientsTable(clients);
      } catch (e) {
        showToast('Error loading onboarding data: ' + e.message, 'error');
      }
    }

    function renderClientsTable(list) {
      const recentBody = document.getElementById('recentClientsBody');
      const allBody = document.getElementById('allClientsBody');
      const verBody = document.getElementById('verifiedClientsBody');

      if (!list || list.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;">No applications found.</td></tr>';
        allBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;">No applications found.</td></tr>';
        verBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;">No verified clients found.</td></tr>';
        return;
      }

      // Recent 5
      recentBody.innerHTML = list.slice(0, 8).map(c => `
        <tr>
          <td><strong>${esc(c.id)}</strong></td>
          <td>${c.customer_type === 'company' ? '<span class="badge badge-info">Corporate</span>' : '<span class="badge badge-neutral">Individual</span>'}</td>
          <td>
            <strong>${esc(c.customer_type === 'company' ? c.company_name : c.full_name)}</strong>
            ${c.customer_type === 'company' && c.contact_person ? `<br><small style="color:var(--text-muted);">${esc(c.contact_person)}</small>` : ''}
          </td>
          <td><small>${esc(c.email)}<br>${esc(c.phone)}</small></td>
          <td>${statusBadge(c.status)}</td>
          <td><button class="btn-outline btn-sm" data-kyc-id="${c.id}">Review KYC</button></td>
        </tr>
      `).join('');

      // All Intake Queue
      allBody.innerHTML = list.map(c => `
        <tr>
          <td><strong>${esc(c.id)}</strong></td>
          <td>${c.customer_type === 'company' ? '<span class="badge badge-info">Corporate</span>' : '<span class="badge badge-neutral">Individual</span>'}</td>
          <td>
            <strong>${esc(c.customer_type === 'company' ? c.company_name : c.full_name)}</strong>
            <br><small style="color:var(--text-muted);">${esc(c.email)} &bull; ${esc(c.phone)}</small>
          </td>
          <td><small>Reg: ${esc(c.company_reg || 'N/A')}<br>Tax: ${esc(c.tax_id || 'N/A')}</small></td>
          <td><small>${esc(c.billing_address || 'Khartoum')}</small></td>
          <td>${statusBadge(c.status)}</td>
          <td><button class="btn-primary btn-sm" data-kyc-id="${c.id}">Review</button></td>
        </tr>
      `).join('');

      // Verified Only
      const verified = list.filter(c => c.status === 'Approved');
      verBody.innerHTML = verified.map(c => `
        <tr>
          <td><strong>${esc(c.id)}</strong></td>
          <td><strong>${esc(c.company_name || c.full_name)}</strong></td>
          <td>${esc(c.contact_person || c.full_name)}</td>
          <td><small>${esc(c.billing_address)}</small></td>
          <td>${fmtDate(c.updated || c.created)}</td>
          <td>${statusBadge(c.status)}</td>
        </tr>
      `).join('');
    }

    function filterClients() {
      const q = document.getElementById('queueSearch').value.toLowerCase();
      const type = document.getElementById('queueFilter').value;
      const filtered = clientsCache.filter(c => {
        const matchesQ = (c.id + ' ' + (c.company_name || '') + ' ' + (c.full_name || '') + ' ' + (c.email || '')).toLowerCase().includes(q);
        const matchesType = type === 'all' || c.customer_type === type;
        return matchesQ && matchesType;
      });
      renderClientsTable(filtered);
    }

    function switchTab(tab) {
      document.getElementById('tab-overview').style.display = tab === 'overview' ? 'block' : 'none';
      document.getElementById('tab-intake').style.display = tab === 'intake' ? 'block' : 'none';
      document.getElementById('tab-approved').style.display = tab === 'approved' ? 'block' : 'none';

      document.getElementById('sbtn-overview').classList.toggle('active', tab === 'overview');
      document.getElementById('sbtn-intake').classList.toggle('active', tab === 'intake');
      document.getElementById('sbtn-approved').classList.toggle('active', tab === 'approved');
    }

    function openKycReview(id) {
      const c = clientsCache.find(x => x.id === id);
      if (!c) return;

      document.getElementById('modalClientId').value = c.id;
      document.getElementById('modalClientRef').innerText = c.id;
      document.getElementById('modalDecisionStatus').value = c.status || 'Pending';
      document.getElementById('modalDecisionNotes').value = c.internal_notes || '';

      document.getElementById('modalClientDetails').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><strong>Entity:</strong> ${esc(c.company_name || c.full_name)}</div>
          <div><strong>Type:</strong> ${esc(c.customer_type)}</div>
          <div><strong>Contact Person:</strong> ${esc(c.contact_person || c.full_name)}</div>
          <div><strong>Phone:</strong> ${esc(c.phone)}</div>
          <div><strong>Email:</strong> ${esc(c.email)}</div>
          <div><strong>Registration:</strong> ${esc(c.company_reg || 'N/A')}</div>
          <div><strong>Tax ID:</strong> ${esc(c.tax_id || 'N/A')}</div>
          <div><strong>Registered Date:</strong> ${fmtDate(c.created)}</div>
        </div>
        <div style="margin-top:8px;"><strong>Billing Address:</strong> ${esc(c.billing_address || 'None')}</div>
      `;

      document.getElementById('kycModal').style.display = 'flex';
    }

    function closeKycModal() {
      document.getElementById('kycModal').style.display = 'none';
    }

    async function saveKycDecision(e) {
      e.preventDefault();
      const id = document.getElementById('modalClientId').value;
      const status = document.getElementById('modalDecisionStatus').value;
      const notes = document.getElementById('modalDecisionNotes').value.trim();
      const btn = document.getElementById('btnSaveKyc');

      btn.disabled = true;
      btn.innerText = 'Updating...';

      try {
        await api('/api/departments/onboarding/clients/' + id, {
          method: 'PATCH',
          body: { status, notes }
        });
        showToast('Client compliance status updated to ' + status, 'success');
        closeKycModal();
        loadOnboardingData();
      } catch (err) {
        showToast(err.message || 'Failed to update KYC status', 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Update Client Status';
      }
    }

    async function logoutOfficer() {
      await logoutUser();
      window.location.reload();
    }