const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/admin.html', 'utf8').split('\n');

const repIdx = lines.findIndex(l => l.includes('id="tab-reports"'));
console.log('tab-reports at line:', repIdx + 1);
console.log(lines.slice(repIdx, repIdx + 70).join('\n'));
