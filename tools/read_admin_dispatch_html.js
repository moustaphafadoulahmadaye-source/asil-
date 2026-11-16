const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/admin.html', 'utf8').split('\n');

const dispIdx = lines.findIndex(l => l.includes('id="dispatchModal"'));
console.log('dispatchModal at line:', dispIdx + 1);
console.log(lines.slice(dispIdx, dispIdx + 60).join('\n'));
