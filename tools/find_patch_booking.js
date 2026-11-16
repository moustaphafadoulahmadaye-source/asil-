const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const lineIdx = lines.findIndex(l => l.includes("app.patch('/api/admin/bookings/:id'"));
if (lineIdx !== -1) {
  console.log(lines.slice(lineIdx, lineIdx + 80).join('\n'));
}
