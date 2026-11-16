/**
 * ASIL Logistics - Air Freight & Aviation Operations Script (air.js)
 * CSP-compliant client handling for air cargo quotation intake.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('airQuoteForm');
  const alertBox = document.getElementById('airQuoteAlert');
  const submitBtn = document.getElementById('btnSubmitAirQuote');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      const payload = {
        category: 'quote',
        department: 'distribution',
        name: document.getElementById('airContactName').value.trim(),
        email: document.getElementById('airEmail').value.trim(),
        phone: document.getElementById('airPhone').value.trim(),
        subject: 'Air Freight Quote: ' + document.getElementById('airOrigin').value + ' to ' + document.getElementById('airDestination').value,
        message: 'Air Service Class: ' + document.getElementById('airServiceType').value + '\nWeight / Dimensions: ' + document.getElementById('airWeight').value + '\n\n' + document.getElementById('airNotes').value.trim()
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
            alertBox.innerHTML = '<strong>Air Freight Quote Request Received!</strong> Reference: <code>' + (data.reference || 'INQ-AIR') + '</code>. Our aviation logistics coordinators will contact you shortly.';
          }
          form.reset();
        } else {
          throw new Error(data.error || 'Failed to submit quote request');
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
          submitBtn.textContent = 'Submit Air Quote Request →';
        }
      }
    });
  }
});
