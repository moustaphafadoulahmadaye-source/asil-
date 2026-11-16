const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

function printLinesAround(search, count = 100) {
  const lineIdx = lines.findIndex(l => l.includes(search));
  if (lineIdx !== -1) {
    const start = Math.max(0, lineIdx - 10);
    const end = Math.min(lines.length, lineIdx + count);
    console.log(`=== Found "${search}" at line ${lineIdx + 1} ===`);
    console.log(lines.slice(start, end).join('\n'));
  }
}

printLinesAround('/api/admin/stats');
printLinesAround('/api/admin/overview');
