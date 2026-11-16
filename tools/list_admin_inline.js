const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/admin.html', 'utf8');

const regex = /\s(on[a-z]+)=["']([^"']*)["']/gi;
let m;
const handlers = [];
while ((m = regex.exec(html)) !== null) {
  handlers.push({ attr: m[1], val: m[2], line: html.substring(0, m.index).split('\n').length });
}

console.log('Total inline handlers:', handlers.length);
handlers.forEach(h => console.log(`Line ${h.line}: ${h.attr}="${h.val}"`));
