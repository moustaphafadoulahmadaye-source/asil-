const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/admin.html', 'utf8').split('\n');

console.log(lines.slice(940, 1020).join('\n'));
