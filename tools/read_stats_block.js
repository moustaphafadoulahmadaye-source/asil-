const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const statsIdx = lines.findIndex(l => l.includes("app.get('/api/admin/stats'"));
console.log('GET /api/admin/stats at line:', statsIdx + 1);
if (statsIdx !== -1) {
  console.log(lines.slice(statsIdx, statsIdx + 130).join('\n'));
}
