const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/index.html', 'utf8');

const btnIdx = html.indexOf('btnMobileToggle');
console.log('--- btnMobileToggle in index.html ---');
console.log(html.substring(btnIdx - 100, btnIdx + 200));

const menuIdx = html.indexOf('id="mobile-menu"');
console.log('--- mobile-menu in index.html ---');
console.log(html.substring(menuIdx - 100, menuIdx + 500));
