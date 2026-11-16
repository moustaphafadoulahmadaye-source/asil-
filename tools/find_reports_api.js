const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const lineIdx = lines.findIndex(l => l.includes("app.get('/api/admin/reports'"));
if (lineIdx !== -1) {
  console.log(lines.slice(lineIdx + 50, lineIdx + 120).join('\n'));
}
