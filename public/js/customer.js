/**
 * ASIL Logistics - Customer Portal & Account Management (customer.js)
 * Clean, accessible, Maersk/DHL standard. Strict CSP compliant.
 */

let myBookings = [];
let currentCustomer = null;
let currentStatusFilter = 'all';
let currentTypeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. URL Parameters handling
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode');

  // 2. Global Event Delegation
  document.addEventListener('click', (e) => {
    // Logout
    if (e.target.closest('#btnLogoutCustomer') || e.target.closest('[data-action="logout-customer"]')) {
      logoutCustomer();
      return;
    }
    // Auth Tab Switch
    const authTabBtn = e.target.closest('[data-auth-tab]');
    if (authTabBtn) {
      switchAuthTab(authTabBtn.getAttribute('data-auth-tab'));
      return;
    }
    // Booking View Details
    const bkgBtn = e.target.closest('[data-booking-id]');
    if (bkgBtn) {
      viewBookingDetails(bkgBtn.getAttribute('data-booking-id'));
      return;
    }
    // Back to orders list from detail view
    if (e.target.closest('#btnBackToOrdersList')) {
      showOrdersList();
      return;
    }
    // Profile Modal Open / Close
    if (e.target.closest('#btnOpenProfileModal')) {
      openProfileModal();
      return;
    }
    if (e.target.closest('#btnCloseProfileModal') || e.target.closest('#btnCancelProfile')) {
      closeProfileModal();
      return;
    }
    // Filter Tabs
    const filterBtn = e.target.closest('[data-status-filter]');
    if (filterBtn) {
      document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('is-active'));
      filterBtn.classList.add('is-active');
      currentStatusFilter = filterBtn.getAttribute('data-status-filter');
      renderBookingsTable();
      return;
    }
  });

  // 3. Form Submissions
  const loginForm = document.getElementById('customerLoginForm');
  if (loginForm) loginForm.addEventListener('submit', handleCustomerLogin);

  const regForm = document.getElementById('customerRegisterForm');
  if (regForm) regForm.addEventListener('submit', handleCustomerRegister);

  const profForm = document.getElementById('profileForm');
  if (profForm) profForm.addEventListener('submit', handleProfileSubmit);

  // 4. Registration Account Type Switcher
  document.querySelectorAll('input[name="regType"]').forEach(r => {
    r.addEventListener('change', toggleRegType);
  });

  // 5. Booking Mode Filter Dropdown
  const filterSel = document.getElementById('custFilterType');
  if (filterSel) {
    filterSel.addEventListener('change', (e) => {
      currentTypeFilter = e.target.value;
      renderBookingsTable();
    });
  }

  // 6. Check Auth and Initialize Page
  await checkCustomerAuth(initialMode);
});

function switchAuthTab(tab) {
  const loginBtn = document.getElementById('tabBtnLogin');
  const regBtn = document.getElementById('tabBtnRegister');
  const loginForm = document.getElementById('customerLoginForm');
  const regForm = document.getElementById('customerRegisterForm');

  if (loginBtn) loginBtn.classList.toggle('is-active', tab === 'login');
  if (regBtn) regBtn.classList.toggle('is-active', tab === 'register');
  if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
  if (regForm) regForm.style.display = tab === 'register' ? 'block' : 'none';
}

function toggleRegType() {
  const compRadio = document.querySelector('input[name="regType"]:checked');
  const isComp = compRadio && compRadio.value === 'company';
  const group = document.getElementById('regCompGroup');
  const lblInd = document.getElementById('cRegLblInd');
  const lblComp = document.getElementById('cRegLblComp');
  const nameLabel = document.getElementById('regNameLabel');
  const companyInput = document.getElementById('regCompany');

  if (group) group.style.display = isComp ? 'block' : 'none';
  if (lblInd) lblInd.style.borderColor = !isComp ? 'var(--cj-teal)' : 'var(--cj-border)';
  if (lblComp) lblComp.style.borderColor = isComp ? 'var(--cj-teal)' : 'var(--cj-border)';
  if (nameLabel) nameLabel.textContent = isComp ? 'Contact Person Full Name *' : 'Full Name *';
  if (companyInput) companyInput.required = isComp;
}

