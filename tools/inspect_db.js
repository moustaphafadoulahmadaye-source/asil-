const Database = require('better-sqlite3');
const db = new Database('asil-logistics/asil.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
console.log('Tables in asil.db:', tables.map(t => t.name));

tables.forEach(t => {
  const cols = db.prepare(`PRAGMA table_info(${t.name});`).all();
  console.log(`\n--- TABLE: ${t.name} ---`);
  console.log(cols.map(c => `${c.name} (${c.type})`).join(', '));
});
db.close();
