const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/js/home.js', 'utf8').split('\n');

console.log(lines.slice(0, 50).join('\n'));
