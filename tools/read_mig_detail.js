const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/tools/run_migration.js', 'utf8').split('\n');

console.log(lines.slice(0, 100).join('\n'));
