const fs = require('fs');

const files = [
  'asil-logistics/public/index.html',
  'asil-logistics/public/transport.html',
  'asil-logistics/public/distribution.html',
  'asil-logistics/public/maintenance.html',
  'asil-logistics/public/onboarding.html',
  'asil-logistics/public/customer.html',
  'asil-logistics/public/order.html',
  'asil-logistics/public/privacy.html',
  'asil-logistics/public/terms.html',
  'asil-logistics/public/404.html',
  'asil-logistics/public/admin.html'
];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const idx = content.indexOf('id="mobile-menu"');
  if (idx !== -1) {
    const snippet = content.substring(idx - 40, idx + 600);
    console.log(`=== ${f} ===\n${snippet.slice(0, 200)}...\n`);
  }
});
