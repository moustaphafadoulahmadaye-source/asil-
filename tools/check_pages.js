const fs = require('fs');
const pages = [
  'index.html',
  'transport.html',
  'distribution.html',
  'maintenance.html',
  'onboarding.html',
  'customer.html',
  'admin.html',
  'privacy.html',
  'terms.html',
  '404.html'
];

console.log('PAGE'.padEnd(20) + 'HAS_BTN'.padEnd(12) + 'HAS_MENU'.padEnd(12) + 'HAS_COMMON'.padEnd(12));
console.log('-'.repeat(56));

pages.forEach(p => {
  const filePath = 'public/' + p;
  if (!fs.existsSync(filePath)) {
    console.log(p.padEnd(20) + 'MISSING');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const hasBtn = content.includes('id="btnMobileToggle"');
  const hasMenu = content.includes('id="mobile-menu"');
  const hasCommon = content.includes('/js/asil-common.js') || content.includes('js/asil-common.js');
  console.log(p.padEnd(20) + String(hasBtn).padEnd(12) + String(hasMenu).padEnd(12) + String(hasCommon).padEnd(12));
});
