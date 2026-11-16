const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/index.html', 'utf8').split('\n');

console.log(lines.slice(535, 575).join('\n'));
