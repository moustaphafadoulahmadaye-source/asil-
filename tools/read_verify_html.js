const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/tools/verify_frontend_html.js', 'utf8').split('\n');

console.log(lines.slice(40, 110).join('\n'));
