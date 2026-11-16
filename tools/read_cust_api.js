const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const custIdx = lines.findIndex(l => l.includes("app.get('/api/admin/customers/individual'"));
console.log('GET /api/admin/customers/individual at line:', custIdx + 1);
if (custIdx !== -1) {
  console.log(lines.slice(custIdx - 5, custIdx + 70).join('\n'));
}
