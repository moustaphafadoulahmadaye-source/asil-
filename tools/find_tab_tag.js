const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/admin.html', 'utf8');

const regex = /<([a-z0-9]+)[^>]*id=["']tab-overview["'][^>]*>/i;
const match = html.match(regex);
console.log('Match:', match ? match[0] : 'None');

if (match) {
  const startIdx = html.indexOf(match[0]);
  console.log(html.substring(startIdx, startIdx + 1500));
}