function showAuthBox(tab = 'login') {
  document.getElementById('unauthSection').style.display = 'block';
  document.getElementById('authSection').style.display = 'none';
  switchAuthTab(tab);
}

async function checkCustomerAuth(initialMode) {
  try {
    const user = await checkAuth();
    if (user && (user.role === 'customer' || user.role === 'super_admin')) {
      currentCustomer = user;
      renderCustomerPortal(user);
      await loadCustomerData();

      // Check if URL has ?order=REF
      const urlParams = new URLSearchParams(window.location.search);
      const orderRef = urlParams.get('order');
      if (orderRef) {
        viewBookingDetails(orderRef);
      } else {
        showOrdersList();
      }
    } else {
      showAuthBox(initialMode === 'register' ? 'register' : 'login');
    }
  } catch (_) {
    showAuthBox(initialMode === 'register' ? 'register' : 'login');
  }
}

function renderCustomerPortal(u) {
  document.getElementById('unauthSection').style.display = 'none';
  document.getElementById('authSection').style.display = 'block';

  const nameEl = document.getElementById('custFullName');
  const emailEl = document.getElementById('custEmail');
  const phoneEl = document.getElementById('custPhone');
  const avatarEl = document.getElementById('custAvatar');

  if (nameEl) nameEl.textContent = u.fullName || u.username;
  if (emailEl) emailEl.textContent = u.email || 'Verified Account';
  if (phoneEl) phoneEl.textContent = u.phone || '';
  if (avatarEl) {
    const initials = (u.fullName || u.username || 'AL').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }

  const isComp = u.customerType === 'company';
  const badge = document.getElementById('custTypeBadge');
  if (badge) {
    badge.textContent = isComp ? 'Corporate Account' : 'Individual Shipper';
  }

  const compSub = document.getElementById('custCompanySub');
  if (compSub) {
    if (isComp && u.companyName) {
      compSub.textContent = u.companyName;
      compSub.style.display = 'block';
    } else {
      compSub.style.display = 'none';
    }
  }
}

async function handleCustomerLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const u = (document.getElementById('loginUsername') || document.getElementById('loginUser'))?.value.trim() || '';
  const p = (document.getElementById('loginPassword') || document.getElementById('loginPass'))?.value || '';
  const btn = document.getElementById('btnLoginCustomer') || document.getElementById('btnCustomerSignIn');
  const notice = document.getElementById('loginStatusNotice');

  if (!u || !p) {
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.border = '1px solid #fecaca';
      notice.style.color = '#991b1b';
      notice.textContent = 'Please enter both username/email and password.';
    }
    showToast('Please enter both username and password', 'error');
    return;
  }

  if (notice) notice.style.display = 'none';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Signing In...';
  }

  try {
    const res = await loginUser(u, p);
    if (!res || !res.ok || !res.user) {
      const errMsg = (res && res.error) ? res.error : 'Invalid username or password. Please verify your credentials.';
      if (notice) {
        notice.style.display = 'block';
        notice.style.background = '#fef2f2';
        notice.style.border = '1px solid #fecaca';
        notice.style.color = '#991b1b';
        notice.textContent = errMsg;
      }
      showToast(errMsg, 'error');
      return;
    }

    showToast('Signed in successfully!', 'success');

    // If an Administrator or Department Officer logs in, take them straight to Operations Console
    if (res.user.role === 'super_admin' || (res.user.role && res.user.role.startsWith('dept_'))) {
      window.location.href = '/admin';
      return;
    }

    // Inspect next redirect param
    const next = new URLSearchParams(window.location.search).get('next');
    if (next) {
      window.location.href = next;
      return;
    }
    await checkCustomerAuth();
  } catch (err) {
    const errMsg = err.message || 'Login failed. Please check credentials.';
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.border = '1px solid #fecaca';
      notice.style.color = '#991b1b';
      notice.textContent = errMsg;
    }
    showToast(errMsg, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In to Portal \u2192';
    }
  }
}

