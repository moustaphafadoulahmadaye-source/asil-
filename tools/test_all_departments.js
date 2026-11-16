const http = require('http');

function req(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000)));
    const opts = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    let bodyData = null;
    if (options.body) {
      bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const clientReq = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    clientReq.on('error', reject);
    if (bodyData) clientReq.write(bodyData);
    clientReq.end();
  });
}

async function login(username, password) {
  const res = await req('/api/auth/login', {
    method: 'POST',
    body: { username, password }
  });
  if (res.status !== 200 || !res.json.ok) {
    throw new Error(`Login failed for ${username}: ${res.status} ${res.body}`);
  }
  const setCookie = res.headers['set-cookie'];
  let cookie = '';
  if (setCookie && setCookie.length > 0) {
    cookie = setCookie[0].split(';')[0];
  }
  return { user: res.json.user, cookie };
}

async function runTests() {
  console.log('=====================================================');
  console.log('ASIL LOGISTICS: FULL DEPARTMENTS & RBAC AUDIT SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. PAGE ROUTES HTTP 200 TEST
  console.log('--- 1. Testing Dedicated Page Routing ---');
  const pages = [
    { url: '/', title: 'Home Page' },
    { url: '/home', title: 'Home Page (alias)' },
    { url: '/transport', title: 'Transport & Fleet Page' },
    { url: '/distribution', title: 'Distribution Page' },
    { url: '/maintenance', title: 'Building Maintenance Page' },
    { url: '/onboarding', title: 'Client Onboarding Page' },
    { url: '/portal', title: 'Customer Portal' },
    { url: '/customer', title: 'Customer Portal (alias)' },
    { url: '/admin', title: 'Admin Console' },
    { url: '/track', title: 'Tracking Page' }
  ];

  for (const p of pages) {
    const res = await req(p.url);
    const hasBrand = res.body.includes('ASIL Logistics') || res.body.includes('ASIL LOGISTICS');
    assert(res.status === 200 && hasBrand, `Page ${p.url} (${p.title}) responds HTTP 200`);
  }

  // 2. CORE ASSETS TEST
  console.log('\n--- 2. Testing Shared Core CSS & JS Assets ---');
  const assets = [
    '/css/asil-core.css',
    '/css/department-dashboard.css',
    '/js/asil-common.js',
    '/js/auth.js'
  ];
  for (const a of assets) {
    const res = await req(a);
    assert(res.status === 200 && res.body.length > 100, `Asset ${a} loads correctly`);
  }

  // 3. AUTHENTICATION TEST FOR ALL ROLES
  console.log('\n--- 3. Testing Central Authentication for All Roles ---');
  const accounts = [
    { u: 'admin', p: 'admin123', role: 'super_admin' },
    { u: 'officer_transport', p: 'transport123', role: 'dept_transport' },
    { u: 'officer_distribution', p: 'distrib123', role: 'dept_distribution' },
    { u: 'officer_maintenance', p: 'maint123', role: 'dept_maintenance' },
    { u: 'officer_onboarding', p: 'onboard123', role: 'dept_onboarding' },
    { u: 'customer_ali', p: 'customer123', role: 'customer' },
    { u: 'customer_nile', p: 'customer123', role: 'customer' }
  ];

  const sessions = {};
  for (const acc of accounts) {
    try {
      const sess = await login(acc.u, acc.p);
      sessions[acc.u] = sess;
      assert(sess.user && sess.user.role === acc.role, `Account "${acc.u}" signed in successfully with role "${acc.role}"`);
    } catch (e) {
      assert(false, `Account "${acc.u}" login failed: ${e.message}`);
    }
  }

  // 4. CROSS-DEPARTMENT 403 ISOLATION (RBAC)
  console.log('\n--- 4. Enforcing Cross-Department RBAC Isolation (403 Blocks) ---');
  const isolationTests = [
    {
      actor: 'officer_transport',
      targetUrl: '/api/departments/distribution/overview',
      name: 'Transport officer blocked from Distribution overview'
    },
    {
      actor: 'officer_transport',
      targetUrl: '/api/departments/maintenance/overview',
      name: 'Transport officer blocked from Maintenance overview'
    },
    {
      actor: 'officer_distribution',
      targetUrl: '/api/departments/transport/overview',
      name: 'Distribution officer blocked from Transport overview'
    },
    {
      actor: 'officer_distribution',
      targetUrl: '/api/departments/onboarding/overview',
      name: 'Distribution officer blocked from Onboarding overview'
    },
    {
      actor: 'officer_maintenance',
      targetUrl: '/api/departments/transport/bookings',
      name: 'Maintenance officer blocked from Transport bookings'
    },
    {
      actor: 'officer_onboarding',
      targetUrl: '/api/departments/maintenance/requests',
      name: 'Onboarding officer blocked from Maintenance work orders'
    },
    {
      actor: 'customer_ali',
      targetUrl: '/api/admin/users',
      name: 'Customer blocked from Admin users console'
    },
    {
      actor: 'customer_ali',
      targetUrl: '/api/departments/transport/overview',
      name: 'Customer blocked from internal staff department APIs'
    }
  ];

  for (const t of isolationTests) {
    const res = await req(t.targetUrl, {
      headers: { Cookie: sessions[t.actor].cookie }
    });
    assert(res.status === 403, `${t.name} -> returned HTTP 403 Forbidden`);
  }

  // 5. SUPER ADMIN UNIVERSAL ACCESS
  console.log('\n--- 5. Verifying Super Admin Universal Department Access ---');
  const deptEndpoints = [
    '/api/departments/transport/overview',
    '/api/departments/distribution/overview',
    '/api/departments/maintenance/overview',
    '/api/departments/onboarding/overview',
    '/api/admin/users',
    '/api/admin/reports'
  ];
  for (const ep of deptEndpoints) {
    const res = await req(ep, {
      headers: { Cookie: sessions['admin'].cookie }
    });
    assert(res.status === 200, `Super Admin accessed ${ep} successfully (HTTP 200)`);
  }

  // 6. PUBLIC WORKFLOW SUBMISSIONS & TRACKING
  console.log('\n--- 6. Testing Public Submissions & Tracking Workflows ---');

  // Verify anonymous booking blocked with 401
  const anonPassRes = await req('/api/bookings', {
    method: 'POST',
    body: { departure: 'Khartoum', destination: 'Port Sudan' }
  });
  assert(anonPassRes.status === 401, 'Anonymous passenger booking correctly rejected with 401');

  const anonCargoRes = await req('/api/cargo/bookings', {
    method: 'POST',
    body: { pickupLocation: 'Khartoum', deliveryDestination: 'Port Sudan' }
  });
  assert(anonCargoRes.status === 401, 'Anonymous cargo booking correctly rejected with 401');

  // A. Passenger Booking (Authenticated Customer)
  const passRes = await req('/api/bookings', {
    method: 'POST',
    headers: { Cookie: sessions['customer_ali'].cookie },
    body: {
      customerType: 'company',
      companyName: 'Sudan Oil & Energy Corp',
      contactPerson: 'Dr. Tariq Al-Hassan',
      fullName: 'Dr. Tariq Al-Hassan',
      email: 'tariq@energycorp.sd',
      phone: '+249 912 888 777',
      departure: 'Khartoum Executive Terminal',
      destination: 'Port Sudan Energy Facility',
      travelDate: '2026-11-20',
      departureTime: '08:00 AM',
      passengers: 4,
      vehiclePreference: 'Executive SUV',
      instructions: 'VIP airport escort requested'
    }
  });
  assert((passRes.status === 200 || passRes.status === 201) && passRes.json.id, `Passenger trip registered: ${passRes.json.id}`);
  const passId = passRes.json.id;

  // B. Cargo Booking (Authenticated Customer)
  const cargoRes = await req('/api/cargo/bookings', {
    method: 'POST',
    headers: { Cookie: sessions['customer_nile'].cookie },
    body: {
      customerType: 'company',
      companyName: 'Nile Agro Industries Ltd',
      contactPerson: 'Omer Farouk',
      fullName: 'Omer Farouk',
      email: 'omer@agro.sd',
      phone: '+249 912 333 444',
      pickupLocation: 'Gezira Agricultural Complex',
      deliveryDestination: 'Port Sudan Container Freight Station',
      pickupDate: '2026-11-22',
      deliveryDate: '2026-11-25',
      cargoType: 'Agricultural Produce',
      cargoDesc: 'Organic sesame seeds in sanitized bags',
      packagesCount: 150,
      cargoWeight: '12.5 Metric Tons',
      specialHandling: 'Keep dry, palletized',
      vehiclePreference: 'Flatbed Heavy Truck'
    }
  });
  assert((cargoRes.status === 200 || cargoRes.status === 201) && cargoRes.json.id, `Cargo consignment registered: ${cargoRes.json.id}`);
  const cargoId = cargoRes.json.id;

  // C. Maintenance Request
  const maintRes = await req('/api/maintenance/requests', {
    method: 'POST',
    body: {
      buildingName: 'Al-Baraka Commercial Tower',
      location: 'Nile Ave, Khartoum',
      fullName: 'Yasir Babiker',
      email: 'yasir@baraka.sd',
      phone: '+249 911 223 344',
      serviceType: 'Central Chiller HVAC Failure',
      issueDescription: 'Cooling tower compressor unit #3 vibrating excessively and tripping breaker.',
      priority: 'urgent'
    }
  });
  assert(maintRes.status === 201 && maintRes.json.id, `Maintenance work order registered: ${maintRes.json.id}`);
  const maintId = maintRes.json.id;

  // D. Onboarding Application
  const onbRes = await req('/api/onboarding/apply', {
    method: 'POST',
    body: {
      customerType: 'company',
      companyName: 'Red Sea Mining Syndicate',
      companyReg: 'CR-90812-RS',
      taxId: 'TIN-556102-SD',
      contactPerson: 'Eng. Mona Mansour',
      fullName: 'Mona Mansour',
      email: 'mona@redseamining.sd',
      phone: '+249 912 667 889',
      billingAddress: 'Commercial Free Zone, Port Sudan',
      serviceInterest: 'Heavy Freight Haulage',
      volumeScope: 'High Enterprise (20+ monthly freight)'
    }
  });
  assert(onbRes.status === 201 && onbRes.json.id, `Onboarding application registered: ${onbRes.json.id}`);
  const onbId = onbRes.json.id;

  // E. Tracking verification for all four (with phone last 4 digits verifier)
  const verifiers = {
    [passId]: '8777',
    [cargoId]: '3444',
    [maintId]: '3344',
    [onbId]: '7889'
  };
  for (const tid of [passId, cargoId, maintId, onbId]) {
    const trackRes = await req('/api/bookings/' + tid + '?verifier=' + verifiers[tid]);
    const matched = trackRes.status === 200 && (trackRes.json.id === tid || (trackRes.json.booking && trackRes.json.booking.id === tid));
    assert(matched, `Public tracking for ${tid} returned valid status`);
  }

  // 7. DEPARTMENT INTERNAL WORKFLOWS
  console.log('\n--- 7. Testing Department Operational Actions ---');

  // A. Transport Officer assigns vehicle & driver
  const trUpdate = await req('/api/departments/transport/bookings/' + passId, {
    method: 'PATCH',
    headers: { Cookie: sessions['officer_transport'].cookie },
    body: {
      status: 'Approved',
      assignedVehicle: 'KRT-1002 - Toyota Land Cruiser Prado',
      assignedDriver: 'Ahmed Chauffeur',
      internalNotes: 'Driver confirmed for 07:00 departure.'
    }
  });
  assert(trUpdate.status === 200 && trUpdate.json.status === 'Approved', `Transport officer approved & dispatched ${passId}`);

  // B. Distribution Officer updates cargo to In Transit
  const crUpdate = await req('/api/departments/distribution/cargo/' + cargoId, {
    method: 'PATCH',
    headers: { Cookie: sessions['officer_distribution'].cookie },
    body: {
      status: 'In Transit',
      assignedVehicle: 'KRT-5001 - Mercedes Actros Heavy Trailer',
      assignedDriver: 'Babiker Heavy Driver',
      internalNotes: 'Consignment departed Gezira facility.'
    }
  });
  assert(crUpdate.status === 200 && crUpdate.json.status === 'In Transit', `Distribution officer dispatched cargo ${cargoId} (In Transit)`);

  // C. Maintenance Officer assigns technician
  const mtUpdate = await req('/api/departments/maintenance/requests/' + maintId, {
    method: 'PATCH',
    headers: { Cookie: sessions['officer_maintenance'].cookie },
    body: {
      step: 3,
      technician: 'Kamal HVAC Specialist',
      note: 'Compressor inspected, replacement solenoid valve installed.'
    }
  });
  assert(mtUpdate.status === 200 && mtUpdate.json.step === 3, `Maintenance officer assigned technician to ${maintId}`);

  // D. Onboarding Officer approves client KYC
  const obUpdate = await req('/api/departments/onboarding/clients/' + onbId, {
    method: 'PATCH',
    headers: { Cookie: sessions['officer_onboarding'].cookie },
    body: {
      status: 'Approved',
      notes: 'Commercial trade registration verified with Ministry of Commerce. Approved for Net 30.'
    }
  });
  assert(obUpdate.status === 200 && obUpdate.json.status === 'Approved', `Onboarding officer approved client KYC ${onbId}`);

  // 8. CUSTOMER PORTAL FUNCTIONALITY
  console.log('\n--- 8. Testing Customer Portal APIs ---');
  const custProf = await req('/api/customer/profile', {
    headers: { Cookie: sessions['customer_nile'].cookie }
  });
  assert(custProf.status === 200 && custProf.json.customer.company_name === 'Nile Agro Industries Ltd', 'Customer portal profile returned verified company name');

  const custBk = await req('/api/customer/bookings', {
    headers: { Cookie: sessions['customer_nile'].cookie }
  });
  assert(custBk.status === 200 && Array.isArray(custBk.json.bookings) && custBk.json.bookings.length > 0, `Customer portal retrieved ${custBk.json.bookings.length} linked bookings`);

  // 9. ADMIN RBAC USER MANAGEMENT
  console.log('\n--- 9. Testing Admin RBAC User Management ---');
  const newStaffRes = await req('/api/admin/users', {
    method: 'POST',
    headers: { Cookie: sessions['admin'].cookie },
    body: {
      fullName: 'Samira Idris',
      username: 'officer_samira_' + Date.now().toString().slice(-4),
      email: 'samira.' + Date.now().toString().slice(-4) + '@asillogistics.sd',
      phone: '+249 912 777 999',
      password: 'password123',
      role: 'dept_transport',
      department: 'transport'
    }
  });
  assert(newStaffRes.status === 201 && newStaffRes.json.id, `Admin created new RBAC staff user: ${newStaffRes.json.id}`);

  console.log('\n=====================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
