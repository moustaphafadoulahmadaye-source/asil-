/**
 * ASIL Logistics - Order Wizard (order.js)
 * Architecture: Vanilla JS, Self-Hosted, Strict CSP (Zero inline code)
 */

document.addEventListener('DOMContentLoaded', () => {
  initOrderWizard();
});

let currentUser = null;
let locationsList = [];
let availableQuotes = [];
let routeMap = null;
let mapMarkers = [];
let mapPolyline = null;

const orderState = {
  category: 'cargo',
  cargoType: 'General Commercial Goods',
  cargoDesc: '',
  cargoWeight: '',
  packagesCount: 1,
  vehiclePref: 'Heavy Flatbed Truck (20-40 Ton)',
  handling: [],
  originId: '',
  originName: '',
  destId: '',
  destName: '',
  pickupAddress: '',
  deliveryAddress: '',
  pickupDate: '',
  goodsOriginCountry: 'Sudan',
  selectedMode: '',
  selectedQuote: null
};

async function initOrderWizard() {
  // 1. Check Authentication
  try {
    const meRes = await fetch('/api/auth/me', { headers: { 'Accept': 'application/json' } });
    if (!meRes.ok) throw new Error('Unauthenticated');
    const meData = await meRes.json();
    if (!meData.user || !meData.user.id) {
      window.location.href = '/portal?mode=login&next=/order';
      return;
    }
    currentUser = meData.user;
    const nameEl = document.getElementById('userFullName');
    if (nameEl) {
      nameEl.textContent = currentUser.fullName || currentUser.username || 'Valued Customer';
    }
  } catch (_) {
    window.location.href = '/portal?mode=login&next=/order';
    return;
  }

  // 2. Set default dates
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const tomorrowStr = today.toISOString().slice(0, 10);
  const dateInput = document.getElementById('pickupDate');
  if (dateInput) {
    dateInput.min = tomorrowStr;
    dateInput.value = tomorrowStr;
    orderState.pickupDate = tomorrowStr;
  }
  const opsDateInput = document.getElementById('opsPreferredDate');
  if (opsDateInput) {
    opsDateInput.min = tomorrowStr;
    opsDateInput.value = tomorrowStr;
  }

  // 3. Load Locations
  await loadLocations();

  // 4. Attach Event Listeners
  attachWizardListeners();

  // 5. Initialize Leaflet Map
  initRouteMap();
}

async function loadLocations() {
  const originSel = document.getElementById('originLocation');
  const destSel = document.getElementById('destLocation');
  if (!originSel || !destSel) return;

  try {
    const res = await fetch('/api/locations');
    const data = await res.json();
    locationsList = (data && data.locations) ? data.locations : [];

    let originOpts = '';
    let destOpts = '';

    locationsList.forEach((loc, idx) => {
      const label = `${loc.name} (${loc.country}) - ${loc.type.toUpperCase()}`;
      originOpts += `<option value="${loc.id}" ${idx === 0 ? 'selected' : ''}>${label}</option>`;
      destOpts += `<option value="${loc.id}" ${idx === 1 ? 'selected' : ''}>${label}</option>`;
    });

    originSel.innerHTML = originOpts;
    destSel.innerHTML = destOpts;

    if (locationsList.length > 0) {
      orderState.originId = locationsList[0].id;
      orderState.originName = locationsList[0].name;
    }
    if (locationsList.length > 1) {
      orderState.destId = locationsList[1].id;
      orderState.destName = locationsList[1].name;
    }
  } catch (err) {
    console.error('Failed to load locations:', err);
  }
}

