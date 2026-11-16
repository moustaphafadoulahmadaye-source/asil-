const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const profIdx = lines.findIndex(l => l.includes("app.get('/api/customer/profile'"));
console.log('GET /api/customer/profile at line:', profIdx + 1);
if (profIdx !== -1) {
  console.log(lines.slice(profIdx - 5, profIdx + 30).join('\n'));
}
