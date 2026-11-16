/**
 * ASIL Logistics - Sea Freight & Maritime Operations Script (sea.js)
 * CSP-compliant client handling for maritime quotation intake.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('seaQuoteForm');
  const alertBox = document.getElementById('seaQuoteAlert');
  const submitBtn = document.getElementById('btnSubmitSeaQuote');

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
        name: document.getElementById('seaContactName').value.trim(),
        email: document.getElementById('seaEmail').value.trim(),
        phone: document.getElementById('seaPhone').value.trim(),
        subject: 'Sea Freight Quote: ' + document.getElementById('seaOrigin').value + ' to ' + document.getElementById('seaDestination').value,
        message: 'Container Class: ' + document.getElementById('seaContainerType').value + '\n\n' + document.getElementById('seaNotes').value.trim()
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
            alertBox.innerHTML = '<strong>Maritime Quote Request Received!</strong> Reference: <code>' + (data.reference || 'INQ-SEA') + '</code>. Our Port Sudan controllers will contact you shortly.';
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
          submitBtn.textContent = 'Submit Maritime Quote Request →';
        }
      }
    });
  }
});
