const fs = require('fs');
const code = fs.readFileSync('asil-logistics/server.js', 'utf8');

console.log('Includes csv:', code.includes('csv'));
console.log('Includes export:', code.includes('export'));