function attachWizardListeners() {
  // Service category radio toggle
  const radFreight = document.querySelector('input[name="orderCategory"][value="cargo"]');
  const radOps = document.querySelector('input[name="orderCategory"][value="service"]');
  const subCargo = document.getElementById('subPanelCargo');
  const subOps = document.getElementById('subPanelOps');
  const lblFreight = document.getElementById('lblOptFreight');
  const lblOps = document.getElementById('lblOptOps');

  if (radFreight && radOps) {
    radFreight.addEventListener('change', () => {
      orderState.category = 'cargo';
      subCargo.style.display = 'block';
      subOps.style.display = 'none';
      lblFreight.classList.add('is-selected');
      lblOps.classList.remove('is-selected');
    });
    radOps.addEventListener('change', () => {
      orderState.category = 'service';
      subCargo.style.display = 'none';
      subOps.style.display = 'block';
      lblFreight.classList.remove('is-selected');
      lblOps.classList.add('is-selected');
    });
  }

  // Submit Operational Service Request
  const btnSubmitOps = document.getElementById('btnSubmitOpsRequest');
  if (btnSubmitOps) {
    btnSubmitOps.addEventListener('click', handleOpsSubmit);
  }

  // Navigation Steps
  const btnStep2 = document.getElementById('btnGoToStep2');
  if (btnStep2) btnStep2.addEventListener('click', handleGoToStep2);

  const btnBackStep1 = document.getElementById('btnBackToStep1');
  if (btnBackStep1) btnBackStep1.addEventListener('click', () => setStep(1));

  const btnStep3 = document.getElementById('btnGoToStep3');
  if (btnStep3) btnStep3.addEventListener('click', handleGoToStep3);

  const btnBackStep2 = document.getElementById('btnBackToStep2');
  if (btnBackStep2) btnBackStep2.addEventListener('click', () => setStep(2));

  const btnStep4 = document.getElementById('btnGoToStep4');
  if (btnStep4) btnStep4.addEventListener('click', handleGoToStep4);

  const btnBackStep3 = document.getElementById('btnBackToStep3');
  if (btnBackStep3) btnBackStep3.addEventListener('click', () => setStep(3));

  const btnConfirm = document.getElementById('btnConfirmBooking');
  if (btnConfirm) btnConfirm.addEventListener('click', handleConfirmBooking);

  const btnAnother = document.getElementById('btnBookAnother');
  if (btnAnother) btnAnother.addEventListener('click', resetWizard);

  // Origin / Destination Select Change
  const originSel = document.getElementById('originLocation');
  const destSel = document.getElementById('destLocation');
  if (originSel) {
    originSel.addEventListener('change', (e) => {
      orderState.originId = e.target.value;
      const found = locationsList.find(l => l.id === e.target.value);
      if (found) orderState.originName = found.name;
      updateRouteMap();
    });
  }
  if (destSel) {
    destSel.addEventListener('change', (e) => {
      orderState.destId = e.target.value;
      const found = locationsList.find(l => l.id === e.target.value);
      if (found) orderState.destName = found.name;
      updateRouteMap();
    });
  }
}

function setStep(stepNum) {
  // Update panels
  document.getElementById('stepPanel1').style.display = stepNum === 1 ? 'block' : 'none';
  document.getElementById('stepPanel2').style.display = stepNum === 2 ? 'block' : 'none';
  document.getElementById('stepPanel3').style.display = stepNum === 3 ? 'block' : 'none';
  document.getElementById('stepPanel4').style.display = stepNum === 4 ? 'block' : 'none';
  document.getElementById('successPanel').style.display = stepNum === 'success' ? 'block' : 'none';

  // Update stepper indicators
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`stepIndicator${i}`);
    if (!el) continue;
    el.classList.remove('is-active', 'is-completed', 'is-pending');
    if (stepNum === 'success' || i < stepNum) {
      el.classList.add('is-completed');
    } else if (i === stepNum) {
      el.classList.add('is-active');
    } else {
      el.classList.add('is-pending');
    }
  }

  // Scroll to top of wizard
  window.scrollTo({ top: 120, behavior: 'smooth' });

  // Map invalidate size when step 2 opens
  if (stepNum === 2 && routeMap) {
    setTimeout(() => {
      routeMap.invalidateSize();
      updateRouteMap();
    }, 200);
  }
}

