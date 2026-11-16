const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const inqIdx = lines.findIndex(l => l.includes("app.get('/api/admin/inquiries'"));
console.log('GET /api/admin/inquiries at line:', inqIdx + 1);
if (inqIdx !== -1) {
  console.log(lines.slice(inqIdx - 5, inqIdx + 50).join('\n'));
}
