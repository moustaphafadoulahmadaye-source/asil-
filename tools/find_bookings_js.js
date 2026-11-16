const fs = require('fs');
const code = fs.readFileSync('asil-logistics/public/js/admin.js', 'utf8');

const idx = code.indexOf('async function saveBookingDispatch');
if (idx !== -1) {
  console.log(code.substring(idx, idx + 2000));
}
