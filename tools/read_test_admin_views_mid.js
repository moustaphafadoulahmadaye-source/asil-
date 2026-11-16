const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/tools/test_admin_views_full.js', 'utf8').split('\n');

console.log(lines.slice(40, 150).join('\n'));
