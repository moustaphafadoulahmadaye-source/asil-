const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/asil-common.js', 'utf8');

console.log(code.substring(22950, 23200));
