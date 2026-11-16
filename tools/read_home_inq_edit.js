const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/js/home.js', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('async function submitInquiry'));
console.log(lines.slice(idx - 10, idx + 60).join('\n'));
