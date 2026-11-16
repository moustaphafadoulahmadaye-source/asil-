/**
 * ASIL Logistics - Corporate Subscriptions Script (subscription.js)
 * CSP-compliant client handling for subscription tier selection and application submission.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('subscriptionForm');
  const alertBox = document.getElementById('subAlert');
  const submitBtn = document.getElementById('btnSubmitSub');
  const tierSelect = document.getElementById('subTier');

  // Handle tier selection buttons on the pricing cards
  document.querySelectorAll('[data-select-tier]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tier = btn.getAttribute('data-select-tier');
      if (tierSelect && tier) {
        tierSelect.value = tier;
        const formSection = document.getElementById('subscription-form-section');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing Application...';
      }

      const payload = {
        category: 'subscription',
        department: 'onboarding',
        name: document.getElementById('subContactName').value.trim(),
        email: document.getElementById('subEmail').value.trim(),
        phone: document.getElementById('subPhone').value.trim(),
        subject: 'Corporate Subscription Application: ' + document.getElementById('subTier').value,
        message: 'Organization: ' + document.getElementById('subCompanyName').value.trim() + 
                 '\nSector: ' + document.getElementById('subSector').value + 
                 '\nSelected Tier: ' + document.getElementById('subTier').value + 
                 '\nBilling Cycle: ' + document.getElementById('subBillingCycle').value + 
                 '\n\nOperational Requirements:\n' + document.getElementById('subRequirements').value.trim()
      };

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = '#dcfce7';
            alertBox.style.color = '#15803d';
            alertBox.style.border = '1px solid #86efac';
            alertBox.innerHTML = '<strong>Subscription Application Received!</strong> Application Reference: <code>' + (data.reference || 'SUB-2026') + '</code>. An ASIL Corporate Account Executive will contact you within 4 business hours to finalize your service level agreement (SLA) and activation.';
          }
          form.reset();
        } else {
          throw new Error(data.error || 'Failed to submit subscription application');
        }
      } catch (err) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fee2e2';
          alertBox.style.color = '#b91c1c';
          alertBox.style.border = '1px solid #fca5a5';
          alertBox.textContent = 'Error: ' + err.message;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Subscription Application →';
        }
      }
    });
  }
});