function handleGoToStep2() {
  const descEl = document.getElementById('cargoDesc');
  const weightEl = document.getElementById('cargoWeight');
  const countEl = document.getElementById('packagesCount');

  let valid = true;

  if (!descEl.value.trim()) {
    document.getElementById('fieldCargoDesc').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fieldCargoDesc').classList.remove('has-error');
  }

  if (!weightEl.value.trim()) {
    document.getElementById('fieldCargoWeight').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fieldCargoWeight').classList.remove('has-error');
  }

  if (!countEl.value || parseInt(countEl.value, 10) < 1) {
    document.getElementById('fieldPackagesCount').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fieldPackagesCount').classList.remove('has-error');
  }

  if (!valid) return;

  orderState.cargoType = document.getElementById('cargoType').value;
  orderState.vehiclePref = document.getElementById('vehiclePref').value;
  orderState.cargoDesc = descEl.value.trim();
  orderState.cargoWeight = weightEl.value.trim();
  orderState.packagesCount = parseInt(countEl.value, 10) || 1;

  // Handling checks
  const handling = [];
  if (document.getElementById('chkFragile').checked) handling.push('Fragile');
  if (document.getElementById('chkKeepDry').checked) handling.push('Keep Dry');
  if (document.getElementById('chkPalletized').checked) handling.push('Palletized');
  if (document.getElementById('chkHeavyLift').checked) handling.push('Heavy Lift');
  orderState.handling = handling;

  setStep(2);
}

function handleGoToStep3() {
  const originEl = document.getElementById('originLocation');
  const destEl = document.getElementById('destLocation');
  const pickupAddrEl = document.getElementById('pickupAddress');
  const delivAddrEl = document.getElementById('deliveryAddress');
  const pickupDateEl = document.getElementById('pickupDate');

  let valid = true;

  if (!originEl.value) {
    document.getElementById('fieldOriginLocation').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fieldOriginLocation').classList.remove('has-error');
  }

  if (!destEl.value || destEl.value === originEl.value) {
    document.getElementById('fieldDestLocation').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fieldDestLocation').classList.remove('has-error');
  }

  if (!valid) return;

  orderState.originId = originEl.value;
  const oFound = locationsList.find(l => l.id === originEl.value);
  orderState.originName = oFound ? oFound.name : originEl.value;

  orderState.destId = destEl.value;
  const dFound = locationsList.find(l => l.id === destEl.value);
  orderState.destName = dFound ? dFound.name : destEl.value;

  orderState.pickupAddress = pickupAddrEl.value.trim() || orderState.originName;
  orderState.deliveryAddress = delivAddrEl.value.trim() || orderState.destName;
  orderState.pickupDate = pickupDateEl.value || new Date().toISOString().slice(0, 10);
  orderState.goodsOriginCountry = document.getElementById('goodsOriginCountry').value.trim() || 'Sudan';

  setStep(3);
  fetchQuotes();
}

