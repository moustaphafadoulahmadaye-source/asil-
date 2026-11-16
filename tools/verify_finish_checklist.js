const http = require('http');
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3988;
const BASE = `http://localhost:${PORT}`;

function req(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    let bodyData = null;
    if (options.body) {
      if (typeof options.body === 'object') {
        bodyData = JSON.stringify(options.body);
        opts.headers['Content-Type'] = 'application/json';
      } else {
        bodyData = options.body;
      }
      opts.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const request = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, data, json });
      });
    });
    request.on('error', reject);
    if (bodyData) request.write(bodyData);
    request.end();
  });
}

async function run() {
  console.log('=== STARTING LIVE FINAL VERIFICATION SUITE ===\n');

  // Spawn test server
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: {
      ...process.env,
      PORT: PORT.toString(),
      SESSION_SECRET: 'super-strong-session-secret-key-final-check-2026',
      NODE_ENV: 'test',
      SEED_DEMO: 'true'
    },
    stdio: 'ignore'
  });

  // Wait for health check
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await req('/api/health');
      if (res.status === 200) { ready = true; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  assert(ready, 'Server must start up and be healthy');
  console.log('1. Server started on port ' + PORT + ' and healthy.');

  try {
    // Check 1: /manifest.webmanifest
    const manifestRes = await req('/manifest.webmanifest');
    assert.strictEqual(manifestRes.status, 200, '/manifest.webmanifest must return 200');
    assert.ok(manifestRes.headers['content-type'].includes('application/manifest+json'), `Expected application/manifest+json, got: ${manifestRes.headers['content-type']}`);
    assert.strictEqual(manifestRes.json.name, 'ASIL Logistics');
    assert.strictEqual(manifestRes.json.short_name, 'ASIL');
    assert.strictEqual(manifestRes.json.display, 'standalone');
    assert.strictEqual(manifestRes.json.theme_color, '#0e3b43');
    console.log('✓ /manifest.webmanifest returns 200 with application/manifest+json');

    // Check 2: /sw.js
    const swRes = await req('/sw.js');
    assert.strictEqual(swRes.status, 200, '/sw.js must return 200');
    assert.ok(swRes.headers['content-type'].includes('application/javascript'), `Expected application/javascript, got: ${swRes.headers['content-type']}`);
    assert.strictEqual(swRes.headers['service-worker-allowed'], '/');
    assert.strictEqual(swRes.headers['cache-control'], 'no-cache, no-store, must-revalidate');
    console.log('✓ /sw.js returns 200 with application/javascript, Service-Worker-Allowed: /, and no-cache');

    // Check 3: /offline.html
    const offlineRes = await req('/offline.html');
    assert.strictEqual(offlineRes.status, 200, '/offline.html must return 200');
    assert.ok(offlineRes.headers['content-type'].includes('text/html'), `Expected text/html, got: ${offlineRes.headers['content-type']}`);
    assert.ok(offlineRes.data.includes('Connection Unavailable'), 'offline.html must contain brand offline message');
    console.log('✓ /offline.html returns 200 with text/html');

    // Check 4: Register customer 1
    const cust1Username = `cust_${Date.now()}`;
    const cust1Email = `${cust1Username}@testdomain.sd`;
    const regRes1 = await req('/api/auth/register-customer', {
      method: 'POST',
      body: {
        username: cust1Username,
        password: 'securePassword123!',
        email: cust1Email,
        fullName: 'Customer One VIP',
        phone: '+249 912 111 222',
        customerType: 'individual'
      }
    });
    assert.strictEqual(regRes1.status, 201, 'Customer 1 registered successfully');
    const cust1Cookie = regRes1.headers['set-cookie'][0].split(';')[0];
    console.log('✓ Customer 1 registered successfully (ID: ' + regRes1.json.user.id + ')');

    // Check 5: Register customer 2
    const cust2Username = `cust2_${Date.now()}`;
    const cust2Email = `${cust2Username}@testdomain.sd`;
    const regRes2 = await req('/api/auth/register-customer', {
      method: 'POST',
      body: {
        username: cust2Username,
        password: 'securePassword456!',
        email: cust2Email,
        fullName: 'Customer Two Corp',
        phone: '+249 912 333 444',
        customerType: 'company',
        companyName: 'Red Sea Petrochemicals Ltd'
      }
    });
    assert.strictEqual(regRes2.status, 201, 'Customer 2 registered successfully');
    const cust2Cookie = regRes2.headers['set-cookie'][0].split(';')[0];
    console.log('✓ Customer 2 registered successfully (ID: ' + regRes2.json.user.id + ')');

    // Check 6: Customer 1 books a trip while logged in
    const bookRes = await req('/api/bookings', {
      method: 'POST',
      headers: { Cookie: cust1Cookie },
      body: {
        customerType: 'individual',
        fullName: 'Customer One VIP',
        email: cust1Email,
        phone: '+249 912 111 222',
        departure: 'Khartoum International Terminal',
        destination: 'Grand Holiday Villa Hotel',
        travelDate: '2026-11-20',
        departureTime: '10:00',
        passengers: 2,
        vehiclePreference: 'Executive VIP Sedan',
        luggage: '2 suitcases',
        instructions: 'Confidential corporate passenger'
      }
    });
    assert.strictEqual(bookRes.status, 200, 'Booking created');
    const bookingId = bookRes.json.id;
    console.log('✓ Customer 1 created trip booking: ' + bookingId);

    // Check 7: Track trip with correct verifier (phone last 4 digits "1222")
    const trackOk = await req(`/api/bookings/${bookingId}?verifier=1222`);
    assert.strictEqual(trackOk.status, 200, 'Tracking with valid verifier must return 200');
    assert.strictEqual(trackOk.json.id, bookingId);
    assert.strictEqual(trackOk.json.instructions, undefined, 'instructions must be stripped');
    assert.strictEqual(trackOk.json.luggage, undefined, 'luggage must be stripped');
    assert.strictEqual(trackOk.json.assignedDriver, undefined, 'assignedDriver must be stripped');
    assert.strictEqual(trackOk.json.cargoDocs, undefined, 'cargoDocs must be stripped');
    console.log('✓ Public tracking with valid phone verifier ("1222") succeeds & stripped private fields');

    // Check 8: Track trip with correct email verifier
    const trackEmailOk = await req(`/api/bookings/${bookingId}?verifier=${cust1Email}`);
    assert.strictEqual(trackEmailOk.status, 200, 'Tracking with valid email verifier must return 200');
    console.log('✓ Public tracking with valid email verifier succeeds');

    // Check 9: Track trip WITHOUT verifier (must return generic 404)
    const trackNoVerifier = await req(`/api/bookings/${bookingId}`);
    assert.strictEqual(trackNoVerifier.status, 404, 'Tracking without verifier must return 404');
    assert.strictEqual(trackNoVerifier.json.error, 'Booking or consignment not found');
    console.log('✓ Public tracking without verifier returns generic 404');

    // Check 10: Track trip with WRONG verifier (must return generic 404)
    const trackWrongVerifier = await req(`/api/bookings/${bookingId}?verifier=9999`);
    assert.strictEqual(trackWrongVerifier.status, 404, 'Tracking with wrong verifier must return 404');
    assert.strictEqual(trackWrongVerifier.json.error, 'Booking or consignment not found');
    console.log('✓ Public tracking with wrong verifier returns generic 404');

    // Check 11: Upload file while logged out (must fail with 401)
    const unauthUpload = await req('/api/upload/cargo', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=---boundary123' },
      body: '---boundary123\r\nContent-Disposition: form-data; name="documents"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n%%EOF\r\n---boundary123--\r\n'
    });
    assert.strictEqual(unauthUpload.status, 401, 'Logged out upload must be rejected with 401');
    assert.strictEqual(unauthUpload.json.error, 'auth');
    console.log('✓ Unauthenticated file upload blocked with HTTP 401');

    // Check 12: Customer isolation - Customer 2 attempts to fetch Customer 1 bookings
    const cust1Bookings = await req('/api/customer/bookings', {
      headers: { Cookie: cust1Cookie }
    });
    assert.strictEqual(cust1Bookings.status, 200);
    assert.strictEqual(cust1Bookings.json.bookings.length, 1);
    assert.strictEqual(cust1Bookings.json.bookings[0].id, bookingId);
    assert.strictEqual(cust1Bookings.json.bookings[0].internal_notes, undefined);
    assert.strictEqual(cust1Bookings.json.bookings[0].billing_details, undefined);
    console.log('✓ Customer 1 sees their own booking without sensitive internal notes');

    const cust2Bookings = await req('/api/customer/bookings', {
      headers: { Cookie: cust2Cookie }
    });
    assert.strictEqual(cust2Bookings.status, 200);
    assert.strictEqual(cust2Bookings.json.bookings.length, 0, 'Customer 2 must NOT see Customer 1 bookings');
    console.log('✓ Customer 2 cannot see Customer 1 bookings (Cross-customer isolation verified)');

    console.log('\n=============================================');
    console.log('ALL LIVE VERIFICATION TESTS PASSED 100%!');
    console.log('=============================================\n');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
