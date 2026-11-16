const Database = require('better-sqlite3');
const db = new Database('asil-logistics/asil.db');

console.log('Users:');
console.log(db.prepare("SELECT id, username, email, role, customer_type, status, created FROM users").all());

console.log('\nBookings count:', db.prepare("SELECT COUNT(*) as c FROM bookings").get().c);
console.log('Bookings categories:', db.prepare("SELECT booking_category, status, COUNT(*) as c FROM bookings GROUP BY booking_category, status").all());

console.log('\nInquiries count:', db.prepare("SELECT COUNT(*) as c FROM inquiries").get().c);
console.log('Inquiries statuses:', db.prepare("SELECT status, COUNT(*) as c FROM inquiries GROUP BY status").all());

db.close();
