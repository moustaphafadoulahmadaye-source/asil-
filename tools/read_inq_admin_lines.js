const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const inqIdx = lines.findIndex(l => l.includes("app.get('/api/admin/inquiries'"));
console.log(lines.slice(inqIdx - 5, inqIdx + 50).join('\n'));
