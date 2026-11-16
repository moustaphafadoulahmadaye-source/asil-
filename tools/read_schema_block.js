const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

console.log(lines.slice(135, 175).join('\n'));
