const fs = require('fs');
const code = fs.readFileSync('asil-logistics/server.js', 'utf8');

const idx = code.indexOf('/api/customer/profile');
if (idx !== -1) {
  console.log(code.substring(idx - 50, idx + 600));
} else {
  console.log('Not found');
}
