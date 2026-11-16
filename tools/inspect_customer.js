const fs = require('fs');

const custHtml = fs.readFileSync('asil-logistics/public/customer.html', 'utf8');
const custJs = fs.readFileSync('asil-logistics/public/js/customer.js', 'utf8');

console.log('--- customer.html forms and sections ---');
const sections = custHtml.match(/<section[^>]*id=["']([^"']+)["'][^>]*>|<div[^>]*id=["']([^"']+)["'][^>]*>/g) || [];
console.log(sections.slice(0, 30));

console.log('\n--- customer.js functions ---');
const funcs = [...custJs.matchAll(/function\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
console.log(funcs);
