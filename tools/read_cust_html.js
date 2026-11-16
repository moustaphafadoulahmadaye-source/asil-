const fs = require('fs');
const content = fs.readFileSync('asil-logistics/public/customer.html', 'utf8');

console.log('customer.html length:', content.length);
console.log(content.substring(0, 1500));
