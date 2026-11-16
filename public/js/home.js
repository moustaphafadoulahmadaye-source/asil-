/**
 * ASIL Logistics - Home Page Interactive Logic
 * Self-contained external module (Compliant with strict CSP without 'unsafe-inline')
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Populate contact details from COMPANY configuration
  initCompanyContactInfo();

  // 2. Attach Event Listeners (Zero inline onclick/onsubmit handlers)
  attachHomeEventListeners();
});

function initCompanyContactInfo() {
  const contactBox = document.getElementById('home-contact-info');
  if (!contactBox || typeof COMPANY === 'undefined') return;

  const contactItems = [];
  if (isCompanyConfigured(COMPANY.phone)) {
    const phoneHref = `tel:${COMPANY.phone.replace(/\s+/g, '')}`;
    contactItems.push(`
      <div class="contact-info-row">
        <div class="contact-icon-badge">${ICONS.phone}</div>
        <div>
          <span class="contact-label">Operations Hotline</span>
          <a href="${phoneHref}" class="contact-value-link">${esc(COMPANY.phone)}</a>
        </div>
      </div>
    `);
  }
  if (isCompanyConfigured(COMPANY.email)) {
    contactItems.push(`
      <div class="contact-info-row">
        <div class="contact-icon-badge">${ICONS.email}</div>
        <div>
          <span class="contact-label">General Inquiries</span>
          <a href="mailto:${esc(COMPANY.email)}" class="contact-value-link">${esc(COMPANY.email)}</a>
        </div>
      </div>
    `);
  }
  if (isCompanyConfigured(COMPANY.address)) {
    contactItems.push(`
      <div class="contact-info-row">
        <div class="contact-icon-badge">${ICONS.pin}</div>
        <div>
          <span class="contact-label">Headquarters</span>
          <span class="contact-value-text">${esc(COMPANY.address)}</span>
        </div>
      </div>
    `);
  }
  if (COMPANY.workingHours && String(COMPANY.workingHours).trim()) {
    contactItems.push(`
      <div class="contact-info-row">
        <div class="contact-icon-badge">${ICONS.clock}</div>
        <div>
          <span class="contact-label">Operations Schedule</span>
          <span class="contact-value-text">${esc(COMPANY.workingHours)}</span>
        </div>
      </div>
    `);
  }
  contactBox.innerHTML = contactItems.join('');
}

function attachHomeEventListeners() {
  // Quick Tracker Form
  const quickTrackForm = document.getElementById('quickTrackForm');
  if (quickTrackForm) {
    quickTrackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      lookupQuickTrack();
    });
  }
  const btnTrack = document.getElementById('btnQuickTrack');
  if (btnTrack && !quickTrackForm) {
    btnTrack.addEventListener('click', lookupQuickTrack);
  }

  // Quick track Enter key in inputs
  ['quickTrackInput', 'quickTrackVerifier'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          lookupQuickTrack();
        }
      });
    }
  });

  // Proposal Service Chips
  document.querySelectorAll('[data-service]').forEach(btn => {
    btn.addEventListener('click', () => {
      const srv = btn.getAttribute('data-service');
      if (srv) selectProposalService(srv);
    });
  });

  // Proposal Service Dropdown change
  const srvSelect = document.getElementById('srvType');
  if (srvSelect) {
    srvSelect.addEventListener('change', (e) => {
      handleServiceSelectionChange(e.target.value);
    });
  }

  // Proposal Service Intake Form submit
  const proposalForm = document.getElementById('proposalServiceForm');
  if (proposalForm) {
    proposalForm.addEventListener('submit', submitProposalServiceRequest);
  }

  // General Inquiries & Quotations Contact Form submit
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', submitInquiry);
  }

  // Inquiry Category Switcher (General vs Quotation)
  const tabContact = document.getElementById('tabInqContact');
  const tabQuote = document.getElementById('tabInqQuote');
  const inqCat = document.getElementById('inquiryCategory');
  const inqTitle = document.getElementById('inquiryTitle');
  const inqSub = document.getElementById('inquirySub');
  const btnSubmit = document.getElementById('btnSubmitInquiry') || document.getElementById('btnSendInquiry');
  const deptSelect = document.getElementById('contactDept') || document.getElementById('cntDept');

  if (tabContact && tabQuote && inqCat) {
    tabContact.addEventListener('click', () => {
      inqCat.value = 'contact';
      tabContact.style.background = 'var(--primary)';
      tabContact.style.color = '#fff';
      tabContact.style.border = 'none';
      tabQuote.style.background = '#ffffff';
      tabQuote.style.color = 'var(--text-head)';
      tabQuote.style.border = '1px solid var(--border-medium)';
      if (inqTitle) inqTitle.textContent = 'Send an Inquiry to Dispatch';
      if (inqSub) inqSub.textContent = 'Fill in your operational requirements. Our central coordinator will review and reply promptly.';
      if (btnSubmit) btnSubmit.textContent = 'Send Message to Operations \u2192';
    });

    tabQuote.addEventListener('click', () => {
      inqCat.value = 'quote';
      tabQuote.style.background = 'var(--primary)';
      tabQuote.style.color = '#fff';
      tabQuote.style.border = 'none';
      tabContact.style.background = '#ffffff';
      tabContact.style.color = 'var(--text-head)';
      tabContact.style.border = '1px solid var(--border-medium)';
      if (inqTitle) inqTitle.textContent = 'Request a Service Quotation';
      if (inqSub) inqSub.textContent = 'Provide route and consignment details. Our commercial desk will calculate and return your official quote.';
      if (btnSubmit) btnSubmit.textContent = 'Submit Quotation Request \u2192';
      if (deptSelect && deptSelect.querySelector('option[value*="Cargo"]')) {
        deptSelect.value = 'Cargo & Freight Haulage';
      }
    });
  }
}

async function lookupQuickTrack() {
  const inputEl = document.getElementById('quickTrackInput');
  const verifierEl = document.getElementById('quickTrackVerifier');
  const resBox = document.getElementById('quickTrackResult');
  if (!inputEl || !resBox) return;

  const q = inputEl.value.trim().toUpperCase();
  const verifier = verifierEl ? verifierEl.value.trim() : '';

  if (!q) {
    showToast('Please enter a booking or consignment reference', 'error');
    inputEl.focus();
    return;
  }
  if (!verifier) {
    showToast('Please enter phone last 4 digits or email for verification', 'error');
    if (verifierEl) verifierEl.focus();
    return;
  }

  resBox.style.display = 'block';
  resBox.innerHTML = `
    <div class="track-loading">
      <span class="track-spinner"></span>
      Checking secure logistics registry...
    </div>
  `;

  try {
    const res = await api('/api/bookings/' + encodeURIComponent(q) + '?verifier=' + encodeURIComponent(verifier));
    const b = res.booking;
    resBox.innerHTML = `
      <div class="track-result-card">
        <div class="track-result-head">
          <div class="track-ref-id">
            <span class="track-dot"></span>
            <strong>${esc(b.id)}</strong>
          </div>
          ${statusBadge(b.status)}
        </div>
        <div class="track-result-body">
          <div class="track-info-item">
            <span class="track-info-label">Service Type:</span>
            <span class="track-info-val">${esc(b.bookingType || 'Logistics Consignment')}</span>
          </div>
          <div class="track-info-item">
            <span class="track-info-label">Corridor:</span>
            <span class="track-info-val">${esc(b.departure || b.pickupLocation || 'Origin')} &rarr; ${esc(b.destination || b.deliveryDestination || 'Destination')}</span>
          </div>
          <div class="track-info-item">
            <span class="track-info-label">Scheduled Date:</span>
            <span class="track-info-val">${esc(b.travelDate || b.pickupDate || 'In Dispatch Schedule')}</span>
          </div>
          ${b.assignedVehicle ? `
            <div class="track-info-item">
              <span class="track-info-label">Assigned Vehicle:</span>
              <span class="track-info-val">${esc(b.assignedVehicle)}</span>
            </div>
          ` : ''}
        </div>
        <div class="track-result-footer">
          <strong>Latest Milestone:</strong> ${(b.log && b.log.length > 0) ? esc(b.log[b.log.length - 1].note || b.log[b.log.length - 1].step) : 'Consignment registered and scheduled for dispatch review.'}
        </div>
      </div>
    `;
  } catch (err) {
    resBox.innerHTML = `
      <div class="track-error-card">
        <strong>Reference Mismatch:</strong> ${esc(err.message || 'Reference not found in active tracking registry')}
      </div>
    `;
  }
}

function selectProposalService(serviceName) {
  const srvSelect = document.getElementById('srvType');
  if (srvSelect) {
    let matched = false;
    for (let i = 0; i < srvSelect.options.length; i++) {
      if (srvSelect.options[i].value === serviceName || srvSelect.options[i].text.includes(serviceName)) {
        srvSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (let i = 0; i < srvSelect.options.length; i++) {
        if (srvSelect.options[i].value.toLowerCase().includes(serviceName.toLowerCase()) ||
          serviceName.toLowerCase().includes(srvSelect.options[i].value.toLowerCase())) {
          srvSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
    }
    handleServiceSelectionChange(srvSelect.value);
  }
  const target = document.getElementById('service-request');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
    const orgInput = document.getElementById('srvOrg');
    if (orgInput) orgInput.focus();
  }
}

function handleServiceSelectionChange(val) {
  const textarea = document.getElementById('srvDetails');
  const label = document.getElementById('srvDetailsLabel');
  if (!textarea) return;

  const v = (val || '').toLowerCase();
  if (v.includes('warehous') || v.includes('inventory')) {
    if (label) label.textContent = 'Storage & Inventory Specifications *';
    textarea.placeholder = 'Specify goods/materials, estimated pallets or volume, short-term or long-term duration, and inventory reporting requirements...';
  } else if (v.includes('procur') || v.includes('sourc') || v.includes('customs') || v.includes('clearance')) {
    if (label) label.textContent = 'Procurement Scope & Item Descriptions *';
    textarea.placeholder = 'List items, tools, equipment or supplies required, estimated quantities, and target site delivery location...';
  } else if (v.includes('clean')) {
    if (label) label.textContent = 'Facility Cleaning Scope *';
    textarea.placeholder = 'Specify premises type (office, warehouse, post-construction), estimated area (sq meters), and preferred schedule (one-time or routine contract)...';
  } else if (v.includes('garden') || v.includes('landscap')) {
    if (label) label.textContent = 'Compound Grounds & Landscape Scope *';
    textarea.placeholder = 'Describe compound grounds, lawn mowing, tree trimming, garden restoration, or ongoing landscaping upkeep needs...';
  } else if (v.includes('transport') || v.includes('fleet') || v.includes('passenger')) {
    if (label) label.textContent = 'Passenger Route & Group Details *';
    textarea.placeholder = 'Pickup and drop-off points, passenger count, vehicle preference (sedan, SUV, van, bus), and journey dates...';
  } else if (v.includes('distribut') || v.includes('freight') || v.includes('cargo') || v.includes('delivery')) {
    if (label) label.textContent = 'Cargo & Consignment Details *';
    textarea.placeholder = 'Cargo description, weight/volume, pickup origin, destination city/region, and delivery timeframe...';
  } else if (v.includes('maint')) {
    if (label) label.textContent = 'Facility Maintenance & Work Orders *';
    textarea.placeholder = 'Describe required repairs (electrical, plumbing, A/C, structural), building address, and current issue symptoms...';
  } else {
    if (label) label.textContent = 'Service Scope & Operational Details *';
    textarea.placeholder = 'Describe your required operational services, target dates, locations, and any specific client specifications...';
  }
}

async function submitProposalServiceRequest(e) {
  e.preventDefault();
  const serviceType = document.getElementById('srvType') ? document.getElementById('srvType').value : 'General Service';
  const org = document.getElementById('srvOrg') ? document.getElementById('srvOrg').value.trim() : '';
  const name = document.getElementById('srvName') ? document.getElementById('srvName').value.trim() : '';
  const phone = document.getElementById('srvPhone') ? document.getElementById('srvPhone').value.trim() : '';
  const email = document.getElementById('srvEmail') ? document.getElementById('srvEmail').value.trim() : '';
  const dateNeeded = document.getElementById('srvDate') ? document.getElementById('srvDate').value : '';
  const details = document.getElementById('srvDetails') ? document.getElementById('srvDetails').value.trim() : '';
  const isUrgent = document.getElementById('srvUrgent') ? document.getElementById('srvUrgent').checked : false;
  const hp = document.getElementById('srvWebsiteHp') ? document.getElementById('srvWebsiteHp').value : '';

  const btn = document.getElementById('btnSubmitProposalRequest');
  const successBox = document.getElementById('srvSuccessMsg');
  const errorBox = document.getElementById('srvErrorMsg');

  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Submitting Request...';
  }
  if (successBox) successBox.style.display = 'none';
  if (errorBox) errorBox.style.display = 'none';

  const combinedName = org ? `${name} (${org})` : name;
  const combinedMessage = `[Service: ${serviceType}]\n[Required By: ${dateNeeded || 'Not Specified'}]\n[Priority: ${isUrgent ? 'URGENT' : 'Standard'}]\n\n${details}`;

  try {
    const res = await api('/api/inquiries', {
      method: 'POST',
      body: {
        name: combinedName,
        email,
        phone,
        department: serviceType,
        message: combinedMessage,
        _hp: hp
      }
    });

    const form = document.getElementById('proposalServiceForm');
    if (form) form.reset();

    if (successBox) {
      successBox.innerHTML = `
        <div class="feedback-box success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <div>
            <strong>Service Request Successfully Received!</strong><br>
            Your inquiry reference is <strong>${esc(res.id || '')}</strong>. Our operations desk is reviewing your requirements and will contact you at <strong>${esc(phone)}</strong> promptly.
          </div>
        </div>
      `;
      successBox.style.display = 'block';
    }
    showToast('Service request submitted successfully', 'success');
  } catch (err) {
    if (errorBox) {
      errorBox.innerHTML = `
        <div class="feedback-box error">
          <strong>Submission Error:</strong> ${esc(err.error || err.message || 'Failed to submit service request')}
        </div>
      `;
      errorBox.style.display = 'block';
    }
    showToast(err.error || err.message || 'Failed to submit service request', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Submit Quote Request \u2192';
    }
  }
}

async function submitInquiry(e) {
  e.preventDefault();
  const nameEl = document.getElementById('contactName') || document.getElementById('cntName');
  const emailEl = document.getElementById('contactEmail') || document.getElementById('cntEmail');
  const phoneEl = document.getElementById('contactPhone') || document.getElementById('cntPhone');
  const deptEl = document.getElementById('contactDept') || document.getElementById('cntDept');
  const msgEl = document.getElementById('contactMessage') || document.getElementById('cntMsg') || document.getElementById('cntMessage');
  const catEl = document.getElementById('inquiryCategory');
  const hpEl = document.querySelector('input[name="website"]') || document.getElementById('cntWebsiteHp');
  const statusBox = document.getElementById('contactStatusBox') || document.getElementById('cntSuccessMsg');

  const name = nameEl ? nameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';
  const phone = phoneEl ? phoneEl.value.trim() : '';
  const dept = deptEl ? deptEl.value : 'General';
  const msg = msgEl ? msgEl.value.trim() : '';
  const category = catEl ? catEl.value : 'contact';
  const hp = hpEl ? hpEl.value : '';

  const btn = document.getElementById('btnSubmitInquiry') || document.getElementById('btnSendInquiry');
  const originalText = btn ? btn.textContent : 'Send Message \u2192';
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Transmitting...';
  }

  try {
    const res = await api('/api/inquiries', {
      method: 'POST',
      body: {
        name,
        email,
        phone,
        department: dept,
        message: msg,
        category,
        _hp: hp
      }
    });

    const form = document.getElementById('contactForm');
    if (form) form.reset();
    if (catEl) catEl.value = category;

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.background = '#f0fdf4';
      statusBox.style.border = '1px solid #bbf7d0';
      statusBox.style.color = '#16a34a';
      statusBox.style.padding = '14px 16px';
      statusBox.style.borderRadius = '6px';
      statusBox.style.marginBottom = '16px';
      statusBox.style.fontWeight = '600';
      statusBox.style.fontSize = '14px';
      const typeLabel = category === 'quote' ? 'quotation request' : 'inquiry message';
      statusBox.innerHTML = `<strong>Success!</strong> Your ${typeLabel} has been logged in dispatch (Reference: <code>${res.id}</code>). Our coordinator will contact you promptly.`;
    }

    showToast(category === 'quote' ? 'Quotation request submitted successfully!' : 'Inquiry message sent successfully', 'success');
  } catch (err) {
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.background = '#fef2f2';
      statusBox.style.border = '1px solid #fecaca';
      statusBox.style.color = '#dc2626';
      statusBox.style.padding = '14px 16px';
      statusBox.style.borderRadius = '6px';
      statusBox.style.marginBottom = '16px';
      statusBox.textContent = 'Error: ' + (err.error || err.message || 'Failed to submit inquiry');
    }
    showToast(err.error || err.message || 'Failed to submit inquiry', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}
