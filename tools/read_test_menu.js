const fs = require('fs');
const code = fs.readFileSync('asil-logistics/tools/test_mobile_menu.js', 'utf8');

console.log(code.substring(0, 800));
