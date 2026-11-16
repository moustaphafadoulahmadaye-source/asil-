const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/home.js', 'utf8');

const idx = code.indexOf('async function submitInquiry');
console.log(code.substring(idx, idx + 1000));
