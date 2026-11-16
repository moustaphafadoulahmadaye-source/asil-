const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/admin.html', 'utf8').split('\n');

console.log(lines.slice(760, 850).join('\n'));
