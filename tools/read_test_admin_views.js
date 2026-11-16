const fs = require('fs');
const code = fs.readFileSync('asil-logistics/tools/test_admin_views_full.js', 'utf8');

console.log('test_admin_views_full.js length:', code.length);
console.log(code.substring(0, 1200));
