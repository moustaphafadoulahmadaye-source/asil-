const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/admin.html', 'utf8');

// Find all cards or stat boxes in tab-overview
const tabOverviewMatch = html.match(/<section[^>]*id=["']tab-overview["'][^>]*>([\s\S]*?)<\/section>/i);
if (tabOverviewMatch) {
  console.log('--- tab-overview Content length:', tabOverviewMatch[1].length);
  // print all elements with id or class containing stat
  const statElements = [...tabOverviewMatch[1].matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('IDs in tab-overview:', statElements);
}