async function fetchQuotes() {
  const container = document.getElementById('modesContainer');
  const btnNext = document.getElementById('btnGoToStep4');
  btnNext.disabled = true;
  orderState.selectedMode = '';
  orderState.selectedQuote = null;

  container.innerHTML = `
    <div style="grid-column: span 3; text-align: center; padding: 32px; color: var(--cj-text-muted);">
      <div style="display:inline-block;width:20px;height:20px;border:2px solid var(--cj-border);border-top-color:var(--cj-teal);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div style="margin-top:8px;">Calculating schedules, transit times and rates...</div>
    </div>
  `;

  try {
    const url = `/api/quote?origin=${encodeURIComponent(orderState.originId)}&destination=${encodeURIComponent(orderState.destId)}&weight=${encodeURIComponent(orderState.cargoWeight)}&service=cargo`;
    const res = await fetch(url);
    const data = await res.json();

    availableQuotes = (data && data.quotes) ? data.quotes : [];
    renderModeCards(availableQuotes);
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 24px; color: #b91c1c;">
        Unable to fetch rates. Please check route endpoints and try again.
      </div>
    `;
  }
}

function renderModeCards(quotes) {
  const container = document.getElementById('modesContainer');

  const modeDefs = [
    {
      id: 'road',
      name: 'Road Freight',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/></svg>`,
      desc: 'National highway corridors, flatbed trailers & dry trucks.'
    },
    {
      id: 'sea',
      name: 'Sea Freight',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1"/><path d="M4 18L3 12h18l-1 6"/><path d="M12 4v8"/><path d="M8 8l4-4 4 4"/></svg>`,
      desc: 'Red Sea maritime shipping, container vessels & bulk cargo.'
    },
    {
      id: 'air',
      name: 'Air Freight',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
      desc: 'Scheduled air cargo for urgent consignments.'
    }
  ];

  let html = '';
  let autoSelectedFirstAvailable = false;

  modeDefs.forEach(def => {
    const q = quotes.find(item => item.mode === def.id && item.active !== 0 && item.mode !== 'on request');

    if (q) {
      const isFastest = q.fastest ? `<span class="cj-badge cj-badge-fastest">Fastest</span>` : '';
      const isCheapest = q.cheapest ? `<span class="cj-badge cj-badge-cheapest">Lowest Cost</span>` : '';
      const priceText = q.price_from ? `$${q.price_from.toLocaleString()} ${q.currency || 'USD'}` : 'Quoted on request';
      const daysText = (q.days_min && q.days_max) ? `${q.days_min} - ${q.days_max} Business Days` : 'Scheduled Transit';
      const etaText = (q.eta_min_date && q.eta_max_date) ? `Est. Delivery: ${q.eta_min_date} to ${q.eta_max_date}` : 'Custom delivery window';

      html += `
        <div class="cj-mode-card" data-mode="${def.id}" tabindex="0">
          <div class="cj-mode-badges">${isFastest}${isCheapest}</div>
          <div class="cj-mode-header">
            <div class="cj-mode-icon">${def.icon}</div>
            <h3 class="cj-mode-name">${def.name}</h3>
          </div>
          <div class="cj-mode-days">${daysText}</div>
          <div class="cj-mode-eta">${etaText}</div>
          <div class="cj-mode-price-box">
            <div class="cj-mode-price-lbl">Starting Rate</div>
            <div class="cj-mode-price-val">${priceText}</div>
          </div>
        </div>
      `;
    } else {
      // Disabled mode card with clear reason
      let reason = 'Corridor not available between these points.';
      if (def.id === 'sea') reason = 'Maritime port access required for sea freight.';
      if (def.id === 'air') reason = 'Air cargo not scheduled on this direct inland route.';
      if (def.id === 'road') reason = 'Scheduled road route pending dispatch clearance.';

      html += `
        <div class="cj-mode-card is-disabled">
          <div class="cj-mode-badges"></div>
          <div class="cj-mode-header">
            <div class="cj-mode-icon">${def.icon}</div>
            <h3 class="cj-mode-name">${def.name}</h3>
          </div>
          <div class="cj-mode-disabled-note">${reason}</div>
        </div>
      `;
    }
  });

  container.innerHTML = html;

  // Add click listeners to active mode cards
  const cards = container.querySelectorAll('.cj-mode-card:not(.is-disabled)');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      selectModeCard(card.getAttribute('data-mode'));
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectModeCard(card.getAttribute('data-mode'));
      }
    });
  });

  // Auto select fastest or first available
  if (cards.length > 0) {
    const fastestQ = quotes.find(q => q.fastest && q.mode !== 'on request');
    const targetMode = fastestQ ? fastestQ.mode : cards[0].getAttribute('data-mode');
    selectModeCard(targetMode);
  }
}

function selectModeCard(modeId) {
  const cards = document.querySelectorAll('.cj-mode-card');
  cards.forEach(c => c.classList.remove('is-selected'));

  const target = document.querySelector(`.cj-mode-card[data-mode="${modeId}"]`);
  if (target) {
    target.classList.add('is-selected');
    orderState.selectedMode = modeId;
    orderState.selectedQuote = availableQuotes.find(q => q.mode === modeId) || null;
    document.getElementById('btnGoToStep4').disabled = false;
    document.getElementById('modeSelectAlert').style.display = 'none';
  }
}

