const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/customer.html', 'utf8').split('\n');

const regIdx = lines.findIndex(l => l.includes('id="regCompGroup"'));
console.log('regCompGroup at line:', regIdx + 1);
console.log(lines.slice(Math.max(0, regIdx - 15), regIdx + 10).join('\n'));
