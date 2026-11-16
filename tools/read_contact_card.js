const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/index.html', 'utf8').split('\n');

console.log(lines.slice(570, 605).join('\n'));
