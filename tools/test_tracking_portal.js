// Automated Technical Verification for Customer Tracking Portal
const http = require('http');
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const path = require('path');
const PORT = process.env.PORT || 3000;

function request(options, data) {
  options.port = PORT;
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) { }
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING ASIL LOGISTICS TRACKING PORTAL VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`[PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`[FAIL] ${name}`);
        console.error(`       Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Test Passenger Booking Tracking (TR-001)
  await test('Public Tracking: Query Passenger Transportation Reference (TR-001)', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-001?verifier=0001',
      method: 'GET'
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const b = res.json;
    assert.ok(b, 'Response should be valid JSON');
    assert.strictEqual(b.id, 'TR-001');
    assert.strictEqual(b.bookingType, 'Passenger Transportation', 'Booking type must be Passenger Transportation');
    assert.strictEqual(b.bookingCategory, 'passenger');
    assert.ok(b.status, 'Status must be present');
    assert.ok(b.departure, 'Departure must be present');
    assert.ok(b.destination, 'Destination must be present');
    assert.ok(b.travelDate, 'Travel date must be present');
    assert.ok(Array.isArray(b.statusHistory), 'Status history must be an array');
    console.log(`       -> Reference: ${b.id} | Type: ${b.bookingType} | Status: ${b.status} | Client: ${b.maskedClient}`);
  });

  // 2. Test Cargo Booking Tracking (CR-001)
  await test('Public Tracking: Query Cargo Transportation Reference (CR-001)', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/CR-001?verifier=hassan@example.com',
      method: 'GET'
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const b = res.json;
    assert.ok(b, 'Response should be valid JSON');
    assert.strictEqual(b.id, 'CR-001');
    assert.strictEqual(b.bookingType, 'Cargo Transportation', 'Booking type must be Cargo Transportation');
    assert.strictEqual(b.bookingCategory, 'cargo');
    assert.ok(b.status, 'Status must be present');
    assert.ok(b.pickupLocation, 'Pickup location must be present');
    assert.ok(b.deliveryDestination, 'Delivery destination must be present');
    assert.ok(b.cargoType, 'Cargo type must be present');
    assert.ok(Array.isArray(b.statusHistory), 'Status history must be an array');
    console.log(`       -> Reference: ${b.id} | Type: ${b.bookingType} | Status: ${b.status} | Cargo: ${b.cargoType}`);
  });

  // 3. Test Privacy Assurance: Masked names, no phone, no email, no admin notes, no instructions, no luggage, no driver name, no cargoDocs
  await test('Privacy & Security: Ensure Sensitive Personal Contact Info & Admin Notes Are Never Exposed', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-001?verifier=0001',
      method: 'GET'
    });
    const b = res.json;
    assert.strictEqual(b.phone, undefined, 'Phone must NOT be exposed to public tracking');
    assert.strictEqual(b.email, undefined, 'Email must NOT be exposed to public tracking');
    assert.strictEqual(b.internal_notes, undefined, 'Internal notes must NOT be exposed to public tracking');
    assert.strictEqual(b.internalNotes, undefined, 'Internal notes must NOT be exposed to public tracking');
    assert.strictEqual(b.billing_details, undefined, 'Billing details must NOT be exposed');
    assert.strictEqual(b.company_reg, undefined, 'Company registration must NOT be exposed');
    assert.strictEqual(b.instructions, undefined, 'Instructions must NOT be exposed to public tracking');
    assert.strictEqual(b.luggage, undefined, 'Luggage must NOT be exposed to public tracking');
    assert.strictEqual(b.assignedDriver, undefined, 'Driver name must NOT be exposed to public tracking');
    assert.strictEqual(b.driver, undefined, 'Driver name must NOT be exposed to public tracking');
    assert.strictEqual(b.cargoDocs, undefined, 'CargoDocs must NOT be exposed to public tracking');
    assert.ok(!b.maskedClient.includes('Babiker') || b.maskedClient.includes('B***'), 'Name should be masked for individual customers');
    console.log(`       -> Masked Client: ${b.maskedClient} | Phone exposed: ${Boolean(b.phone)} | Internal Notes exposed: ${Boolean(b.internal_notes)}`);
  });

  // 4. Test Invalid Reference: Non-existent code or mismatched verifier returns generic 404
  await test('Error Handling: Non-existent Booking Reference (TR-999999) Returns 404', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-999999',
      method: 'GET'
    });
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(res.json && res.json.error, 'Response must contain an error message');
    assert.ok(res.json.error.includes('not found'), 'Error message must state not found');
    console.log(`       -> Status: 404 | Message: "${res.json.error}"`);
  });

  // 5. Test Missing / Mismatched Verifier: Valid ID without verifier or with wrong verifier returns generic 404
  await test('Error Handling: Mismatched / Missing Verifier Returns Generic 404', async () => {
    const res1 = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-001',
      method: 'GET'
    });
    assert.strictEqual(res1.status, 404, `Expected 404 for missing verifier, got ${res1.status}`);

    const res2 = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-001?verifier=9999',
      method: 'GET'
    });
    assert.strictEqual(res2.status, 404, `Expected 404 for wrong verifier, got ${res2.status}`);
    assert.strictEqual(res1.json.error, res2.json.error, 'Generic 404 error message must be identical');
    console.log('       -> Status: 404 Generic on missing / wrong verifier verified');
  });

  // 6. Test Security: Read-Only Endpoint (Customers cannot modify booking statuses)
  await test('Security: Public Cannot Modify Booking Status (POST/PATCH/PUT blocked)', async () => {
    const postRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-001',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { status: 'Delivered' });
    assert.strictEqual(postRes.status, 404, `POST /api/bookings/:id should be 404, got ${postRes.status}`);

    const patchRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/TR-001',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { status: 'Delivered' });
    assert.strictEqual(patchRes.status, 404, `PATCH /api/bookings/:id should be 404, got ${patchRes.status}`);
    console.log('       -> POST /api/bookings/:id => 404 (Blocked)');
    console.log('       -> PATCH /api/bookings/:id => 404 (Blocked)');
  });

  // 7. Test Corporate Cargo Tracking (CR-002)
  await test('Public Tracking: Corporate Cold-Chain Consignment (CR-002)', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings/CR-002?verifier=8877',
      method: 'GET'
    });
    assert.strictEqual(res.status, 200);
    const b = res.json;
    assert.strictEqual(b.bookingType, 'Cargo Transportation');
    assert.strictEqual(b.customerType, 'company');
    assert.ok(b.maskedClient.includes('Nile Agro'), `Company name should be retained: ${b.maskedClient}`);
    console.log(`       -> Corporate Consignment: ${b.id} | Account: ${b.maskedClient} | Status: ${b.status}`);
  });

  // 8. Test Frontend Rendering & Tracking DOM elements
  await test('Frontend Architecture: Validate Tracking Widget & lookupQuickTrack implementation', () => {
    const htmlPath = fs.existsSync(path.join(__dirname, '..', 'public', 'index.html'))
      ? path.join(__dirname, '..', 'public', 'index.html')
      : path.join(__dirname, 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('tracking-section'), 'Tracking section must exist');
    assert.ok(html.includes('quickTrackInput'), 'quickTrackInput input element must exist');
    assert.ok(html.includes('lookupQuickTrack'), 'lookupQuickTrack function must exist');
    assert.ok(html.includes('quickTrackResult'), 'quickTrackResult result container must exist');
    assert.ok(html.includes('Live Telematics Tracker') || html.includes('Track Any Booking'), 'Tracking badge or title must exist');
  });

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
