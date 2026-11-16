const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/asil-common.js', 'utf8');

const idx = code.indexOf('function initMobileMenu');
console.log(code.substring(idx - 40, idx + 1400));
