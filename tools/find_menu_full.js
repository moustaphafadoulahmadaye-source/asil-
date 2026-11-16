const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/asil-common.js', 'utf8');

const startIdx = code.indexOf('/**\n * Mobile Navigation Drawer Initializer');
const endIdx = code.indexOf('if (typeof document !== \'undefined\' && typeof document.addEventListener === \'function\')');

console.log('startIdx:', startIdx, 'endIdx:', endIdx);
console.log(code.substring(startIdx, endIdx));
