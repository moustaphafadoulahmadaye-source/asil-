const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/asil-common.js', 'utf8');

const navIdx = code.indexOf('initMobileMenu');
console.log('initMobileMenu at:', navIdx);
if (navIdx !== -1) {
  console.log(code.substring(navIdx - 100, navIdx + 1200));
}
