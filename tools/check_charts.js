const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/admin.html', 'utf8');
const js = fs.readFileSync('asil-logistics/public/js/admin.js', 'utf8');

console.log('admin.html has canvas:', html.includes('<canvas'));
console.log('admin.html has chart:', html.includes('chart'));
console.log('admin.js has chart:', js.includes('chart'));
