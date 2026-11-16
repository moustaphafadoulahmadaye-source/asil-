const fs = require('fs');
const path = require('path');

const publicDir = 'asil-logistics/public';

const files = [
  'index.html',
  'transport.html',
  'distribution.html',
  'maintenance.html',
  'onboarding.html',
  'customer.html',
  'order.html',
  'privacy.html',
  'terms.html',
  '404.html',
  'admin.html'
];

files.forEach(f => {
  const filePath = path.join(publicDir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove <button class="mobile-toggle" id="btnMobileToggle"...>...</button>
  content = content.replace(/<button[^>]*id="btnMobileToggle"[\s\S]*?<\/button>/gi, '');

  // Remove <!-- Mobile Drawer Navigation --> and <div class="mobile-menu" id="mobile-menu" ...>...</div>
  content = content.replace(/<!--\s*Mobile Drawer Navigation\s*-->[\s\S]*?<div class="mobile-menu" id="mobile-menu"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  content = content.replace(/<div class="mobile-menu" id="mobile-menu"[^>]*>[\s\S]*?<\/div>/gi, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Purged hamburger/drawer from ${f}`);
});
