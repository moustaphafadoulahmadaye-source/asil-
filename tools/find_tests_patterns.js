const fs = require('fs');
const path = require('path');

function searchInDir(dir, patterns) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (!stat.isDirectory() && /\.js$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      patterns.forEach(pat => {
        if (content.includes(pat)) {
          console.log(`Match "${pat}" in ${full}`);
        }
      });
    }
  }
}

searchInDir('asil-logistics/tools', [
  'btnMobileToggle',
  'mobile-menu',
  'toggleMobileMenu',
  'mobile-toggle'
]);
