const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/customer.html', 'utf8').split('\n');

console.log(lines.slice(45, 75).join('\n'));
