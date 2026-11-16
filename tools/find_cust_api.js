const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const lineIdx = lines.findIndex(l => l.includes('/api/admin/customers/individual'));
if (lineIdx !== -1) {
  console.log(lines.slice(lineIdx - 5, lineIdx + 50).join('\n'));
}
