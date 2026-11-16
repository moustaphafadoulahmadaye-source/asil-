const fs = require('fs');
const code = fs.readFileSync('asil-logistics/server.js', 'utf8');

function findRoute(route) {
  const idx = code.indexOf(route);
  if (idx !== -1) {
    console.log('=== ROUTE ' + route + ' ===');
    console.log(code.substring(idx - 20, idx + 800));
  } else {
    console.log('Route not found: ' + route);
  }
}

findRoute('/api/inquiries');
findRoute('/api/admin/inquiries');
findRoute('/api/admin/stats');
findRoute('/api/admin/overview');
