const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const lineIdx = lines.findIndex(l => l.includes('const app = express('));
console.log('app = express() at line:', lineIdx + 1);
if (lineIdx !== -1) {
  console.log(lines.slice(lineIdx, lineIdx + 50).join('\n'));
}
