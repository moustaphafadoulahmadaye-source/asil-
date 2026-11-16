const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/asil-common.js', 'utf8');

const matches = [...code.matchAll(/initMobileMenu/g)].map(m => m.index);
console.log('initMobileMenu called at indices:', matches);

// Check end of initMobileMenu
const idx = code.indexOf('function initMobileMenu');
console.log(code.substring(idx + 1300, idx + 1800));
