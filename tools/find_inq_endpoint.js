const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const inqIdx = lines.findIndex(l => l.includes("app.post('/api/inquiries'"));
console.log('POST /api/inquiries at line:', inqIdx + 1);
if (inqIdx !== -1) {
  console.log(lines.slice(inqIdx, inqIdx + 45).join('\n'));
}
