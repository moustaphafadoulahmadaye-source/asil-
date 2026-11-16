const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const statsIdx = lines.findIndex(l => l.includes("app.get('/api/admin/stats'"));
console.log(lines.slice(statsIdx - 2, statsIdx + 120).join('\n'));
