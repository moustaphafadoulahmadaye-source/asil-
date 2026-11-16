const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const lineIdx = lines.findIndex(l => l.includes("app.get('/api/health'"));
console.log('GET /api/health at line:', lineIdx + 1);
if (lineIdx !== -1) {
  console.log(lines.slice(lineIdx - 30, lineIdx + 10).join('\n'));
}
