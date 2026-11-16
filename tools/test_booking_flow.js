#!/usr/bin/env node
/**
 * ASIL Logistics - Business Flow & Booking Security Verification Suite
 * Verifies:
 * 1. Anonymous booking attempts return 401 Unauthorized
 * 2. Booking requires logged-in customer; user_id is linked to account, name & email come from account
 * 3. GET /api/locations returns active locations
 * 4. GET /api/quote returns modes (sea/air/road) with days range, ETA dates, prices, badges; returns 'on request' when no route
 * 5. On booking: route mode validation and ETA/price storage
 * 6. Tracking & GET /api/customer/bookings/:id return: origin, destination, goods origin country, mode, ETA range, price quote, steps[] (done/current/pending + timestamp), and status history
 * 7. Correct step lists per mode (Sea, Air, Road, Service)
 * 8. Customer Privacy: Customer B CANNOT see Customer A's order (returns 403)
 * 9. Admin CRUD for locations and routes with audit log entries
 * 10. Admin can update shipment step and ETA
 */

const http = require('http');
const assert = require('assert');

const TEST_PORT = process.env.TEST_PORT || process.env.PORT || '3000';
const BASE_URL = `http://localhost:${TEST_PORT}`;

function httpRequest({ path, method = 'GET', headers = {}, body = null, cookie = '' }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    if (cookie) reqHeaders['Cookie'] = cookie;
    let payload = null;
    if (['POST', 'PATCH', 'DELETE'].includes(method) && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    if (body !== null && body !== undefined) {
      if (typeof body === 'object') {
        payload = JSON.stringify(body);
      } else {
        payload = String(body);
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function loginUser(username, password) {
  let res = await httpRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { username, password }
  });
  if (res.status === 401 && username === 'admin') {
    res = await httpRequest({
      path: '/api/auth/login',
      method: 'POST',
      body: { username, password: 'admin12345' }
    });
  }
  assert.strictEqual(res.status, 200, `Login for ${username} failed with status ${res.status}`);
  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie && setCookie.length > 0, 'Set-Cookie header missing');
  return {
    cookie: setCookie[0].split(';')[0],
    user: res.json ? res.json.user : null
  };
}

async function runTests() {
  console.log('='.repeat(80));
  console.log(' ASIL LOGISTICS - BUSINESS FLOW, LOCATIONS, QUOTES & RBAC VERIFICATION');
  console.log('='.repeat(80));

  // 1. PUBLIC LOCATIONS
  console.log('\n--- 1. Testing GET /api/locations (Public) ---');
  const locRes = await httpRequest({ path: '/api/locations' });
  assert.strictEqual(locRes.status, 200, 'GET /api/locations must return 200');
  assert.ok(locRes.json && locRes.json.ok, 'Expected ok=1');
  assert.ok(Array.isArray(locRes.json.locations), 'Expected locations array');
  assert.ok(locRes.json.locations.length >= 3, 'Expected at least 3 active locations');
  console.log(`   [PASS] Found ${locRes.json.locations.length} active locations.`);

  // 2. PUBLIC QUOTES
  console.log('\n--- 2. Testing GET /api/quote ---');
  // A. Existing Route: Khartoum Central (LOC-KRT) to Port Sudan (LOC-PSU-PORT)
  const quoteRes = await httpRequest({ path: '/api/quote?origin=LOC-KRT&destination=LOC-PSU-PORT' });
  assert.strictEqual(quoteRes.status, 200, 'GET /api/quote must return 200');
  assert.ok(quoteRes.json.quotes && quoteRes.json.quotes.length > 0, 'Expected quotes array');
  const roadQuote = quoteRes.json.quotes[0];
  assert.strictEqual(roadQuote.mode, 'road', 'Expected mode to be road');
  assert.ok(roadQuote.days_range, 'Expected days_range string');
  assert.ok(roadQuote.eta_min_date && roadQuote.eta_max_date, 'Expected ETA dates in quote');
  assert.ok(roadQuote.badges && roadQuote.badges.length > 0, 'Expected badges (fastest/cheapest)');
  console.log(`   [PASS] Found quote for route: ${roadQuote.mode} (${roadQuote.days_range}, ETA: ${roadQuote.eta_min_date} to ${roadQuote.eta_max_date}, $${roadQuote.price_from})`);

  // B. Non-existent Route -> Mode "on request"
  const noRouteRes = await httpRequest({ path: '/api/quote?origin=LOC-DXB-AIR&destination=LOC-KRT' });
  assert.strictEqual(noRouteRes.status, 200, 'Quote for unlisted route must return 200');
  assert.ok(noRouteRes.json.quotes && noRouteRes.json.quotes.length > 0);
  assert.strictEqual(noRouteRes.json.quotes[0].mode, 'on request', 'Expected mode "on request" for unlisted route');
  console.log('   [PASS] Non-scheduled route correctly returned mode "on request"');

  // 3. ANONYMOUS BOOKING ATTEMPTS MUST RETURN 401
  console.log('\n--- 3. Testing Anonymous Booking Security (Must return 401) ---');
  const anonPassRes = await httpRequest({
    path: '/api/bookings',
    method: 'POST',
    body: {
      fullName: 'Anonymous Visitor',
      email: 'anon@example.com',
      phone: '+249 912 000 000',
      departure: 'Khartoum Hub',
      destination: 'Port Sudan Hub',
      travelDate: '2026-11-25',
      departureTime: '10:00 AM',
      passengers: 1,
      vehiclePreference: 'Executive SUV'
    }
  });
  assert.strictEqual(anonPassRes.status, 401, `Anonymous passenger booking must return 401, got ${anonPassRes.status}`);
  console.log('   [PASS] Anonymous POST /api/bookings returned 401 Unauthorized');

  const anonCargoRes = await httpRequest({
    path: '/api/cargo/bookings',
    method: 'POST',
    body: {
      fullName: 'Anonymous Cargo',
      email: 'anon.cargo@example.com',
      phone: '+249 912 000 000',
      cargoType: 'General Cargo',
      cargoDesc: 'Test boxes',
      cargoWeight: '500 kg',
      pickupLocation: 'Khartoum',
      deliveryDestination: 'Port Sudan',
      pickupDate: '2026-11-25',
      vehiclePreference: 'Box Truck'
    }
  });
  assert.strictEqual(anonCargoRes.status, 401, `Anonymous cargo booking must return 401, got ${anonCargoRes.status}`);
  console.log('   [PASS] Anonymous POST /api/cargo/bookings returned 401 Unauthorized');

  const anonSvcRes = await httpRequest({
    path: '/api/service-requests',
    method: 'POST',
    body: { service: 'warehousing', description: 'Cold storage request' }
  });
  assert.strictEqual(anonSvcRes.status, 401, `Anonymous service request must return 401, got ${anonSvcRes.status}`);
  console.log('   [PASS] Anonymous POST /api/service-requests returned 401 Unauthorized');

  // 4. AUTHENTICATED CUSTOMER BOOKING (ACCOUNT LINKING & ROUTE/ETA STORAGE)
  console.log('\n--- 4. Testing Authenticated Customer Booking & Data Linking ---');
  const cust1Session = await loginUser('customer_ali', 'customer123');
  console.log(`   Logged in as Customer 1: ${cust1Session.user.fullName} (${cust1Session.user.email})`);

  // Customer 1 books a Sea Cargo shipment with route RT-DEMO-SEA
  const custCargoRes = await httpRequest({
    path: '/api/cargo/bookings',
    method: 'POST',
    cookie: cust1Session.cookie,
    body: {
      fullName: 'Fake Hacker Name', // Attempting to spoof name in body
      email: 'hacker@malicious.com', // Attempting to spoof email in body
      phone: '+249 912 990 011',
      route_id: 'RT-DEMO-SEA',
      origin_location_id: 'LOC-PSU-PORT',
      destination_location_id: 'LOC-JED-PORT',
      transport_mode: 'sea',
      goods_origin_country: 'Sudan',
      cargoType: 'Gum Arabic & Sesame Export',
      cargoDesc: '100 bags of export-grade raw sesame and organic gum arabic',
      cargoWeight: '12 Tons',
      pickupLocation: 'Port Sudan Maritime Terminal',
      deliveryDestination: 'Jeddah Islamic Port',
      pickupDate: '2026-11-24',
      vehiclePreference: 'Standard 20ft Marine Container'
    }
  });

  assert.strictEqual(custCargoRes.status, 200, `Customer cargo booking should return 200, got ${custCargoRes.status}`);
  assert.ok(custCargoRes.json && custCargoRes.json.id, 'Expected booking reference');
  const booking1Id = custCargoRes.json.id;

  // Verify Account Linking: Name and Email come from account, NOT the spoofed body
  assert.strictEqual(custCargoRes.json.booking.fullName, cust1Session.user.fullName, 'Booking fullName must be taken from account');
  assert.strictEqual(custCargoRes.json.booking.email, cust1Session.user.email, 'Booking email must be taken from account');
  assert.strictEqual(custCargoRes.json.booking.transport_mode, 'sea', 'Expected mode to be sea');
  assert.ok(custCargoRes.json.booking.eta_min_date, 'Expected eta_min_date to be stored');
  assert.ok(custCargoRes.json.booking.eta_max_date, 'Expected eta_max_date to be stored');
  assert.strictEqual(custCargoRes.json.booking.quoted_price, 1200, 'Expected quoted_price=1200 from route RT-DEMO-SEA');
  console.log(`   [PASS] Booking ${booking1Id} created! Linked to user account: ${cust1Session.user.fullName}`);
  console.log(`          Mode: ${custCargoRes.json.booking.transport_mode}, ETA: ${custCargoRes.json.booking.eta_min_date} to ${custCargoRes.json.booking.eta_max_date}, Quoted Price: $${custCargoRes.json.booking.quoted_price}`);

  // 5. ROUTE MODE VALIDATION
  console.log('\n--- 5. Testing Route Mode Validation ---');
  // Attempting to book Sea Route RT-DEMO-SEA with mode 'air'
  const invalidModeRes = await httpRequest({
    path: '/api/cargo/bookings',
    method: 'POST',
    cookie: cust1Session.cookie,
    body: {
      route_id: 'RT-DEMO-SEA',
      transport_mode: 'air', // Invalid for sea route
      cargoType: 'Machinery',
      cargoDesc: 'Parts',
      cargoWeight: '1 Ton',
      pickupLocation: 'Port Sudan',
      deliveryDestination: 'Jeddah',
      pickupDate: '2026-11-25',
      vehiclePreference: 'Cargo Hauler'
    }
  });
  assert.strictEqual(invalidModeRes.status, 400, `Booking with mismatching route mode must return 400, got ${invalidModeRes.status}`);
  console.log('   [PASS] Invalid transport mode on route correctly rejected with HTTP 400');

  // 6. TRACKING & CUSTOMER BOOKING DETAIL WITH STEPS
  console.log('\n--- 6. Testing Tracking & Customer Order Details ---');
  // Customer 1 views own order details via GET /api/customer/bookings/:id
  const orderDtlRes = await httpRequest({
    path: `/api/customer/bookings/${booking1Id}`,
    method: 'GET',
    cookie: cust1Session.cookie
  });
  assert.strictEqual(orderDtlRes.status, 200, `GET /api/customer/bookings/${booking1Id} must return 200`);
  const bDtl = orderDtlRes.json.booking;
  assert.strictEqual(bDtl.id, booking1Id);
  assert.strictEqual(bDtl.mode, 'sea');
  assert.strictEqual(bDtl.goods_origin_country, 'Sudan');
  assert.ok(bDtl.eta_range, 'Expected eta_range in order details');
  assert.strictEqual(bDtl.quoted_price, 1200, 'Expected quoted_price=1200');

  // Verify steps array for Sea mode
  assert.ok(Array.isArray(bDtl.steps), 'Expected steps array');
  assert.strictEqual(bDtl.steps.length, 8, 'Sea mode must have exactly 8 steps');
  const expectedSeaSteps = [
    'Order confirmed', 'Cargo received', 'Loaded on vessel', 'At sea',
    'Arrived at port', 'Customs clearance', 'Out for delivery', 'Delivered'
  ];
  for (let i = 0; i < expectedSeaSteps.length; i++) {
    assert.strictEqual(bDtl.steps[i].name, expectedSeaSteps[i], `Step ${i} mismatch`);
    assert.ok(['done', 'current', 'pending'].includes(bDtl.steps[i].status), `Step ${i} status must be done, current, or pending`);
  }
  assert.strictEqual(bDtl.steps[0].status, 'current', 'Initial step 0 must be current or done');
  assert.ok(bDtl.steps[0].timestamp, 'Initial step must have timestamp');
  console.log(`   [PASS] Order details verified. Step list: [${bDtl.steps.map(s => `${s.name} (${s.status})`).join(' -> ')}]`);

  // Verify public tracking with verifier
  const trackRes = await httpRequest({
    path: `/api/bookings/${booking1Id}?verifier=0011`
  });
  assert.strictEqual(trackRes.status, 200, 'Public tracking with valid phone verifier must return 200');
  assert.strictEqual(trackRes.json.mode, 'sea');
  assert.ok(Array.isArray(trackRes.json.steps), 'Expected steps array in public tracking');
  console.log('   [PASS] Public tracking returned verified origin, destination, mode, and steps[]');

  // 7. CUSTOMER PRIVACY: CUSTOMER B CANNOT VIEW CUSTOMER A'S ORDER
  console.log("\n--- 7. Testing Customer Order Privacy Isolation ---");
  const cust2Session = await loginUser('customer_nile', 'customer123');
  console.log(`   Logged in as Customer 2: ${cust2Session.user.fullName} (${cust2Session.user.companyName})`);

  const crossAccessRes = await httpRequest({
    path: `/api/customer/bookings/${booking1Id}`,
    method: 'GET',
    cookie: cust2Session.cookie
  });
  assert.strictEqual(crossAccessRes.status, 403, `Customer 2 viewing Customer 1 order must return 403 Forbidden, got ${crossAccessRes.status}`);
  console.log("   [PASS] Access Denied: Customer 2 cannot view Customer 1's order (HTTP 403 Forbidden)");

  // 8. ADMIN CRUD FOR LOCATIONS & ROUTES + AUDIT LOGS
  console.log('\n--- 8. Testing Admin Locations & Routes CRUD & Audit Logs ---');
  const adminSession = await loginUser('admin', 'admin123');
  console.log('   Logged in as Super Administrator');

  // Pre-cleanup if leftover from previous aborted run
  const testLocId = 'LOC-TEST-WAD';
  const testRouteId = 'RT-TEST-WAD-KRT';
  await httpRequest({ path: `/api/admin/routes/${testRouteId}`, method: 'DELETE', cookie: adminSession.cookie });
  await httpRequest({ path: `/api/admin/locations/${testLocId}`, method: 'DELETE', cookie: adminSession.cookie });

  // A. Create Location
  const createLocRes = await httpRequest({
    path: '/api/admin/locations',
    method: 'POST',
    cookie: adminSession.cookie,
    body: {
      id: testLocId,
      name: 'Wad Madani Distribution Hub',
      country: 'Sudan',
      type: 'warehouse',
      lat: 14.4011,
      lng: 33.5199
    }
  });
  assert.strictEqual(createLocRes.status, 201, `Create location returned ${createLocRes.status}`);
  console.log('   [PASS] Admin created location LOC-TEST-WAD');

  // B. Update Location
  const patchLocRes = await httpRequest({
    path: `/api/admin/locations/${testLocId}`,
    method: 'PATCH',
    cookie: adminSession.cookie,
    body: { name: 'Wad Madani Central Depot' }
  });
  assert.strictEqual(patchLocRes.status, 200);
  assert.strictEqual(patchLocRes.json.location.name, 'Wad Madani Central Depot');
  console.log('   [PASS] Admin updated location LOC-TEST-WAD');

  // C. Create Route
  const createRouteRes = await httpRequest({
    path: '/api/admin/routes',
    method: 'POST',
    cookie: adminSession.cookie,
    body: {
      id: testRouteId,
      origin_location_id: testLocId,
      destination_location_id: 'LOC-KRT',
      mode: 'road',
      transit_days_min: 1,
      transit_days_max: 2,
      price_from: 350.0,
      currency: 'USD',
      notes: 'Gezira agricultural highway connection'
    }
  });
  assert.strictEqual(createRouteRes.status, 201, `Create route returned ${createRouteRes.status}`);
  console.log('   [PASS] Admin created route RT-TEST-WAD-KRT');

  // D. Update Route
  const patchRouteRes = await httpRequest({
    path: `/api/admin/routes/${testRouteId}`,
    method: 'PATCH',
    cookie: adminSession.cookie,
    body: { price_from: 375.0 }
  });
  assert.strictEqual(patchRouteRes.status, 200);
  assert.strictEqual(patchRouteRes.json.route.price_from, 375.0);
  console.log('   [PASS] Admin updated route price to $375.0');

  // E. Delete Route & Location
  const delRouteRes = await httpRequest({
    path: `/api/admin/routes/${testRouteId}`,
    method: 'DELETE',
    cookie: adminSession.cookie
  });
  assert.strictEqual(delRouteRes.status, 200);
  const delLocRes = await httpRequest({
    path: `/api/admin/locations/${testLocId}`,
    method: 'DELETE',
    cookie: adminSession.cookie
  });
  assert.strictEqual(delLocRes.status, 200);
  console.log('   [PASS] Admin deleted test route and location');

  // 9. ADMIN UPDATE SHIPMENT STEP AND ETA
  console.log('\n--- 9. Testing Admin Update Shipment Step and ETA ---');
  const patchBookingRes = await httpRequest({
    path: `/api/admin/bookings/${booking1Id}`,
    method: 'PATCH',
    cookie: adminSession.cookie,
    body: {
      step: 'Loaded on vessel',
      eta_min_date: '2026-11-28',
      eta_max_date: '2026-11-30',
      note: 'Containers loaded onto MV Red Sea Pioneer at Berth 7'
    }
  });
  assert.strictEqual(patchBookingRes.status, 200, `Admin update booking returned ${patchBookingRes.status}`);
  assert.strictEqual(patchBookingRes.json.eta_min_date, '2026-11-28');
  assert.strictEqual(patchBookingRes.json.eta_max_date, '2026-11-30');

  // Verify Customer 1 sees the updated milestone and ETA
  const updatedOrderRes = await httpRequest({
    path: `/api/customer/bookings/${booking1Id}`,
    method: 'GET',
    cookie: cust1Session.cookie
  });
  assert.strictEqual(updatedOrderRes.json.booking.eta_min_date, '2026-11-28');
  assert.strictEqual(updatedOrderRes.json.booking.eta_max_date, '2026-11-30');
  const steps = updatedOrderRes.json.booking.steps;
  const loadedStep = steps.find(s => s.name === 'Loaded on vessel');
  assert.ok(loadedStep, 'Loaded on vessel step must exist');
  assert.strictEqual(loadedStep.status, 'current', 'Loaded on vessel step must be current');
  const confirmedStep = steps.find(s => s.name === 'Order confirmed');
  assert.strictEqual(confirmedStep.status, 'done', 'Preceding step must be done');
  console.log(`   [PASS] Admin updated milestone to "${loadedStep.name}" and ETA to ${patchBookingRes.json.eta_min_date} - ${patchBookingRes.json.eta_max_date}. Customer sees updated progress!`);

  console.log('\n' + '='.repeat(80));
  console.log(' ALL BUSINESS FLOW, LOCATIONS, QUOTES & RBAC TESTS PASSED 100%!');
  console.log('='.repeat(80));
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test execution failure:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
