const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/js/home.js', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('function attachHomeEventListeners'));
console.log(lines.slice(idx, idx + 40).join('\n'));
