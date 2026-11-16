const fs = require('fs');
const code = fs.readFileSync('asil-logistics/tools/run_migration.js', 'utf8');

console.log('Migration script length:', code.length);
console.log(code.substring(0, 800));
