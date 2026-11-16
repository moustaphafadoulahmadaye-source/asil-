const http = require('http');

function req(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(postData);
    if (cookie) headers['Cookie'] = cookie;

    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path,
      method,
      headers
    };

    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch(e) { json = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    r.on('error', reject);
    if (body) r.write(postData);
    r.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('COMPREHENSIVE ADMIN DASHBOARD VERIFICATION TEST');
  console.log('====================================================\n');

  let passed = 0, failed = 0;
  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated Security Check
    console.log('--- 1. Security & RBAC Enforcement Tests ---');
    const unauthOverview = await req('GET', '/api/admin/overview');
    assert(unauthOverview.status === 401, 'Unauthenticated GET /api/admin/overview blocked with 401');

    const unauthVehicles = await req('GET', '/api/admin/fleet/vehicles');
    assert(unauthVehicles.status === 401, 'Unauthenticated GET /api/admin/fleet/vehicles blocked with 401');

    const unauthReports = await req('GET', '/api/admin/reports');
    assert(unauthReports.status === 401, 'Unauthenticated GET /api/admin/reports blocked with 401');

    const unauthSettings = await req('GET', '/api/admin/settings');
    assert(unauthSettings.status === 401, 'Unauthenticated GET /api/admin/settings blocked with 401');

    // 2. Admin Authentication & Session
    console.log('\n--- 2. Administrator Authentication & Session ---');
    const loginRes = await req('POST', '/api/auth/login', { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    assert(loginRes.status === 200 && loginRes.data.ok, 'Admin login succeeded with status 200');
    
    const setCookie = loginRes.headers['set-cookie'];
    assert(setCookie && setCookie.length > 0, 'Admin session cookie issued');
    const cookie = setCookie[0].split(';')[0];

    // 3. Overview & 8 Dashboard Statistics
    console.log('\n--- 3. Overview Statistics & Timeframes ---');
    const overviewRes = await req('GET', '/api/admin/overview', null, cookie);
    assert(overviewRes.status === 200, 'GET /api/admin/overview returns 200');
    const stats = overviewRes.data.stats;
    assert(typeof stats.totalPassengerBookings === 'number', `Total passenger bookings: ${stats.totalPassengerBookings}`);
    assert(typeof stats.totalCargoBookings === 'number', `Total cargo bookings: ${stats.totalCargoBookings}`);
    assert(typeof stats.individualCustomers === 'number', `Individual customers count: ${stats.individualCustomers}`);
    assert(typeof stats.corporateCustomers === 'number', `Corporate customers count: ${stats.corporateCustomers}`);
    assert(typeof stats.pendingRequests === 'number', `Pending requests count: ${stats.pendingRequests}`);
    assert(typeof stats.approvedRequests === 'number', `Approved requests count: ${stats.approvedRequests}`);
    assert(typeof stats.completedJourneys === 'number', `Completed passenger journeys: ${stats.completedJourneys}`);
    assert(typeof stats.deliveredShipments === 'number', `Delivered cargo shipments: ${stats.deliveredShipments}`);

    // Timeframe verification
    const timeframes = overviewRes.data.timeframes;
    assert(timeframes.daily && timeframes.weekly && timeframes.monthly && timeframes.allTime, 'Daily, weekly, monthly and all-time breakdown objects present');

    // 4. Customer Directories (Individual & Corporate)
    console.log('\n--- 4. Customer Directories ---');
    const indRes = await req('GET', '/api/admin/customers/individual', null, cookie);
    assert(indRes.status === 200 && Array.isArray(indRes.data), `Individual directory returned ${indRes.data.length} clients`);
    if (indRes.data.length > 0) {
      const c = indRes.data[0];
      assert(c.phone && (c.fullName || c.name) && typeof c.totalBookings === 'number', `Individual client structure verified: ${c.fullName || c.name} (${c.phone})`);
    }

    const corpRes = await req('GET', '/api/admin/customers/corporate', null, cookie);
    assert(corpRes.status === 200 && Array.isArray(corpRes.data), `Corporate directory returned ${corpRes.data.length} enterprise accounts`);
    if (corpRes.data.length > 0) {
      const c = corpRes.data[0];
      assert(c.companyName && typeof c.totalBookings === 'number', `Corporate account structure verified: ${c.companyName}`);
    }

    // 5. Fleet Vehicles Management (CRUD)
    console.log('\n--- 5. Fleet Vehicles CRUD & Status Updates ---');
    const testPlate = 'TEST-' + Math.floor(1000 + Math.random() * 9000);
    const addVehRes = await req('POST', '/api/admin/fleet/vehicles', {
      plate: testPlate,
      model: 'Scania R500 Test Heavy Truck',
      category: 'cargo',
      type: 'Heavy Flatbed Hauler',
      capacity: '40 Tons',
      status: 'Available',
      assigned_driver: 'Captain Test Driver',
      notes: 'Automated test fleet vehicle'
    }, cookie);
    assert(addVehRes.status === 201 && addVehRes.data.plate === testPlate, `POST /api/admin/fleet/vehicles created vehicle ${testPlate}`);

    const patchVehRes = await req('PATCH', '/api/admin/fleet/vehicles/' + testPlate, {
      status: 'Dispatched'
    }, cookie);
    assert(patchVehRes.status === 200 && patchVehRes.data.status === 'Dispatched', `PATCH /api/admin/fleet/vehicles/${testPlate} updated status to Dispatched`);

    const delVehRes = await req('DELETE', '/api/admin/fleet/vehicles/' + testPlate, null, cookie);
    assert(delVehRes.status === 200 && delVehRes.data.deleted, `DELETE /api/admin/fleet/vehicles/${testPlate} cleanly removed`);

    // 6. Certified Drivers Management (CRUD)
    console.log('\n--- 6. Certified Drivers CRUD & Status Updates ---');
    const addDriverRes = await req('POST', '/api/admin/fleet/drivers', {
      name: 'Captain Automated Tester',
      phone: '+249 912 999888',
      email: 'testdriver@asillogistics.com',
      category: 'both',
      license_type: 'Commercial Heavy Goods Class A',
      experience_years: 8,
      status: 'Active',
      assigned_vehicle: 'KRT-9011'
    }, cookie);
    assert(addDriverRes.status === 201 && addDriverRes.data.id, `POST /api/admin/fleet/drivers created driver #${addDriverRes.data.id}`);
    const testDriverId = addDriverRes.data.id;

    const patchDriverRes = await req('PATCH', '/api/admin/fleet/drivers/' + testDriverId, {
      status: 'On Trip'
    }, cookie);
    assert(patchDriverRes.status === 200 && patchDriverRes.data.status === 'On Trip', `PATCH /api/admin/fleet/drivers/${testDriverId} updated status to On Trip`);

    const delDriverRes = await req('DELETE', '/api/admin/fleet/drivers/' + testDriverId, null, cookie);
    assert(delDriverRes.status === 200 && delDriverRes.data.deleted, `DELETE /api/admin/fleet/drivers/${testDriverId} cleanly removed`);

    // 7. Booking Assignment & Status Management
    console.log('\n--- 7. Booking Management & Allocation ---');
    const bookingsRes = await req('GET', '/api/admin/bookings', null, cookie);
    assert(bookingsRes.status === 200 && Array.isArray(bookingsRes.data), `GET /api/admin/bookings returned ${bookingsRes.data.length} records`);
    
    if (bookingsRes.data.length > 0) {
      const b = bookingsRes.data[0];
      const patchBkRes = await req('PATCH', '/api/admin/bookings/' + b.id, {
        status: 'In Transit',
        assignedVehicle: 'Mercedes Actros Heavy Truck (Plate KRT-9011)',
        assignedDriver: 'Captain Osman Babiker (+249 912 445566)',
        internalNotes: 'Verified route clearance and GPS telematics link active.'
      }, cookie);
      assert(patchBkRes.status === 200 && patchBkRes.data.status === 'In Transit', `PATCH /api/admin/bookings/${b.id} updated status to In Transit and allocated vehicle/driver`);
    }

    // 8. Operational Reports
    console.log('\n--- 8. Operational Analytics & Reports ---');
    const repRes = await req('GET', '/api/admin/reports?period=all', null, cookie);
    assert(repRes.status === 200, 'GET /api/admin/reports?period=all returns 200');
    assert(typeof repRes.data.fulfillmentRate === 'number', `Fulfillment rate: ${repRes.data.fulfillmentRate}%`);
    assert(Array.isArray(repRes.data.cargoBreakdown), `Cargo goods classifications analyzed: ${repRes.data.cargoBreakdown.length}`);
    assert(Array.isArray(repRes.data.vehicleBreakdown), `Vehicle fleet breakdown analyzed: ${repRes.data.vehicleBreakdown.length}`);
    assert(Array.isArray(repRes.data.topRoutes), `Top logistics corridors analyzed: ${repRes.data.topRoutes.length}`);

    // 9. Admin Settings & Audit Logs
    console.log('\n--- 9. Settings, RBAC & Immutable Audit Logs ---');
    const setRes = await req('GET', '/api/admin/settings', null, cookie);
    assert(setRes.status === 200 && setRes.data.role === 'Super Administrator / Operations Director', 'Admin settings report role as Super Administrator / Operations Director');

    const logsRes = await req('GET', '/api/admin/audit-logs', null, cookie);
    assert(logsRes.status === 200 && Array.isArray(logsRes.data) && logsRes.data.length > 0, `GET /api/admin/audit-logs returned ${logsRes.data.length} immutable administrative actions`);

    // 10. Password Change Security & Reversion
    console.log('\n--- 10. Password Change Security ---');
    const pwdChangeRes = await req('POST', '/api/admin/settings/password', {
      oldPassword: 'admin123',
      newPassword: 'tempPassword456'
    }, cookie);
    assert(pwdChangeRes.status === 200 && pwdChangeRes.data.ok, 'POST /api/admin/settings/password changed password');

    // Test login with new password
    const testLoginNew = await req('POST', '/api/auth/login', { username: process.env.ADMIN_USER || 'admin', password: 'tempPassword456' });
    assert(testLoginNew.status === 200 && testLoginNew.data.ok, 'Login with new password succeeded');
    const newCookie = testLoginNew.headers['set-cookie'][0].split(';')[0];

    // Revert password back to admin12345 (>= 10 chars)
    const revertPwdRes = await req('POST', '/api/admin/settings/password', {
      oldPassword: 'tempPassword456',
      newPassword: 'admin12345'
    }, newCookie);
    assert(revertPwdRes.status === 200 && revertPwdRes.data.ok, 'Reverted password back to admin12345');

    // 11. Preserved Operational Modules (Transport, Distribution, Maintenance, Onboarding)
    console.log('\n--- 11. Preserved Operational Workflows ---');
    const finalCookie = (revertPwdRes.headers['set-cookie'] && revertPwdRes.headers['set-cookie'][0]) ? revertPwdRes.headers['set-cookie'][0].split(';')[0] : newCookie;
    const recordsRes = await req('GET', '/api/records', null, finalCookie);
    assert(recordsRes.status === 200 && Array.isArray(recordsRes.data), `GET /api/records returned ${recordsRes.data.length} operations records`);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

run();
