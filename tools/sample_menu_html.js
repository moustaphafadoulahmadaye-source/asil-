const fs = require('fs');

const f = 'asil-logistics/public/transport.html';
const content = fs.readFileSync(f, 'utf8');

const btnMatch = content.match(/<button[^>]*id="btnMobileToggle"[\s\S]*?<\/button>/);
console.log('Button match in transport.html:');
console.log(btnMatch ? btnMatch[0] : 'None');

const menuMatch = content.match(/<!--\s*Mobile Drawer Navigation\s*-->[\s\S]*?<\/div>\s*<\/div>/i) || content.match(/<div[^>]*id="mobile-menu"[\s\S]*?<\/div>/);
console.log('\nMenu match in transport.html:');
console.log(menuMatch ? menuMatch[0].slice(0, 300) : 'None');
