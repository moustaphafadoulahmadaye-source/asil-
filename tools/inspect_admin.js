const fs = require('fs');

const adminHtml = fs.readFileSync('asil-logistics/public/admin.html', 'utf8');
const adminJs = fs.readFileSync('asil-logistics/public/js/admin.js', 'utf8');

console.log('Admin HTML length:', adminHtml.length);
console.log('Admin JS length:', adminJs.length);

// Extract section IDs or tab IDs in admin.html
const tabs = [...adminHtml.matchAll(/id=["'](tab-[^"']+)["']/g)].map(m => m[1]);
console.log('Tabs in admin.html:', tabs);

// Extract functions in admin.js
const funcs = [...adminJs.matchAll(/function\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
console.log('Functions in admin.js:', funcs);
