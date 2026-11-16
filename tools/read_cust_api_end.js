const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const custIdx = lines.findIndex(l => l.includes("app.get('/api/admin/customers/individual'"));
console.log(lines.slice(custIdx - 10, custIdx + 60).join('\n'));