async function handleCustomerRegister(e) {
  e.preventDefault();
  const isComp = document.querySelector('input[name="regType"]:checked').value === 'company';
  const password = document.getElementById('regPassword').value;
  const notice = document.getElementById('regStatusNotice');
  const btn = document.getElementById('btnRegisterCustomer');

  if (password.length < 10) {
    const pwdMsg = document.getElementById('pwdHintMsg');
    if (pwdMsg) pwdMsg.style.display = 'block';
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.border = '1px solid #fecaca';
      notice.style.color = '#991b1b';
      notice.textContent = 'Password must be at least 10 characters long.';
    }
    document.getElementById('regPassword').focus();
    return;
  }

  const payload = {
    customerType: isComp ? 'company' : 'individual',
    companyName: isComp ? document.getElementById('regCompany').value.trim() : '',
    fullName: document.getElementById('regFullName').value.trim(),
    username: document.getElementById('regUsername').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    password: password
  };

  btn.disabled = true;
  btn.textContent = 'Creating Account...';

  try {
    await api('/api/auth/register-customer', { method: 'POST', body: payload });
    showToast('Account created! Signing you in...', 'success');
    await loginUser(payload.username, payload.password);

    // After success customer goes straight to next or /order (STEP 2 requirement)
    const next = new URLSearchParams(window.location.search).get('next') || '/order';
    window.location.href = next;
  } catch (err) {
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.border = '1px solid #fecaca';
      notice.style.color = '#991b1b';
      notice.textContent = err.message || 'Registration failed.';
    }
    showToast(err.message || 'Registration failed', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account & Proceed to Order \u2192';
  }
}

async function loadCustomerData() {
  try {
    const res = await api('/api/customer/bookings');
    myBookings = (res && res.bookings) ? res.bookings : [];
    updateMetrics(myBookings);
    renderBookingsTable();
  } catch (e) {
    showToast('Could not load consignments: ' + e.message, 'error');
  }
}

function updateMetrics(list) {
  const total = list.length;
  const pending = list.filter(b => b.status === 'Pending').length;
  const active = list.filter(b => ['Approved', 'In Progress', 'Pickup Scheduled', 'Picked Up', 'In Transit', 'Out for Delivery'].includes(b.status)).length;
  const completed = list.filter(b => ['Completed', 'Delivered'].includes(b.status)).length;

  const tEl = document.getElementById('custMetricTotal');
  const aEl = document.getElementById('custMetricActive');
  const pEl = document.getElementById('custMetricPending');
  const cEl = document.getElementById('custMetricCompleted');

  if (tEl) tEl.textContent = total;
  if (aEl) aEl.textContent = active;
  if (pEl) pEl.textContent = pending;
  if (cEl) cEl.textContent = completed;
}

function statusChipClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('delivered') || s.includes('completed')) return 'cj-status-delivered';
  if (s.includes('out for delivery')) return 'cj-status-delivery';
  if (s.includes('transit') || s.includes('progress') || s.includes('picked')) return 'cj-status-transit';
  if (s.includes('approved')) return 'cj-status-approved';
  if (s.includes('reject') || s.includes('cancel')) return 'cj-status-rejected';
  return 'cj-status-pending';
}

