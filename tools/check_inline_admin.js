const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/admin.html', 'utf8');

const inlineHandlers = [...html.matchAll(/\s(on[a-z]+)=["'][^"']+["']/gi)].map(m => m[0]);
console.log('Inline handlers count in admin.html:', inlineHandlers.length);
console.log(inlineHandlers.slice(0, 15));
