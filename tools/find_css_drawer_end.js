const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/css/asil-core.css', 'utf8');

const startIdx = code.indexOf('/* Mobile Drawer Menu */');
console.log(code.substring(startIdx, startIdx + 2000));
