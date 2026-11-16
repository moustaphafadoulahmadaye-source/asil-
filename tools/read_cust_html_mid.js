const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/customer.html', 'utf8').split('\n');

console.log(lines.slice(25, 90).join('\n'));
