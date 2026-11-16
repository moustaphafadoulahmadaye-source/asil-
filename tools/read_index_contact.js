const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/index.html', 'utf8').split('\n');

console.log(lines.slice(565, 630).join('\n'));
