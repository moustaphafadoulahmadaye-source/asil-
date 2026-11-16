const fs = require('fs');
const js = fs.readFileSync('asil-logistics/public/js/admin.js', 'utf8');

console.log('Includes setInterval:', js.includes('setInterval'));
console.log('Includes setTimeout:', js.includes('setTimeout'));
