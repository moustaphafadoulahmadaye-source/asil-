const fs = require('fs');
const code = fs.readFileSync('asil-logistics/server.js', 'utf8');

console.log('Includes visitor:', code.includes('visitor'));
console.log('Includes analytics:', code.includes('analytics'));
console.log('Includes page_view:', code.includes('page_view'));
