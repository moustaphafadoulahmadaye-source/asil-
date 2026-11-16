const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

console.log('--- START (around 2125-2135) ---');
console.log(lines.slice(2125, 2135).join('\n'));

console.log('\n--- END (around 2320-2330) ---');
console.log(lines.slice(2318, 2326).join('\n'));
