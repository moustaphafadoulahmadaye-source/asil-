const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/admin.html', 'utf8').split('\n');

const custIdx = lines.findIndex(l => l.includes('id="tab-customers"'));
console.log('tab-customers at line:', custIdx + 1);
console.log(lines.slice(custIdx, custIdx + 50).join('\n'));
