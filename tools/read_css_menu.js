const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/css/asil-core.css', 'utf8');

const idx = code.indexOf('.mobile-toggle');
if (idx !== -1) {
  console.log(code.substring(idx - 50, idx + 800));
}