function handleGoToStep4() {
  if (!orderState.selectedMode) {
    document.getElementById('modeSelectAlert').style.display = 'block';
    return;
  }

  // Populate Review Details
  document.getElementById('revCargoType').textContent = orderState.cargoType;
  document.getElementById('revCargoDesc').textContent = orderState.cargoDesc;
  document.getElementById('revWeightPackages').textContent = `${orderState.cargoWeight} (${orderState.packagesCount} packages)`;
  document.getElementById('revHandling').textContent = orderState.handling.length > 0 ? orderState.handling.join(', ') : 'Standard handling';

  document.getElementById('revOrigin').textContent = orderState.originName;
  document.getElementById('revDestination').textContent = orderState.destName;
  document.getElementById('revPickupAddress').textContent = orderState.pickupAddress;
  document.getElementById('revDeliveryAddress').textContent = orderState.deliveryAddress;

  const modeName = orderState.selectedMode === 'sea' ? 'Sea Freight Transport' : (orderState.selectedMode === 'air' ? 'Air Freight Transport' : 'Road Freight Transport');
  document.getElementById('revModeTitle').textContent = modeName;

  const q = orderState.selectedQuote;
  if (q) {
    const days = (q.days_min && q.days_max) ? `${q.days_min} - ${q.days_max} Days` : 'Scheduled';
    const eta = (q.eta_min_date && q.eta_max_date) ? `Estimated Delivery: ${q.eta_min_date} to ${q.eta_max_date}` : '';
    document.getElementById('revTransitETA').textContent = `${days} | ${eta}`;
    document.getElementById('revQuotedPrice').textContent = q.price_from ? `$${q.price_from.toLocaleString()} ${q.currency || 'USD'}` : 'On Request';
  } else {
    document.getElementById('revTransitETA').textContent = 'Scheduled Delivery';
    document.getElementById('revQuotedPrice').textContent = 'Quoted on request';
  }

  setStep(4);
}

async function handleConfirmBooking() {
  const btn = document.getElementById('btnConfirmBooking');
  const alertBox = document.getElementById('bookingSubmitAlert');
  alertBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Registering Consignment...';

  const instructions = document.getElementById('bookingInstructions').value.trim();

  const payload = {
    pickupLocation: orderState.originName,
    deliveryDestination: orderState.destName,
    pickupAddress: orderState.pickupAddress,
    deliveryAddress: orderState.deliveryAddress,
    originLocationId: orderState.originId,
    destinationLocationId: orderState.destId,
    transportMode: orderState.selectedMode,
    goodsOriginCountry: orderState.goodsOriginCountry,
    cargoType: orderState.cargoType,
    cargoDesc: orderState.cargoDesc,
    cargoWeight: orderState.cargoWeight,
    packagesCount: orderState.packagesCount,
    vehiclePreference: orderState.vehiclePref,
    specialHandling: orderState.handling.join(', '),
    instructions,
    pickupDate: orderState.pickupDate,
    customerType: currentUser.customerType || 'individual'
  };

  try {
    const res = await fetch('/api/cargo/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to submit booking.');
    }

    // Success Screen
    const ref = data.id || (data.booking ? data.booking.id : 'CR-CONFIRMED');
    document.getElementById('successRef').textContent = ref;

    const q = orderState.selectedQuote;
    const etaStr = (q && q.eta_min_date && q.eta_max_date) ? `${q.eta_min_date} to ${q.eta_max_date}` : '3 - 5 business days from pickup';
    document.getElementById('successETA').textContent = etaStr;

    const btnView = document.getElementById('btnViewOrder');
    if (btnView) {
      btnView.href = `/portal?order=${encodeURIComponent(ref)}`;
    }

    setStep('success');
  } catch (err) {
    alertBox.style.display = 'block';
    alertBox.className = 'cj-field has-error';
    alertBox.innerHTML = `<span class="cj-error-msg" style="display:block;">${err.message}</span>`;
    btn.disabled = false;
    btn.textContent = 'Confirm and Book Shipment';
  }
}

