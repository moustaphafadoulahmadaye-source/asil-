const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/customer.html', 'utf8').split('\n');

const authIdx = lines.findIndex(l => l.includes('id="authSection"'));
console.log('authSection at line:', authIdx + 1);
console.log(lines.slice(authIdx, authIdx + 30).join('\n'));
