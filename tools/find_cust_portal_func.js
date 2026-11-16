const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/customer.js', 'utf8');

const idx = code.indexOf('function renderCustomerPortal');
console.log(code.substring(idx - 50, idx + 800));
