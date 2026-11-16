const http = require('http');

const PORT = process.env.PORT || 3000;

function req(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (cookie) options.headers['Cookie'] = cookie;
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function test() {
  console.log('=== TESTING NEW ADMIN BACKEND ENDPOINTS ===\n');

  // 1. Authenticate
  const loginRes = await req('/api/auth/login', 'POST', { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
  if (loginRes.status !== 200 || !loginRes.headers['set-cookie']) {
    console.error('❌ Login failed', loginRes);
    process.exit(1);
  }
  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('✅ Authenticated admin session obtained');

  // 2. Test /api/admin/overview
  const ovRes = await req('/api/admin/overview', 'GET', null, cookie);
  if (ovRes.status === 200 && ovRes.body.stats) {
    console.log('✅ /api/admin/overview: OK! 8 Core Statistics:');
    console.log('   - Total Passenger Bookings:', ovRes.body.stats.totalPassengerBookings);
    console.log('   - Total Cargo Bookings:', ovRes.body.stats.totalCargoBookings);
    console.log('   - Individual Customers:', ovRes.body.stats.individualCustomers);
    console.log('   - Corporate Customers:', ovRes.body.stats.corporateCustomers);
    console.log('   - Pending Requests:', ovRes.body.stats.pendingRequests);
    console.log('   - Approved Requests:', ovRes.body.stats.approvedRequests);
    console.log('   - Completed Journeys:', ovRes.body.stats.completedJourneys);
    console.log('   - Delivered Shipments:', ovRes.body.stats.deliveredShipments);
    console.log('   - Daily / Weekly / Monthly timeframes:', Object.keys(ovRes.body.timeframes));
  } else {
    console.error('❌ /api/admin/overview failed', ovRes);
    process.exit(1);
  }

  // 3. Test /api/admin/customers/individual
  const indRes = await req('/api/admin/customers/individual', 'GET', null, cookie);
  if (indRes.status === 200 && Array.isArray(indRes.body)) {
    console.log(`✅ /api/admin/customers/individual: OK! Found ${indRes.body.length} unique individual accounts.`);
    if (indRes.body.length > 0) {
      console.log('   Sample:', indRes.body[0].fullName, `(${indRes.body[0].totalBookings} bookings)`);
    }
  } else {
    console.error('❌ /api/admin/customers/individual failed', indRes);
    process.exit(1);
  }

  // 4. Test /api/admin/customers/corporate
  const corpRes = await req('/api/admin/customers/corporate', 'GET', null, cookie);
  if (corpRes.status === 200 && Array.isArray(corpRes.body)) {
    console.log(`✅ /api/admin/customers/corporate: OK! Found ${corpRes.body.length} unique corporate accounts.`);
    if (corpRes.body.length > 0) {
      console.log('   Sample:', corpRes.body[0].companyName, `(${corpRes.body[0].totalBookings} shipments/travels)`);
    }
  } else {
    console.error('❌ /api/admin/customers/corporate failed', corpRes);
    process.exit(1);
  }

  // 5. Test Fleet: Vehicles
  const vRes = await req('/api/admin/fleet/vehicles', 'GET', null, cookie);
  if (vRes.status === 200 && Array.isArray(vRes.body) && vRes.body.length >= 10) {
    console.log(`✅ /api/admin/fleet/vehicles: OK! Found ${vRes.body.length} fleet vehicles.`);
    console.log('   Sample vehicle:', vRes.body[0].model, `(Plate: ${vRes.body[0].plate}, Status: ${vRes.body[0].status})`);
  } else {
    console.error('❌ /api/admin/fleet/vehicles failed', vRes);
    process.exit(1);
  }

  // 6. Test Crew: Drivers
  const dRes = await req('/api/admin/fleet/drivers', 'GET', null, cookie);
  if (dRes.status === 200 && Array.isArray(dRes.body) && dRes.body.length >= 6) {
    console.log(`✅ /api/admin/fleet/drivers: OK! Found ${dRes.body.length} drivers.`);
    console.log('   Sample driver:', dRes.body[0].name, `(License: ${dRes.body[0].license_type})`);
  } else {
    console.error('❌ /api/admin/fleet/drivers failed', dRes);
    process.exit(1);
  }

  // 7. Test Reports:
  const repRes = await req('/api/admin/reports?period=all', 'GET', null, cookie);
  if (repRes.status === 200 && repRes.body.total !== undefined) {
    console.log('✅ /api/admin/reports: OK! Metrics:', {
      total: repRes.body.total,
      completed: repRes.body.completed,
      fulfillmentRate: repRes.body.fulfillmentRate + '%',
      cargoTypes: repRes.body.cargoTypes.length,
      vehiclePrefs: repRes.body.vehiclePrefs.length
    });
  } else {
    console.error('❌ /api/admin/reports failed', repRes);
    process.exit(1);
  }

  // 8. Test Settings:
  const setRes = await req('/api/admin/settings', 'GET', null, cookie);
  if (setRes.status === 200 && setRes.body.role.includes('Super Administrator')) {
    console.log('✅ /api/admin/settings: OK! Role:', setRes.body.role, 'Timezone:', setRes.body.timezone);
  } else {
    console.error('❌ /api/admin/settings failed', setRes);
    process.exit(1);
  }

  // 9. Test Audit Logs:
  const logRes = await req('/api/admin/audit-logs', 'GET', null, cookie);
  if (logRes.status === 200 && Array.isArray(logRes.body) && logRes.body.length > 0) {
    console.log(`✅ /api/admin/audit-logs: OK! Recorded ${logRes.body.length} administrative actions.`);
    console.log('   Latest Action:', logRes.body[0].action, `(Target: ${logRes.body[0].target_id})`);
  } else {
    console.error('❌ /api/admin/audit-logs failed', logRes);
    process.exit(1);
  }

  console.log('\n=== ALL NEW ADMIN ENDPOINTS VERIFIED SUCCESSFULLY! ===');
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
