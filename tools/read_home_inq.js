const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/home.js', 'utf8');

const idx = code.indexOf('contactForm');
console.log(code.substring(idx - 40, idx + 800));
