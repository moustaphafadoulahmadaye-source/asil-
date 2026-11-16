const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/css/asil-core.css', 'utf8');

const startIdx = code.indexOf('/* Body scroll lock when mobile menu is open */');
console.log(code.substring(startIdx, startIdx + 2000));
