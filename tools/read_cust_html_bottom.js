const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/customer.html', 'utf8').split('\n');

console.log('Total lines:', lines.length);
console.log(lines.slice(Math.max(0, lines.length - 40)).join('\n'));
