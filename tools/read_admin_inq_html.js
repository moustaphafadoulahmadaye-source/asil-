const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/admin.html', 'utf8').split('\n');

const inqIdx = lines.findIndex(l => l.includes('id="tab-inquiries"'));
console.log('tab-inquiries at line:', inqIdx + 1);
console.log(lines.slice(inqIdx, inqIdx + 60).join('\n'));