function renderBookingsTable() {
  const body = document.getElementById('custBookingsBody');
  if (!body) return;

  const filtered = myBookings.filter(b => {
    // Mode filter
    const isCargo = b.booking_category === 'cargo' || (b.id && b.id.startsWith('CR-'));
    if (currentTypeFilter === 'cargo' && !isCargo) return false;
    if (currentTypeFilter === 'passenger' && isCargo) return false;

    // Status filter
    const st = String(b.status || '').toLowerCase();
    if (currentStatusFilter === 'active') {
      return ['approved', 'in progress', 'pickup scheduled', 'picked up', 'in transit', 'out for delivery'].includes(st);
    }
    if (currentStatusFilter === 'pending') {
      return st === 'pending';
    }
    if (currentStatusFilter === 'completed') {
      return ['completed', 'delivered'].includes(st);
    }
    return true;
  });

  if (filtered.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px 20px;color:var(--cj-text-muted);">
          No consignments found in this view.
          <div style="margin-top:10px;">
            <a href="/order" class="cj-btn-primary" style="font-size:13px;padding:6px 16px;">+ Book New Shipment</a>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filtered.map(b => {
    const isCargo = b.booking_category === 'cargo' || (b.id && b.id.startsWith('CR-'));
    const mode = (b.transport_mode || (isCargo ? 'Road' : 'Passenger')).toUpperCase();
    const origin = b.origin_name || b.goods_origin_country || b.departure || b.pickupLocation || 'Origin Hub';
    const dest = b.destination_name || b.destination || b.deliveryDestination || 'Destination Hub';

    const etaText = (b.eta_min_date && b.eta_max_date)
      ? `${b.eta_min_date} – ${b.eta_max_date}`
      : (b.travel_date || b.created ? fmtDate(b.travel_date || b.created) : 'Scheduled');

    const rateText = b.quoted_price !== null && b.quoted_price !== undefined
      ? `${b.currency || 'USD'} ${Number(b.quoted_price).toLocaleString()}`
      : 'On Request';

    return `
      <tr>
        <td><strong style="color:var(--cj-teal);">${esc(b.id)}</strong></td>
        <td>
          <span class="cj-badge ${isCargo ? 'cj-badge-cheapest' : 'cj-badge-fastest'}">${esc(mode)}</span>
        </td>
        <td>
          <div style="font-weight:600;color:var(--cj-text-main);">
            ${esc(origin)} <span style="color:var(--cj-text-muted);">&rarr;</span> ${esc(dest)}
          </div>
        </td>
        <td><span style="font-size:12.5px;color:var(--cj-text-body);">${esc(etaText)}</span></td>
        <td><strong style="color:var(--cj-text-main);">${esc(rateText)}</strong></td>
        <td>
          <span class="cj-status-chip ${statusChipClass(b.status)}">${esc(b.status || 'Pending')}</span>
        </td>
        <td>
          <button type="button" class="cj-btn-secondary" style="min-height:34px;padding:4px 12px;font-size:12.5px;" data-booking-id="${esc(b.id)}">
            View Details
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function showOrdersList() {
  const listView = document.getElementById('portalListView');
  const detailView = document.getElementById('portalDetailView');
  if (listView) listView.style.display = 'block';
  if (detailView) detailView.style.display = 'none';

  if (window.history && window.history.pushState) {
    const url = new URL(window.location.href);
    url.searchParams.delete('order');
    window.history.pushState(null, '', url.pathname + (url.search ? url.search : ''));
  }
}

async function viewBookingDetails(id) {
  try {
    const res = await api('/api/bookings/' + encodeURIComponent(id));
    const b = (res && res.booking) ? res.booking : res;

    // Show Detail View, Hide List View
    const listView = document.getElementById('portalListView');
    const detailView = document.getElementById('portalDetailView');
    if (listView) listView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    // Update URL history with ?order=REF
    if (window.history && window.history.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('order', id);
      window.history.pushState(null, '', url.pathname + '?' + url.searchParams.toString());
    }

    // Scroll to top of detail view
    window.scrollTo({ top: 120, behavior: 'smooth' });

    // Populate Fields
    const refEl = document.getElementById('dtlRefNum');
    if (refEl) refEl.textContent = b.id;

    const chipEl = document.getElementById('dtlStatusChip');
    if (chipEl) {
      chipEl.innerHTML = `<span class="cj-status-chip ${statusChipClass(b.status)}">${esc(b.status || 'Pending')}</span>`;
    }

    const origEl = document.getElementById('dtlOriginName');
    if (origEl) origEl.textContent = b.origin || b.departure || b.pickupLocation || 'Origin Hub';

    const destEl = document.getElementById('dtlDestName');
    if (destEl) destEl.textContent = b.destination || b.deliveryDestination || 'Destination Hub';

    const modeEl = document.getElementById('dtlModeBadge');
    if (modeEl) {
      const mode = (b.transport_mode || b.mode || (b.bookingCategory === 'cargo' ? 'Road' : 'Passenger')).toUpperCase();
      modeEl.textContent = `${mode} FREIGHT`;
    }

    const etaEl = document.getElementById('dtlETAWindow');
    if (etaEl) {
      if (b.eta_range && b.eta_range.display) {
        etaEl.textContent = b.eta_range.display;
      } else if (b.eta_min_date && b.eta_max_date) {
        etaEl.textContent = `${b.eta_min_date} to ${b.eta_max_date}`;
      } else {
        etaEl.textContent = b.deliveryDate || b.travelDate || 'Estimated upon dispatch';
      }
    }

    const pickupDateEl = document.getElementById('dtlPickupDate');
    if (pickupDateEl) {
      pickupDateEl.textContent = `Pickup / Departure Date: ${b.pickupDate || b.travelDate || 'Standard dispatch'}`;
    }

    const priceEl = document.getElementById('dtlQuotedPrice');
    if (priceEl) {
      if (b.price_quote !== null && b.price_quote !== undefined) {
        priceEl.textContent = `${b.currency || 'USD'} ${Number(b.price_quote).toLocaleString()}`;
      } else if (b.quoted_price !== null && b.quoted_price !== undefined) {
        priceEl.textContent = `${b.currency || 'USD'} ${Number(b.quoted_price).toLocaleString()}`;
      } else {
        priceEl.textContent = 'Tariff on confirmation';
      }
    }

    const cargoTypeEl = document.getElementById('dtlCargoType');
    if (cargoTypeEl) {
      cargoTypeEl.textContent = b.cargoType || b.cargoDesc || b.bookingType || 'Commercial Consignment';
    }

    const cargoWeightEl = document.getElementById('dtlCargoWeight');
    if (cargoWeightEl) {
      if (b.cargoWeight) {
        cargoWeightEl.textContent = `${b.cargoWeight} • ${b.packagesCount || 1} package(s)`;
      } else if (b.passengers) {
        cargoWeightEl.textContent = `${b.passengers} passenger(s) • ${b.vehiclePreference || 'Executive'}`;
      } else {
        cargoWeightEl.textContent = 'Standard Consignment Specification';
      }
    }

    const pickupAddrEl = document.getElementById('dtlPickupAddr');
    if (pickupAddrEl) {
      pickupAddrEl.textContent = b.pickup_address || b.pickupLocation || b.departure || 'Designated Loading Depot';
    }

    const deliveryAddrEl = document.getElementById('dtlDeliveryAddr');
    if (deliveryAddrEl) {
      deliveryAddrEl.textContent = b.delivery_address || b.deliveryDestination || b.destination || 'Consignee Delivery Address';
    }

    // Vertical Timeline
    const timelineEl = document.getElementById('dtlTimeline');
    if (timelineEl) {
      const steps = Array.isArray(b.steps) ? b.steps : [];
      if (steps.length > 0) {
        timelineEl.innerHTML = steps.map(s => {
          const timeStr = s.timestamp ? fmtDate(s.timestamp) + ' ' + fmtTime(s.timestamp) : (s.status === 'pending' ? 'Pending' : 'Completed');
          return `
            <div class="cj-timeline-item is-${s.status}">
              <div class="cj-timeline-dot"></div>
              <div class="cj-timeline-head">
                <span class="cj-timeline-name">${esc(s.name)}</span>
                <span class="cj-timeline-time">${esc(timeStr)}</span>
              </div>
              ${s.note ? `<div class="cj-timeline-note">${esc(s.note)}</div>` : ''}
            </div>
          `;
        }).join('');
      } else {
        timelineEl.innerHTML = `
          <div class="cj-timeline-item is-current">
            <div class="cj-timeline-dot"></div>
            <div class="cj-timeline-head">
              <span class="cj-timeline-name">Booking Registered</span>
              <span class="cj-timeline-time">${fmtDate(b.created)}</span>
            </div>
            <div class="cj-timeline-note">Your consignment request has been received by operations and queued for corridor scheduling.</div>
          </div>
        `;
      }
    }

    // Documents Section
    const docsSection = document.getElementById('dtlDocsSection');
    const docsList = document.getElementById('dtlDocsList');
    if (docsSection && docsList) {
      docsSection.style.display = 'block';
      docsList.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/api/bookings/${encodeURIComponent(b.id)}" target="_blank" rel="noopener" class="cj-btn-outline" style="font-size:12.5px;padding:6px 14px;min-height:36px;">
            &#128196; Download Booking Record (${esc(b.id)}.json)
          </a>
        </div>
      `;
    }

    // Support links
    const phoneLink = document.getElementById('dtlSupportPhone');
    const emailLink = document.getElementById('dtlSupportEmail');
    if (phoneLink && COMPANY && COMPANY.phone) {
      phoneLink.href = `tel:${COMPANY.phone.replace(/\s+/g, '')}`;
    }
    if (emailLink && COMPANY && COMPANY.email) {
      emailLink.href = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Inquiry: ' + b.id)}`;
    }
  } catch (err) {
    showToast('Failed to load consignment details: ' + err.message, 'error');
  }
}

function openProfileModal() {
  if (!currentCustomer) return;
  const modal = document.getElementById('profileModal');
  const fnInput = document.getElementById('profileFullName');
  const phInput = document.getElementById('profilePhone');
  const compInput = document.getElementById('profileCompany');
  const compField = document.getElementById('profileCompanyField');
  const notice = document.getElementById('profileStatusNotice');

  if (notice) { notice.style.display = 'none'; notice.textContent = ''; }
  if (fnInput) fnInput.value = currentCustomer.fullName || currentCustomer.full_name || '';
  if (phInput) phInput.value = currentCustomer.phone || '';
  if (compInput) compInput.value = currentCustomer.companyName || currentCustomer.company_name || '';
  if (compField) {
    compField.style.display = (currentCustomer.customerType === 'company' || currentCustomer.customer_type === 'company') ? 'block' : 'none';
  }
  const curP = document.getElementById('profileCurPass');
  const newP = document.getElementById('profileNewPass');
  if (curP) curP.value = '';
  if (newP) newP.value = '';

  if (modal) modal.style.display = 'flex';
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.style.display = 'none';
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const notice = document.getElementById('profileStatusNotice');
  const btn = document.getElementById('btnSaveProfile');
  const fullName = document.getElementById('profileFullName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const companyName = document.getElementById('profileCompany').value.trim();
  const currentPassword = document.getElementById('profileCurPass').value;
  const newPassword = document.getElementById('profileNewPass').value;

  if (notice) { notice.style.display = 'none'; }
  if (!fullName) {
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.color = '#dc2626';
      notice.textContent = 'Full name is required.';
    }
    return;
  }
  if (newPassword && newPassword.length < 10) {
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.color = '#dc2626';
      notice.textContent = 'New password must be at least 10 characters long.';
    }
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const payload = { full_name: fullName, phone, company_name: companyName };
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    const res = await api('/api/customer/profile', {
      method: 'PATCH',
      body: payload
    });
    currentCustomer = res.customer;
    renderCustomerPortal(currentCustomer);
    closeProfileModal();
    if (typeof showToast === 'function') {
      showToast('Profile updated successfully!', 'success');
    }
  } catch (err) {
    if (notice) {
      notice.style.display = 'block';
      notice.style.background = '#fef2f2';
      notice.style.color = '#dc2626';
      notice.textContent = err.message || 'Failed to update profile.';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

async function logoutCustomer() {
  await logoutUser();
  window.location.href = '/portal';
}
