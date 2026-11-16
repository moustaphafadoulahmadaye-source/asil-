const http = require('http');

function postInquiry(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inquiries',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing General Inquiry ---');
  const res1 = await postInquiry({
    name: 'Othman Babiker',
    email: 'othman.babiker@example.sd',
    phone: '+249 912 111 222',
    department: 'General Corporate Inquiry',
    message: 'We are requesting partnership info for seasonal warehousing.',
    category: 'contact'
  });
  console.log('Result 1:', res1);

  console.log('\n--- 2. Testing Service Quotation Request ---');
  const res2 = await postInquiry({
    name: 'Hassan Idris',
    email: 'hassan.idris@sudanexports.sd',
    phone: '+249 912 333 444',
    department: 'Cargo & Freight Haulage',
    message: 'Quotation request for 20 tons gum arabic from Al-Obeid to Port Sudan.',
    category: 'quote'
  });
  console.log('Result 2:', res2);

  const Database = require('better-sqlite3');
  const db = new Database('asil-logistics/asil.db');
  const inqs = db.prepare('SELECT id, name, category, status, department FROM inquiries WHERE id IN (?, ?)').all(res1.data.id, res2.data.id);
  console.log('\nDB records verified:', inqs);
  db.close();
}

run().catch(console.error);
