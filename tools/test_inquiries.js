#!/usr/bin/env node
/**
 * Test Suite: Customer Inquiries & Admin Inquiries Management
 * Verifies POST /api/inquiries (validation, honeypot spam bot trapping, persistence)
 * and admin endpoints GET/PATCH/DELETE /api/admin/inquiries.
 */
const http = require('http');

const PORT = process.env.PORT || 3000;
let errors = 0;

function req(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) {
      options.headers['Cookie'] = cookie;
    }
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    errors++;
  } else {
    console.log(`  ✅ PASSED: ${message}`);
  }
}

async function main() {
  console.log('--- TEST SUITE: Customer Inquiries & Admin Operations ---');

  // 1. Validation test: Missing fields
  console.log('\n[1] Testing POST /api/inquiries Validation:');
  const emptyRes = await req('/api/inquiries', 'POST', {});
  assert(emptyRes.status === 400, `Empty payload returns 400 (got ${emptyRes.status})`);
  assert(emptyRes.body && emptyRes.body.error, `Error message returned: "${emptyRes.body?.error}"`);

  const invalidEmailRes = await req('/api/inquiries', 'POST', {
    name: 'Test Sender',
    email: 'not-an-email',
    phone: '12345678',
    message: 'Testing invalid email validation'
  });
  assert(invalidEmailRes.status === 400, `Invalid email returns 400 (got ${invalidEmailRes.status})`);

  const shortMsgRes = await req('/api/inquiries', 'POST', {
    name: 'Test Sender',
    email: 'test@example.com',
    phone: '12345678',
    message: 'Hi'
  });
  assert(shortMsgRes.status === 400, `Message shorter than 5 chars returns 400 (got ${shortMsgRes.status})`);

  // 2. Honeypot test: Bot submission should return 200 silently without persisting
  console.log('\n[2] Testing Honeypot Bot Trap:');
  const botRes = await req('/api/inquiries', 'POST', {
    name: 'Spam Bot',
    email: 'spammer@example.com',
    phone: '12345678',
    message: 'This is spam content for search engine index',
    _hp: 'http://spam-link.com'
  });
  assert(botRes.status === 200, `Honeypot trigger returns 200 fake success (got ${botRes.status})`);

  // 3. Valid inquiry submission
  console.log('\n[3] Testing Valid Inquiry Submission:');
  const validPayload = {
    name: 'Dr. Tariq Al-Mahdi',
    email: 'tariq.mahdi@example.com',
    phone: '+249 912 345 678',
    department: 'Distribution & Freight Haulage',
    message: 'Inquiring regarding scheduled container freight haulage from Port Sudan to Khartoum.'
  };
  const submitRes = await req('/api/inquiries', 'POST', validPayload);
  assert(submitRes.status === 201, `Valid inquiry returns 201 Created (got ${submitRes.status})`);
  assert(submitRes.body && submitRes.body.id && submitRes.body.id.startsWith('INQ-'), `Returns valid INQ ID (${submitRes.body?.id})`);
  const inquiryId = submitRes.body?.id;

  // 4. Unauthenticated Admin Inquiries Endpoint access
  console.log('\n[4] Testing RBAC /api/admin/inquiries (Unauthenticated):');
  const unauthRes = await req('/api/admin/inquiries', 'GET');
  assert(unauthRes.status === 401, `Unauthenticated access to /api/admin/inquiries returns 401 (got ${unauthRes.status})`);

  // 5. Authenticate as Super Admin
  console.log('\n[5] Authenticating as Super Admin:');
  let adminLogin = await req('/api/auth/login', 'POST', {
    username: process.env.ADMIN_USER || 'admin',
    password: 'admin12345'
  });
  if (adminLogin.status !== 200) {
    adminLogin = await req('/api/auth/login', 'POST', {
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });
  }
  assert(adminLogin.status === 200, `Super Admin logged in (status ${adminLogin.status})`);
  const adminCookie = adminLogin.headers['set-cookie'] ? adminLogin.headers['set-cookie'][0].split(';')[0] : '';
  assert(!!adminCookie, 'Received session cookie');

  // 6. Super Admin fetches inquiries
  console.log('\n[6] Super Admin fetching inquiries list:');
  const listRes = await req('/api/admin/inquiries', 'GET', null, adminCookie);
  assert(listRes.status === 200, `GET /api/admin/inquiries returns 200 (got ${listRes.status})`);
  const inquiriesList = Array.isArray(listRes.body) ? listRes.body : (listRes.body.inquiries || []);
  assert(Array.isArray(inquiriesList), 'Inquiries response contains an array');

  const found = inquiriesList.find(i => i.id === inquiryId);
  assert(!!found, `Created inquiry ${inquiryId} found in list`);
  if (found) {
    assert(found.name === validPayload.name, `Name matches: ${found.name}`);
    assert(found.email === validPayload.email, `Email matches: ${found.email}`);
    assert(found.phone === validPayload.phone, `Phone matches: ${found.phone}`);
    assert(found.status === 'new', `Initial status is 'new' (got ${found.status})`);
  }

  // Verify honeypot bot did NOT get saved to DB
  const botFound = inquiriesList.find(i => i.name === 'Spam Bot');
  assert(!botFound, 'Honeypot bot submission was NOT saved to the inquiries table');

  // 7. Update status to 'read' and 'replied'
  console.log('\n[7] Testing PATCH /api/admin/inquiries/:id status transitions:');
  const patchReadRes = await req(`/api/admin/inquiries/${inquiryId}`, 'PATCH', { status: 'read' }, adminCookie);
  assert(patchReadRes.status === 200, `Updating status to 'read' returns 200 (got ${patchReadRes.status})`);
  assert(patchReadRes.body.status === 'read', 'Status successfully changed to read');

  const patchRepliedRes = await req(`/api/admin/inquiries/${inquiryId}`, 'PATCH', { status: 'replied' }, adminCookie);
  assert(patchRepliedRes.status === 200, `Updating status to 'replied' returns 200 (got ${patchRepliedRes.status})`);
  assert(patchRepliedRes.body.status === 'replied', 'Status successfully changed to replied');

  const patchInvalidRes = await req(`/api/admin/inquiries/${inquiryId}`, 'PATCH', { status: 'fake_status' }, adminCookie);
  assert(patchInvalidRes.status === 400, `Invalid status rejected with 400 (got ${patchInvalidRes.status})`);

  // 8. Delete inquiry
  console.log('\n[8] Testing DELETE /api/admin/inquiries/:id:');
  const delRes = await req(`/api/admin/inquiries/${inquiryId}`, 'DELETE', null, adminCookie);
  assert(delRes.status === 200, `DELETE inquiry returns 200 (got ${delRes.status})`);

  const verifyList = await req('/api/admin/inquiries', 'GET', null, adminCookie);
  const verifyArray = Array.isArray(verifyList.body) ? verifyList.body : (verifyList.body.inquiries || []);
  const stillExists = verifyArray.some(i => i.id === inquiryId);
  assert(!stillExists, `Deleted inquiry ${inquiryId} no longer appears in inquiries list`);

  // 9. Non-super admin RBAC test
  console.log('\n[9] Testing Non-Super Admin access to /api/admin/inquiries:');
  const deptLogin = await req('/api/auth/login', 'POST', {
    username: 'officer_samira_1988',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  });
  if (deptLogin.status === 200 && deptLogin.headers['set-cookie']) {
    const deptCookie = deptLogin.headers['set-cookie'][0].split(';')[0];
    const deptRes = await req('/api/admin/inquiries', 'GET', null, deptCookie);
    assert(deptRes.status === 403, `Department staff forbidden from inquiries endpoint: 403 (got ${deptRes.status})`);
  } else {
    console.log('  ⚠️ Skipping department officer login check (user not seeded or credentials mismatch)');
  }

  console.log(`\n===============================================================`);
  if (errors === 0) {
    console.log('✅ ALL INQUIRY ENDPOINT & ADMIN TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error(`❌ INQUIRY TESTS COMPLETED WITH ${errors} ERRORS.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error during inquiry test execution:', err);
  process.exit(1);
});