async function handleOpsSubmit() {
  const service = document.getElementById('opsServiceType').value;
  const address = document.getElementById('opsAddress').value.trim();
  const preferredDate = document.getElementById('opsPreferredDate').value;
  const priority = document.getElementById('opsPriority').value;
  const description = document.getElementById('opsDescription').value.trim();
  const alertBox = document.getElementById('opsStatusAlert');
  const btn = document.getElementById('btnSubmitOpsRequest');

  if (!address || !description) {
    alertBox.style.display = 'block';
    alertBox.innerHTML = `<div style="color:#b91c1c;font-size:13px;padding:8px;background:#fef2f2;border-radius:4px;">Please provide facility address and work description.</div>`;
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting Request...';

  try {
    const res = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ service, address, preferredDate, priority, description })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to submit request.');

    alertBox.style.display = 'block';
    alertBox.innerHTML = `
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:14px;border-radius:6px;font-size:13.5px;">
        <strong>Request Confirmed!</strong> Service Reference: <strong>${data.id}</strong>.
        Our operations team has received your request.
        <div style="margin-top:10px;">
          <a href="/portal" class="cj-btn-primary" style="padding:6px 16px;font-size:13px;">View in My Account &rarr;</a>
        </div>
      </div>
    `;
    btn.style.display = 'none';
  } catch (err) {
    alertBox.style.display = 'block';
    alertBox.innerHTML = `<div style="color:#b91c1c;font-size:13px;padding:8px;background:#fef2f2;border-radius:4px;">${err.message}</div>`;
    btn.disabled = false;
    btn.textContent = 'Submit Service Request &rarr;';
  }
}

function resetWizard() {
  document.getElementById('cargoDesc').value = '';
  document.getElementById('cargoWeight').value = '';
  document.getElementById('packagesCount').value = '1';
  document.getElementById('pickupAddress').value = '';
  document.getElementById('deliveryAddress').value = '';
  document.getElementById('bookingInstructions').value = '';
  document.getElementById('btnConfirmBooking').disabled = false;
  document.getElementById('btnConfirmBooking').textContent = 'Confirm and Book Shipment';
  setStep(1);
}

/* ==========================================================================
   LEAFLET MAP INTEGRATION (SELF-HOSTED + OPENSTREETMAP TILES)
   ========================================================================== */
function initRouteMap() {
  const mapEl = document.getElementById('orderRouteMap');
  if (!mapEl || typeof L === 'undefined') return;

  try {
    // Default center on Sudan (Khartoum: 15.5007, 32.5599)
    routeMap = L.map('orderRouteMap', {
      center: [15.5007, 32.5599],
      zoom: 6,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(routeMap);

    updateRouteMap();
  } catch (err) {
    console.error('Map init notice:', err);
  }
}

function updateRouteMap() {
  if (!routeMap || locationsList.length === 0) return;

  const originLoc = locationsList.find(l => l.id === orderState.originId);
  const destLoc = locationsList.find(l => l.id === orderState.destId);

  // Clear previous markers & line
  mapMarkers.forEach(m => routeMap.removeLayer(m));
  mapMarkers = [];
  if (mapPolyline) {
    routeMap.removeLayer(mapPolyline);
    mapPolyline = null;
  }

  if (originLoc && originLoc.lat && originLoc.lng) {
    const oMarker = L.circleMarker([originLoc.lat, originLoc.lng], {
      radius: 8,
      fillColor: '#0e3b43',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 1
    }).addTo(routeMap).bindPopup(`<strong>Origin:</strong> ${originLoc.name}`);
    mapMarkers.push(oMarker);
  }

  if (destLoc && destLoc.lat && destLoc.lng) {
    const dMarker = L.circleMarker([destLoc.lat, destLoc.lng], {
      radius: 8,
      fillColor: '#f2c230',
      color: '#071f24',
      weight: 2,
      opacity: 1,
      fillOpacity: 1
    }).addTo(routeMap).bindPopup(`<strong>Destination:</strong> ${destLoc.name}`);
    mapMarkers.push(dMarker);
  }

  if (originLoc && originLoc.lat && destLoc && destLoc.lat) {
    const latlngs = [
      [originLoc.lat, originLoc.lng],
      [destLoc.lat, destLoc.lng]
    ];
    mapPolyline = L.polyline(latlngs, {
      color: '#0e3b43',
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.8
    }).addTo(routeMap);

    routeMap.fitBounds(latlngs, { padding: [40, 40], maxZoom: 8 });
  }
}

