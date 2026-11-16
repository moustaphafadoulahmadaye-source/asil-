const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/js/customer.js', 'utf8').split('\n');

console.log(lines.slice(35, 75).join('\n'));
