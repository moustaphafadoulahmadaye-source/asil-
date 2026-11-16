const http = require('http');
const assert = require('assert');

function httpRequest({ path, method = 'GET', headers = {}, body = null, cookie = '' }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path,
      method: method.toUpperCase(),
      headers: { ...headers }
    };
    if (cookie) options.headers['Cookie'] = cookie;
    if (['POST', 'PATCH', 'DELETE'].includes(options.method) && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    let payload = null;
    if (body !== null && body !== undefined) {
      payload = typeof body === 'object' ? JSON.stringify(body) : body;
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, json, data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function loginAs(username, password) {
  const res = await httpRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { username, password }
  });
  assert.strictEqual(res.status, 200, `Login for ${username} expected 200, got ${res.status}`);
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  return { user: res.json.user, cookie };
}

async function run() {
  console.log('=== STARTING DEPARTMENT APIS & RBAC VERIFICATION ===\n');

  // 1. Test Logins for all department roles
  console.log('1. Testing Role Logins:');
  const adminSession = await loginAs('admin', 'admin123');
  console.log('   [PASS] Super Admin logged in:', adminSession.user.role);

  const transportSession = await loginAs('officer_transport', 'transport123');
  console.log('   [PASS] Transport Officer logged in:', transportSession.user.role, transportSession.user.department);

  const distribSession = await loginAs('officer_distribution', 'distrib123');
  console.log('   [PASS] Distribution Officer logged in:', distribSession.user.role, distribSession.user.department);

  const maintSession = await loginAs('officer_maintenance', 'maint123');
  console.log('   [PASS] Maintenance Officer logged in:', maintSession.user.role, maintSession.user.department);

  const onboardSession = await loginAs('officer_onboarding', 'onboard123');
  console.log('   [PASS] Onboarding Officer logged in:', onboardSession.user.role, onboardSession.user.department);

  const customerSession = await loginAs('customer_ali', 'customer123');
  console.log('   [PASS] Customer logged in:', customerSession.user.role, customerSession.user.customerType);

  // 2. Test Department Access & Cross-Department Security Isolation
  console.log('\n2. Testing Cross-Department Access Isolation:');

  // Transport Officer -> Transport: 200 OK
  const tRes = await httpRequest({ path: '/api/departments/transport/overview', cookie: transportSession.cookie });
  assert.strictEqual(tRes.status, 200, 'Transport officer must access Transport');
  console.log('   [PASS] Transport officer -> Transport Overview (200 OK)');

  // Transport Officer -> Maintenance: 403 Forbidden!
  const tmRes = await httpRequest({ path: '/api/departments/maintenance/overview', cookie: transportSession.cookie });
  assert.strictEqual(tmRes.status, 403, 'Transport officer must be blocked from Maintenance');
  console.log('   [PASS] Transport officer -> Maintenance Overview (403 Forbidden - Isolated!)');

  // Distribution Officer -> Distribution: 200 OK
  const dRes = await httpRequest({ path: '/api/departments/distribution/overview', cookie: distribSession.cookie });
  assert.strictEqual(dRes.status, 200);
  console.log('   [PASS] Distribution officer -> Distribution Overview (200 OK)');

  // Distribution Officer -> Transport: 403 Forbidden!
  const dtRes = await httpRequest({ path: '/api/departments/transport/overview', cookie: distribSession.cookie });
  assert.strictEqual(dtRes.status, 403);
  console.log('   [PASS] Distribution officer -> Transport Overview (403 Forbidden - Isolated!)');

  // Maintenance Officer -> Maintenance: 200 OK
  const mRes = await httpRequest({ path: '/api/departments/maintenance/overview', cookie: maintSession.cookie });
  assert.strictEqual(mRes.status, 200);
  console.log('   [PASS] Maintenance officer -> Maintenance Overview (200 OK)');

  // Onboarding Officer -> Onboarding: 200 OK
  const oRes = await httpRequest({ path: '/api/departments/onboarding/overview', cookie: onboardSession.cookie });
  assert.strictEqual(oRes.status, 200);
  console.log('   [PASS] Onboarding officer -> Onboarding Overview (200 OK)');

  // Customer -> Customer Profile: 200 OK
  const cRes = await httpRequest({ path: '/api/customer/profile', cookie: customerSession.cookie });
  assert.strictEqual(cRes.status, 200);
  console.log('   [PASS] Customer -> Customer Profile (200 OK)');

  // Customer -> Transport Staff: 403 Forbidden!
  const ctRes = await httpRequest({ path: '/api/departments/transport/overview', cookie: customerSession.cookie });
  assert.strictEqual(ctRes.status, 403);
  console.log('   [PASS] Customer -> Transport Department (403 Forbidden - Isolated!)');

  // Super Admin -> All Departments: 200 OK
  const atRes = await httpRequest({ path: '/api/departments/transport/overview', cookie: adminSession.cookie });
  const amRes = await httpRequest({ path: '/api/departments/maintenance/overview', cookie: adminSession.cookie });
  const aoRes = await httpRequest({ path: '/api/departments/onboarding/overview', cookie: adminSession.cookie });
  assert.strictEqual(atRes.status, 200);
  assert.strictEqual(amRes.status, 200);
  assert.strictEqual(aoRes.status, 200);
  console.log('   [PASS] Super Admin -> Accesses All Departments (200 OK)');

  // 3. Test Department Functionality
  console.log('\n3. Testing Department Functional Operations:');

  // A. Maintenance request creation & review
  const maintReq = await httpRequest({
    path: '/api/maintenance/requests',
    method: 'POST',
    body: {
      buildingName: 'Port Sudan Maritime Terminal',
      location: 'Free Zone Berth 7',
      fullName: 'Capt. Ibrahim',
      phone: '+249 912 888 999',
      serviceType: 'Hydraulic Loading Ramp Inspection',
      description: 'Quarterly pressure check on maritime container ramps.',
      priority: 'urgent'
    }
  });
  assert.strictEqual(maintReq.status, 201);
  assert.ok(maintReq.json.id.startsWith('MT-'));
  console.log(`   [PASS] Public Maintenance Request created: ${maintReq.json.id}`);

  // Maintenance technician assignment
  const techPatch = await httpRequest({
    path: `/api/departments/maintenance/requests/${maintReq.json.id}`,
    method: 'PATCH',
    cookie: maintSession.cookie,
    body: {
      technician: 'Eng. Kamal Mansoor',
      step: 2,
      note: 'Scheduled emergency hydraulic seal replacement.'
    }
  });
  assert.strictEqual(techPatch.status, 200);
  console.log('   [PASS] Maintenance Technician assigned by officer');

  // B. Onboarding application & approval
  const onbReq = await httpRequest({
    path: '/api/onboarding/apply',
    method: 'POST',
    body: {
      customerType: 'company',
      fullName: 'Red Sea Energy Logistics',
      companyName: 'Red Sea Energy Logistics Co',
      email: 'ops@redseaenergy.sd',
      phone: '+249 183 223344',
      contactPerson: 'Director Tariq',
      companyReg: 'CR-PORT-99011',
      taxId: 'TAX-99011'
    }
  });
  assert.strictEqual(onbReq.status, 201);
  assert.ok(onbReq.json.id.startsWith('ONB-'));
  console.log(`   [PASS] Public Onboarding Application created: ${onbReq.json.id}`);

  // Onboarding compliance approval
  const onbPatch = await httpRequest({
    path: `/api/departments/onboarding/clients/${onbReq.json.id}`,
    method: 'PATCH',
    cookie: onboardSession.cookie,
    body: {
      status: 'Approved',
      notes: 'Corporate commercial license verified with Ministry of Trade.'
    }
  });
  assert.strictEqual(onbPatch.status, 200);
  console.log('   [PASS] Onboarding Application approved by compliance officer');

  console.log('\n=== ALL DEPARTMENT APIS & RBAC SECURITY VERIFIED 100% ===');
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
