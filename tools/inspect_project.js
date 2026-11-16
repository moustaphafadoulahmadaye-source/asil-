const path = require('path');
const db = require('better-sqlite3')(process.env.DB_PATH || path.join(__dirname, '..', 'asil.db'));

console.log('=== DATABASE TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));

console.log('\n=== RECORDS BREAKDOWN BY WF ===');
console.log(db.prepare('SELECT wf, count(*) as count FROM records GROUP BY wf').all());

console.log('\n=== BOOKINGS TABLE SCHEMA ===');
console.log(db.prepare('PRAGMA table_info(bookings)').all().map(c => `${c.name} (${c.type})`));

console.log('\n=== RECORDS TABLE SCHEMA ===');
console.log(db.prepare('PRAGMA table_info(records)').all().map(c => `${c.name} (${c.type})`));

console.log('\n=== FLEET TABLES ===');
console.log('Vehicles:', db.prepare('SELECT count(*) as c FROM vehicles').get().c);
console.log('Drivers:', db.prepare('SELECT count(*) as c FROM drivers').get().c);

console.log('\n=== USERS / AUTH ===');
console.log('Settings:', db.prepare('SELECT * FROM settings').all());
console.log('Audit Logs count:', db.prepare('SELECT count(*) as c FROM audit_logs').get().c);
