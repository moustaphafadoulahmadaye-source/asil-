const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/css/asil-core.css', 'utf8');

const startIdx = code.indexOf('/* Mobile Toggle Hamburger Button */');
const nextSection = code.indexOf('/* --- Floating WhatsApp Quick Action Button --- */');

console.log('startIdx:', startIdx, 'nextSection:', nextSection);
console.log(code.substring(startIdx, nextSection));
