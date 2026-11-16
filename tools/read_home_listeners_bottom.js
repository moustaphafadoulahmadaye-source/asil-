const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/public/js/home.js', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('const contactForm = document.getElementById'));
console.log(lines.slice(idx - 15, idx + 20).join('\n'));
