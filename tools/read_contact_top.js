const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/index.html', 'utf8').split('\n');

console.log(lines.slice(520, 565).join('\n'));
