const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/js/customer.js', 'utf8').split('\n');

console.log('Total lines in customer.js:', lines.length);
console.log(lines.slice(Math.max(0, lines.length - 30)).join('\n'));
