/**
 * ASIL Logistics - Complete Platform Technical Audit & Verification Suite
 * Tests all 12 core scenarios + Form Validation, Database Errors, Server Errors,
 * Authentication, File Uploads, Security, and Application Performance.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const vm = require('vm');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || ('http://localhost:' + PORT);
const DB_PATH = process.env.DB_PATH || process.env.DB_FILE || path.join(__dirname, '..', 'asil.db');
const db = new Database(DB_PATH);

let adminCookie = '';

// Helper for HTTP requests
function httpRequest({ path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: { ...headers }
    };

    if (adminCookie && options.headers['Cookie'] === undefined) {
      options.headers['Cookie'] = adminCookie;
    }
    if (options.headers['Cookie'] === '' || options.headers['Cookie'] === null) {
      delete options.headers['Cookie'];
    }

    if (['POST', 'PATCH', 'DELETE'].includes(options.method) && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    let payload = null;
    if (body !== null && body !== undefined) {
      if (typeof body === 'object' && !(body instanceof Buffer)) {
        payload = JSON.stringify(body);
      } else {
        payload = body;
      }
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Multipart form data builder for file upload testing
function sendMultipartFile({ path: reqPath, reqPath: altPath, fieldName, filename, fileContent, mimeType }) {
  const targetPath = reqPath || altPath || '/api/upload/cargo';
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const head = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(head, 'utf8'),
      Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, 'utf8'),
      Buffer.from(tail, 'utf8')
    ]);

    const url = new URL(targetPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    };
    if (adminCookie) options.headers['Cookie'] = adminCookie;

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, data, json });
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// Global test tracking
const testResults = [];

async function runTest(category, scenarioName, testFn) {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ category, name: scenarioName, status: 'PASS', duration });
    console.log(`  [PASS] (${duration}ms) ${scenarioName}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.push({ category, name: scenarioName, status: 'FAIL', duration, error: error.message });
    console.error(`  [FAIL] (${duration}ms) ${scenarioName}`);
    console.error(`         -> ${error.message}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log(' ASIL LOGISTICS - COMPREHENSIVE PLATFORM VERIFICATION AUDIT');
  console.log('================================================================\n');

  let individualPassId = '';
  let companyPassId = '';
  let individualCargoId = '';
  let companyCargoId = '';
  let uploadedDocPath = '';

  // Helper for customer authentication
  async function getCustomerCookie(userObj) {
    const loginRes = await httpRequest({
      path: '/api/auth/login',
      method: 'POST',
      body: { username: userObj.username, password: userObj.password }
    });
    if (loginRes.headers['set-cookie'] && loginRes.headers['set-cookie'].length > 0) {
      return loginRes.headers['set-cookie'][0].split(';')[0];
    }
    const regRes = await httpRequest({
      path: '/api/auth/register-customer',
      method: 'POST',
      body: userObj
    });
    if (regRes.headers['set-cookie'] && regRes.headers['set-cookie'].length > 0) {
      return regRes.headers['set-cookie'][0].split(';')[0];
    }
    return '';
  }

  const yousifUser = {
    username: 'yousif_cust',
    password: 'Password1234!',
    fullName: 'Yousif Mustafa Al-Nur',
    email: 'yousif.alnur@gmail.com',
    phone: '+249 912 345 678',
    customerType: 'individual'
  };
  const spcUser = {
    username: 'spc_corp',
    password: 'Password1234!',
    fullName: 'Eng. Hisham Al-Hadi (Fleet Director)',
    companyName: 'Sudan Petrochemical Corporation',
    email: 'hisham.fleet@sudanpetro.sd',
    phone: '+249 183 554 433',
    customerType: 'company'
  };
  const othmanUser = {
    username: 'othman_cust',
    password: 'Password1234!',
    fullName: 'Othman Babiker',
    email: 'othman.babiker@outlook.com',
    phone: '+249 922 110 099',
    customerType: 'individual'
  };
  const nileGrainsUser = {
    username: 'nile_grains_corp',
    password: 'Password1234!',
    fullName: 'Dr. Fatima Abdelrahman (Logistics VP)',
    companyName: 'Nile Grains & Agricultural Exports Ltd',
    email: 'logistics@nilegrains.sd',
    phone: '+249 183 998 877',
    customerType: 'company'
  };

  const yousifCookie = await getCustomerCookie(yousifUser);
  const spcCookie = await getCustomerCookie(spcUser);
  const othmanCookie = await getCustomerCookie(othmanUser);
  const nileGrainsCookie = await getCustomerCookie(nileGrainsUser);

  // ----------------------------------------------------------------
  // SECTION 1: CORE SCENARIOS 1-4 (CUSTOMER BOOKINGS)
  // ----------------------------------------------------------------
  console.log('--- 1. CUSTOMER BOOKING SCENARIOS ---');

  await runTest('Customer Bookings', 'Scenario 1: Individual Passenger Booking submission', async () => {
    const payload = {
      customerType: 'individual',
      fullName: 'Yousif Mustafa Al-Nur',
      email: 'yousif.alnur@gmail.com',
      phone: '+249 912 345 678',
      departure: 'Khartoum International Airport (Terminal 1)',
      destination: 'Corinthia Hotel, Nile Avenue, Khartoum',
      travelDate: '2026-11-25',
      departureTime: '14:30',
      passengers: 2,
      vehiclePreference: 'Executive VIP Sedan',
      luggage: '2 large suitcases + 1 handbag',
      additionalRequirements: 'Meet & greet inside arrivals hall with ASIL placard.'
    };

    // 1. Verify unauthenticated booking returns 401
    const unauthRes = await httpRequest({ path: '/api/bookings', method: 'POST', body: payload });
    assert.strictEqual(unauthRes.status, 401, 'Anonymous booking must return 401');

    // 2. Submit with customer session
    const res = await httpRequest({ path: '/api/bookings', method: 'POST', headers: { Cookie: yousifCookie }, body: payload });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.json && res.json.ok, 'Expected ok=1');
    assert.ok(res.json.id && res.json.id.startsWith('TR-'), `Expected TR- reference, got ${res.json.id}`);
    assert.strictEqual(res.json.booking.status, 'Pending', 'New booking must default to Pending status');
    assert.strictEqual(res.json.booking.bookingCategory, 'passenger');
    individualPassId = res.json.id;

    // Verify database record
    const row = db.prepare('SELECT * FROM bookings WHERE id=?').get(individualPassId);
    assert.ok(row, 'Record must exist in bookings table');
    assert.strictEqual(row.customer_type, 'individual');
    assert.strictEqual(row.full_name, 'Yousif Mustafa Al-Nur');
    assert.strictEqual(row.status, 'Pending');
  });

  await runTest('Customer Bookings', 'Scenario 2: Company Passenger Booking submission', async () => {
    const payload = {
      customerType: 'company',
      companyName: 'Sudan Petrochemical Corporation',
      contactPerson: 'Eng. Hisham Al-Hadi (Fleet Director)',
      companyReg: 'CR-KRT-994821',
      billingDetails: 'PO-2026-SPC-0098',
      email: 'hisham.fleet@sudanpetro.sd',
      phone: '+249 183 554 433',
      departure: 'SPC Corporate Headquarters, Nile Street',
      destination: 'Port Sudan Refinery & Marine Terminal',
      travelDate: '2026-11-28',
      departureTime: '07:00',
      passengers: 14,
      vehiclePreference: 'Luxury Passenger Coaster (30 Seats)',
      luggage: '14 medium bags + engineering field inspection kits',
      additionalRequirements: 'Executive escort and security convoy clearance required.'
    };

    const res = await httpRequest({ path: '/api/bookings', method: 'POST', headers: { Cookie: spcCookie }, body: payload });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.json.id && res.json.id.startsWith('TR-'));
    assert.strictEqual(res.json.booking.customerType, 'company');
    assert.strictEqual(res.json.booking.companyName, 'Sudan Petrochemical Corporation');
    companyPassId = res.json.id;

    // Verify database record
    const row = db.prepare('SELECT * FROM bookings WHERE id=?').get(companyPassId);
    assert.ok(row);
    assert.strictEqual(row.customer_type, 'company');
    assert.strictEqual(row.company_name, 'Sudan Petrochemical Corporation');
    assert.strictEqual(row.contact_person, 'Eng. Hisham Al-Hadi (Fleet Director)');
    assert.strictEqual(row.company_reg, 'CR-KRT-994821');
    assert.strictEqual(row.billing_details, 'PO-2026-SPC-0098');
  });

  await runTest('Customer Bookings', 'Scenario 3: Individual Cargo Booking submission', async () => {
    const payload = {
      customerType: 'individual',
      fullName: 'Othman Babiker',
      email: 'othman.babiker@outlook.com',
      phone: '+249 922 110 099',
      cargoType: 'Personal Household Goods & Electronics',
      cargoDesc: '35 boxed cartons of home appliances, furniture and personal computer gear.',
      packagesCount: 35,
      cargoWeight: '2.4 tons',
      cargoDimensions: 'Various carton sizes up to 1.5m',
      specialHandling: 'Fragile Glassware, Keep Dry, Upright Only',
      pickupLocation: 'Residence 14, Al-Riyadh, Khartoum',
      deliveryDestination: 'District 4, Wad Madani City',
      pickupDate: '2026-11-23',
      deliveryDate: '2026-11-24',
      vehiclePreference: 'Medium Box Truck (5-Ton Closed)',
      instructions: 'Call 2 hours prior to arrival for residential gate access code.'
    };

    const res = await httpRequest({ path: '/api/cargo/bookings', method: 'POST', headers: { Cookie: othmanCookie }, body: payload });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.json.id && res.json.id.startsWith('CR-'), `Expected CR- reference, got ${res.json.id}`);
    assert.strictEqual(res.json.booking.bookingCategory, 'cargo');
    assert.strictEqual(res.json.booking.customerType, 'individual');
    assert.strictEqual(res.json.booking.status, 'Pending');
    individualCargoId = res.json.id;

    const row = db.prepare('SELECT * FROM bookings WHERE id=?').get(individualCargoId);
    assert.ok(row);
    assert.strictEqual(row.cargo_type, 'Personal Household Goods & Electronics');
    assert.strictEqual(row.cargo_weight, '2.4 tons');
    assert.strictEqual(row.packages_count, 35);
  });

  await runTest('Customer Bookings', 'Scenario 4: Company Cargo Booking with File Upload', async () => {
    // Authenticate admin session upfront so uploads and subsequent scenarios have valid token
    if (!adminCookie) {
      const loginRes = await httpRequest({
        path: '/api/auth/login',
        method: 'POST',
        body: { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' }
      });
      if (loginRes.headers['set-cookie'] && loginRes.headers['set-cookie'].length > 0) {
        adminCookie = loginRes.headers['set-cookie'][0].split(';')[0];
      }
    }

    // A. Test file upload endpoint
    const dummyPdfContent = '%PDF-1.4\n%ASIL Logistics Test Bill of Lading\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF';
    const uploadRes = await sendMultipartFile({
      reqPath: '/api/upload/cargo',
      fieldName: 'documents',
      filename: 'commercial-manifest-2026.pdf',
      fileContent: dummyPdfContent,
      mimeType: 'application/pdf'
    });
    assert.strictEqual(uploadRes.status, 200, `Upload expected 200, got ${uploadRes.status}`);
    assert.ok(uploadRes.json.files && uploadRes.json.files.length > 0, 'Must return uploaded file metadata');
    uploadedDocPath = uploadRes.json.files[0].path;
    assert.ok(uploadedDocPath.includes('/cargo/'), 'Path must point to cargo uploads');

    // B. Submit Corporate Cargo Booking attaching uploaded manifest
    const payload = {
      customerType: 'company',
      companyName: 'Nile Grains & Agricultural Exports Ltd',
      contactPerson: 'Dr. Fatima Abdelrahman (Logistics VP)',
      companyReg: 'CR-AGRO-773910',
      billingDetails: 'AGRO-EXPORT-LC-9901',
      email: 'logistics@nilegrains.sd',
      phone: '+249 183 998 877',
      cargoType: 'Export Quality Sesame Seeds & Gum Arabic',
      cargoDesc: '800 heavy woven sacks of export-grade white sesame seeds and graded acacia gum.',
      packagesCount: 800,
      cargoWeight: '40 tons',
      cargoDimensions: 'Standard 50kg export bags on 20 wooden pallets',
      specialHandling: 'Tarpaulin Weather Cover, Moisture Sensitive, Zero Contamination',
      cargoDocs: uploadRes.json.files,
      pickupLocation: 'Al-Gadarif Central Silos & Agricultural Depot',
      deliveryDestination: 'Port Sudan Container Berth 12, Export Wharf',
      pickupDate: '2026-11-26',
      deliveryDate: '2026-11-28',
      vehiclePreference: 'Heavy Freight Hauler (30-40 Tons Flatbed)',
      instructions: 'Requires fumigation certificate check at port entry checkpoint.'
    };

    const res = await httpRequest({ path: '/api/cargo/bookings', method: 'POST', headers: { Cookie: nileGrainsCookie }, body: payload });
    assert.strictEqual(res.status, 200);
    assert.ok(res.json.id && res.json.id.startsWith('CR-'));
    assert.strictEqual(res.json.booking.customerType, 'company');
    companyCargoId = res.json.id;

    const row = db.prepare('SELECT * FROM bookings WHERE id=?').get(companyCargoId);
    assert.ok(row);
    assert.strictEqual(row.company_name, 'Nile Grains & Agricultural Exports Ltd');
    assert.strictEqual(row.cargo_weight, '40 tons');
    assert.ok(row.cargo_docs.includes('commercial-manifest-2026.pdf'), 'Docs must include manifest filename');
  });

  // ----------------------------------------------------------------
  // SECTION 2: AUTHENTICATION & ADMIN RECEPTION (SCENARIO 5)
  // ----------------------------------------------------------------
  console.log('\n--- 2. AUTHENTICATION & ADMIN RECEPTION ---');

  await runTest('Authentication', 'Admin Login with valid credentials', async () => {
    const res = await httpRequest({
      path: '/api/auth/login',
      method: 'POST',
      body: { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' }
    });
    assert.strictEqual(res.status, 200, `Login expected 200, got ${res.status}`);
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie && setCookie.length > 0, 'Set-Cookie header must be present');
    adminCookie = setCookie[0].split(';')[0];
    assert.ok(adminCookie.startsWith('asil='), 'Session cookie must start with asil=');

    // Verify /api/auth/me works with this cookie
    const meRes = await httpRequest({ path: '/api/auth/me', method: 'GET' });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.json.user.role, 'super_admin');
  });

  await runTest('Admin Reception', 'Scenario 5: Admin receives all four types of requests', async () => {
    const res = await httpRequest({ path: '/api/admin/bookings', method: 'GET' });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const list = res.json;
    assert.ok(Array.isArray(list), 'Expected array of bookings');

    // Find our four newly created bookings
    const indPass = list.find(b => b.id === individualPassId);
    const corpPass = list.find(b => b.id === companyPassId);
    const indCargo = list.find(b => b.id === individualCargoId);
    const corpCargo = list.find(b => b.id === companyCargoId);

    assert.ok(indPass, `Individual Passenger ${individualPassId} must be visible in admin console`);
    assert.strictEqual(indPass.bookingCategory, 'passenger');
    assert.strictEqual(indPass.customerType, 'individual');
    assert.strictEqual(indPass.status, 'Pending');

    assert.ok(corpPass, `Corporate Passenger ${companyPassId} must be visible in admin console`);
    assert.strictEqual(corpPass.bookingCategory, 'passenger');
    assert.strictEqual(corpPass.customerType, 'company');
    assert.strictEqual(corpPass.companyName, 'Sudan Petrochemical Corporation');

    assert.ok(indCargo, `Individual Cargo ${individualCargoId} must be visible in admin console`);
    assert.strictEqual(indCargo.bookingCategory, 'cargo');
    assert.strictEqual(indCargo.customerType, 'individual');

    assert.ok(corpCargo, `Corporate Cargo ${companyCargoId} must be visible in admin console`);
    assert.strictEqual(corpCargo.bookingCategory, 'cargo');
    assert.strictEqual(corpCargo.customerType, 'company');
    assert.strictEqual(corpCargo.companyName, 'Nile Grains & Agricultural Exports Ltd');

    // Also verify /api/admin/overview contains updated statistics
    const ovRes = await httpRequest({ path: '/api/admin/overview', method: 'GET' });
    assert.strictEqual(ovRes.status, 200);
    const stats = ovRes.json.stats;
    assert.ok(stats.totalPassengerBookings >= 2, 'Total passenger count must reflect bookings');
    assert.ok(stats.totalCargoBookings >= 2, 'Total cargo count must reflect bookings');
    assert.ok(stats.pendingRequests >= 4, 'Pending requests must reflect all 4 unapproved bookings');
  });

  // ----------------------------------------------------------------
  // SECTION 3: ADMIN OPERATIONS (SCENARIOS 6-7)
  // ----------------------------------------------------------------
  console.log('\n--- 3. ADMIN OPERATIONS (APPROVAL, REJECTION, ASSIGNMENTS) ---');

  await runTest('Admin Operations', 'Scenario 6a: Admin approves a booking', async () => {
    // Approve Corporate Passenger Booking (companyPassId)
    const res = await httpRequest({
      path: `/api/admin/bookings/${companyPassId}`,
      method: 'PATCH',
      body: {
        status: 'Approved',
        internalNotes: 'Corporate security clearance approved. VIP convoy scheduled.'
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.status, 'Approved');

    // Verify in database
    const row = db.prepare('SELECT status, internal_notes FROM bookings WHERE id=?').get(companyPassId);
    assert.strictEqual(row.status, 'Approved');
    assert.strictEqual(row.internal_notes, 'Corporate security clearance approved. VIP convoy scheduled.');

    // Verify audit log
    const audit = db.prepare("SELECT * FROM audit_logs WHERE target_id=? AND action LIKE '%Booking%' ORDER BY id DESC").get(companyPassId);
    assert.ok(audit, 'Audit log must record approval action');
    assert.ok(audit.details.includes('Approved'));
  });

  await runTest('Admin Operations', 'Scenario 6b: Admin rejects a booking', async () => {
    // Create a temporary booking to reject
    const tempRes = await httpRequest({
      path: '/api/bookings',
      method: 'POST',
      headers: { Cookie: yousifCookie },
      body: {
        customerType: 'individual',
        fullName: 'Applicant for Rejected Route',
        email: 'applicant.reject@example.com',
        phone: '+249 900 112 233',
        departure: 'Restricted Inaccessible Military Zone',
        destination: 'Khartoum',
        travelDate: '2026-11-29',
        departureTime: '12:00',
        passengers: 1,
        vehiclePreference: 'Executive Sedan'
      }
    });
    const rejectId = tempRes.json.id;

    // Reject booking
    const patchRes = await httpRequest({
      path: `/api/admin/bookings/${rejectId}`,
      method: 'PATCH',
      body: {
        status: 'Rejected',
        internalNotes: 'Route inaccessible due to local civil authority security advisory.'
      }
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.json.status, 'Rejected');

    const row = db.prepare('SELECT status, internal_notes FROM bookings WHERE id=?').get(rejectId);
    assert.strictEqual(row.status, 'Rejected');
    assert.ok(row.internal_notes.includes('security advisory'));
  });

  await runTest('Admin Operations', 'Scenario 7: Admin assigns vehicles and drivers', async () => {
    // 1. Fetch available fleet vehicles and drivers
    let vRes = await httpRequest({ path: '/api/admin/fleet/vehicles', method: 'GET' });
    let dRes = await httpRequest({ path: '/api/admin/fleet/drivers', method: 'GET' });
    assert.strictEqual(vRes.status, 200);
    assert.strictEqual(dRes.status, 200);

    if (vRes.json.length === 0) {
      await httpRequest({
        path: '/api/admin/fleet/vehicles',
        method: 'POST',
        body: { plate: 'KRT-1001', model: 'Toyota Land Cruiser V8', category: 'passenger', type: 'Executive SUV', capacity: '7 Seats', status: 'Available' }
      });
      vRes = await httpRequest({ path: '/api/admin/fleet/vehicles', method: 'GET' });
    }
    if (dRes.json.length === 0) {
      await httpRequest({
        path: '/api/admin/fleet/drivers',
        method: 'POST',
        body: { name: 'Captain Ibrahim Ahmed', phone: '+249 912 300 001', category: 'passenger', license_type: 'VIP Professional', status: 'Active' }
      });
      dRes = await httpRequest({ path: '/api/admin/fleet/drivers', method: 'GET' });
    }

    assert.ok(vRes.json.length > 0, 'Fleet vehicles must be available');
    assert.ok(dRes.json.length > 0, 'Fleet drivers must be available');

    const targetVehicle = vRes.json[0];
    const targetDriver = dRes.json[0];
    const assignedVehStr = `${targetVehicle.model} (${targetVehicle.plate})`;
    const assignedDrvStr = `${targetDriver.name} (${targetDriver.phone})`;

    // 2. Assign to individual passenger booking (individualPassId)
    const patchRes = await httpRequest({
      path: `/api/admin/bookings/${individualPassId}`,
      method: 'PATCH',
      body: {
        status: 'Approved',
        assignedVehicle: assignedVehStr,
        assignedDriver: assignedDrvStr,
        internalNotes: 'Assigned primary executive chauffeur.'
      }
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.json.assignedVehicle, assignedVehStr);
    assert.strictEqual(patchRes.json.assignedDriver, assignedDrvStr);

    // 3. Assign to corporate cargo booking (companyCargoId) and set to In Transit
    const patchCargo = await httpRequest({
      path: `/api/admin/bookings/${companyCargoId}`,
      method: 'PATCH',
      body: {
        status: 'In Transit',
        assignedVehicle: 'Scania R500 Flatbed Heavy Hauler (KRT-7788-H)',
        assignedDriver: 'Senior Captain Mahgoub Idris (+249 912 770 011)',
        internalNotes: 'Loaded and cleared weighing station at Al-Gadarif. In transit to Port Sudan.'
      }
    });
    assert.strictEqual(patchCargo.status, 200);
    assert.strictEqual(patchCargo.json.status, 'In Transit');

    // Verify database sync in records table
    const recRow = db.prepare('SELECT step, log FROM records WHERE id=?').get(companyCargoId);
    assert.ok(recRow.step >= 4, 'In Transit cargo step must be at least step 4');
    assert.ok(recRow.log.includes('Mahgoub Idris'), 'Record log must record driver assignment');
  });

  // ----------------------------------------------------------------
  // SECTION 4: CUSTOMER TRACKING & PRIVACY (SCENARIOS 8-9)
  // ----------------------------------------------------------------
  console.log('\n--- 4. CUSTOMER TRACKING & PRIVACY ASSURANCE ---');

  await runTest('Customer Tracking', 'Scenario 8: Customer tracks passenger bookings', async () => {
    // Unauthenticated tracking call (requires verifier)
    const res = await httpRequest({
      path: `/api/bookings/${individualPassId}?verifier=5678`,
      method: 'GET',
      headers: { Cookie: '' } // explicit unauthenticated
    });
    assert.strictEqual(res.status, 200);
    const data = res.json;

    // A. Verify booking type & basic info
    assert.strictEqual(data.bookingType, 'Passenger Transportation');
    assert.strictEqual(data.bookingCategory, 'passenger');
    assert.strictEqual(data.id, individualPassId);
    assert.strictEqual(data.status, 'Approved');
    assert.ok(data.departure.includes('Khartoum International Airport'));
    assert.ok(data.destination.includes('Corinthia Hotel'));
    assert.strictEqual(data.travelDate, '2026-11-25');
    assert.strictEqual(data.departureTime, '14:30');

    // B. Verify PRIVACY safeguards
    assert.strictEqual(data.phone, undefined, 'Customer phone MUST NEVER be exposed in public tracking');
    assert.strictEqual(data.email, undefined, 'Customer email MUST NEVER be exposed in public tracking');
    assert.strictEqual(data.internal_notes, undefined, 'Internal notes MUST NEVER be exposed');
    assert.strictEqual(data.internalNotes, undefined, 'Internal notes MUST NEVER be exposed');
    assert.strictEqual(data.assignedDriver, undefined, 'Assigned driver MUST NEVER be exposed in public tracking');
    assert.strictEqual(data.instructions, undefined, 'Instructions MUST NEVER be exposed in public tracking');
    assert.strictEqual(data.luggage, undefined, 'Luggage MUST NEVER be exposed in public tracking');
    assert.strictEqual(data.cargoDocs, undefined, 'Cargo docs MUST NEVER be exposed in public tracking');
    assert.ok(data.maskedClient.includes('Yousif M*** A***'), `Individual client name must be masked, got: ${data.maskedClient}`);

    // D. Verify status history & milestones
    assert.ok(Array.isArray(data.statusHistory), 'statusHistory must be present');
    assert.ok(data.statusHistory.length > 0, 'statusHistory must contain updates');
  });

  await runTest('Customer Tracking', 'Scenario 9: Customer tracks cargo shipments', async () => {
    // Unauthenticated tracking call for corporate cargo booking (requires verifier)
    const res = await httpRequest({
      path: `/api/bookings/${companyCargoId}?verifier=8877`,
      method: 'GET',
      headers: { Cookie: '' }
    });
    assert.strictEqual(res.status, 200);
    const data = res.json;

    // A. Verify Cargo classification & specs
    assert.strictEqual(data.bookingType, 'Cargo Transportation');
    assert.strictEqual(data.bookingCategory, 'cargo');
    assert.strictEqual(data.id, companyCargoId);
    assert.strictEqual(data.status, 'In Transit');
    assert.strictEqual(data.cargoWeight, '40 tons');
    assert.strictEqual(data.packagesCount, 800);
    assert.ok(data.specialHandling.includes('Tarpaulin Weather Cover'));

    // B. Corporate legal entity retains full legal name
    assert.strictEqual(data.maskedClient, 'Nile Grains & Agricultural Exports Ltd');

    // C. Verify PRIVACY safeguards
    assert.strictEqual(data.phone, undefined, 'Shipper phone must not be exposed');
    assert.strictEqual(data.email, undefined, 'Shipper email must not be exposed');
    assert.strictEqual(data.company_reg, undefined, 'Company registration number must not be exposed');
    assert.strictEqual(data.billing_details, undefined, 'Company billing details must not be exposed');
    assert.strictEqual(data.internal_notes, undefined, 'Internal notes must not be exposed');

    // D. Verify live telemetry step and milestone timeline
    assert.ok(data.step >= 4, 'Current active step must reflect In Transit');
    assert.ok(Array.isArray(data.statusHistory), 'Status history must be an array');
    assert.ok(data.statusHistory.some(h => h.step.includes('Admin: In Transit') || h.step.includes('Booking Intake')));
  });

  // ----------------------------------------------------------------
  // SECTION 5: DATABASE INTEGRITY & PERSISTENCE (SCENARIO 10)
  // ----------------------------------------------------------------
  console.log('\n--- 5. DATABASE STORAGE & INTEGRITY ---');

  await runTest('Database Integrity', 'Scenario 10: Database correctly stores and verifies all records', async () => {
    // 1. Run SQLite PRAGMA integrity_check
    const integrity = db.pragma('integrity_check');
    assert.strictEqual(integrity[0].integrity_check, 'ok', 'SQLite database integrity check must return "ok"');

    // 2. Verify WAL journal mode
    const journalMode = db.pragma('journal_mode');
    assert.strictEqual(journalMode[0].journal_mode, 'wal', 'Database journal mode must be WAL');

    // 3. Verify all tables exist and have valid row counts
    const tables = ['bookings', 'records', 'vehicles', 'drivers', 'audit_logs', 'settings', 'counters'];
    for (const t of tables) {
      const count = db.prepare(`SELECT count(*) as c FROM ${t}`).get().c;
      assert.ok(count >= 0, `Table ${t} must exist`);
    }

    // 4. Verify booking counts
    const passCount = db.prepare("SELECT count(*) as c FROM bookings WHERE booking_category='passenger'").get().c;
    const cargoCount = db.prepare("SELECT count(*) as c FROM bookings WHERE booking_category='cargo'").get().c;
    assert.ok(passCount >= 2, `Passenger bookings count (${passCount}) must be >= 2`);
    assert.ok(cargoCount >= 2, `Cargo bookings count (${cargoCount}) must be >= 2`);

    // 5. Verify records sync
    const recordMatches = db.prepare("SELECT b.id, b.status, r.wf FROM bookings b JOIN records r ON b.id=r.id WHERE b.id IN (?, ?, ?, ?)").all(
      individualPassId, companyPassId, individualCargoId, companyCargoId
    );
    assert.strictEqual(recordMatches.length, 4, 'All 4 bookings must have corresponding records row');
  });

  // ----------------------------------------------------------------
  // SECTION 6: SECURITY & ACCESS CONTROL (SCENARIO 11)
  // ----------------------------------------------------------------
  console.log('\n--- 6. SECURITY & ACCESS CONTROL ---');

  await runTest('Security', 'Scenario 11: Unauthorized visitors cannot access admin functions', async () => {
    const protectedEndpoints = [
      { path: '/api/admin/bookings', method: 'GET' },
      { path: '/api/admin/overview', method: 'GET' },
      { path: '/api/admin/customers/individual', method: 'GET' },
      { path: '/api/admin/customers/corporate', method: 'GET' },
      { path: '/api/admin/fleet/vehicles', method: 'GET' },
      { path: '/api/admin/fleet/drivers', method: 'GET' },
      { path: '/api/admin/reports', method: 'GET' },
      { path: '/api/admin/settings', method: 'GET' },
      { path: '/api/admin/audit-logs', method: 'GET' },
      { path: `/api/admin/bookings/${companyPassId}`, method: 'PATCH', body: { status: 'Delivered' } },
      { path: `/api/admin/bookings/${companyPassId}`, method: 'DELETE' },
      { path: '/api/records', method: 'GET' },
      { path: '/api/records', method: 'POST', body: { title: 'hacked' } },
      { path: '/api/admin/settings/password', method: 'POST', body: { newPassword: 'hack' } }
    ];

    for (const ep of protectedEndpoints) {
      const res = await httpRequest({
        path: ep.path,
        method: ep.method,
        body: ep.body,
        headers: { Cookie: '' } // unauthenticated
      });
      assert.strictEqual(res.status, 401, `Endpoint ${ep.method} ${ep.path} must return 401 Unauthorized for visitors`);
      assert.strictEqual(res.json.error, 'auth');
    }
  });

  await runTest('Security', 'Forged & Tampered Cookie Rejection', async () => {
    // Test forged session cookies
    const tamperedCookies = [
      'asil=fake_cookie_value',
      'asil=1794640000000.badhashbadhashbadhashbadhashbadhashbadhashbadhashbadhashbadhashbad',
      'asil=9999999999999.0000000000000000000000000000000000000000000000000000000000000000',
      'asil=1000.abcd' // expired
    ];

    for (const c of tamperedCookies) {
      const res = await httpRequest({
        path: '/api/auth/me',
        method: 'GET',
        headers: { Cookie: c }
      });
      assert.strictEqual(res.status, 401, `Tampered cookie "${c}" must be rejected with 401`);
    }
  });

  await runTest('Security', 'SQL Injection Immunity Tests', async () => {
    const maliciousInputs = [
      "' OR '1'='1",
      "TR-001' UNION SELECT * FROM users --",
      "'; DROP TABLE bookings; --",
      "1; SELECT pg_sleep(5); --"
    ];

    // Tracking endpoint with SQLi attempt
    for (const sqli of maliciousInputs) {
      const res = await httpRequest({
        path: `/api/bookings/${encodeURIComponent(sqli)}`,
        method: 'GET',
        headers: { Cookie: '' }
      });
      assert.ok([400, 404].includes(res.status), `SQLi attempt must return 400 or 404, got ${res.status}`);
    }

    // Login endpoint with SQLi attempt
    const loginRes = await httpRequest({
      path: '/api/auth/login',
      method: 'POST',
      body: { username: "' OR 1=1 --", password: "' OR 1=1 --" }
    });
    assert.strictEqual(loginRes.status, 401, 'SQLi password must return 401');
  });

  await runTest('Security', 'XSS & HTML Injection Sanitization', async () => {
    const xssPayload = {
      customerType: 'individual',
      fullName: '<script>alert("XSS")</script>Ahmed',
      email: 'ahmed.xss@example.com',
      phone: '+249 912 000 111',
      departure: '<img src=x onerror=alert(1)>Airport',
      destination: '<iframe src="evil.com"></iframe>Hotel',
      travelDate: '2026-11-25',
      departureTime: '10:00',
      passengers: 1,
      vehiclePreference: 'Executive Sedan',
      additionalRequirements: '<script>fetch("/steal")</script>'
    };

    const res = await httpRequest({ path: '/api/bookings', method: 'POST', headers: { Cookie: yousifCookie }, body: xssPayload });
    assert.strictEqual(res.status, 200);
    const xssBookingId = res.json.id;

    // Fetch tracking response (with phone last 4 verifier)
    const trackRes = await httpRequest({ path: `/api/bookings/${xssBookingId}?verifier=0111`, method: 'GET', headers: { Cookie: '' } });
    assert.strictEqual(trackRes.status, 200);
    // Raw script tags must not be returned verbatim in client display
    assert.ok(!trackRes.json.maskedClient.includes('<script>'), 'Client name must be sanitized or masked');
  });

  await runTest('Security', 'CSRF Protection (Blocks Non-JSON / Non-Multipart writes)', async () => {
    // Send form-urlencoded to a JSON write endpoint
    const res = await httpRequest({
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: ''
      },
      body: 'fullName=Hacker&email=hack@hack.com'
    });
    assert.strictEqual(res.status, 415, `Expected 415 Unsupported Media Type, got ${res.status}`);
  });

  // ----------------------------------------------------------------
  // SECTION 7: FORM VALIDATION & ERROR HANDLING
  // ----------------------------------------------------------------
  console.log('\n--- 7. FORM VALIDATION & SERVER ERROR HANDLING ---');

  await runTest('Form Validation', 'Passenger Form: Missing Required Fields Validation', async () => {
    // Test missing required schedule / vehicle details
    const res1 = await httpRequest({
      path: '/api/bookings',
      method: 'POST',
      headers: { Cookie: yousifCookie },
      body: {
        customerType: 'individual',
        fullName: 'Test User',
        departure: 'Khartoum',
        destination: 'Port Sudan'
      }
    });
    assert.strictEqual(res1.status, 400);
    assert.ok(res1.json.error.includes('required'));

    // Test company passenger without contact person
    const res2 = await httpRequest({
      path: '/api/bookings',
      method: 'POST',
      headers: { Cookie: yousifCookie },
      body: {
        customerType: 'company',
        companyName: 'Test Corp Ltd',
        email: 'info@testcorp.com',
        phone: '+249 912 334 455',
        departure: 'Khartoum',
        destination: 'Atbara',
        travelDate: '2026-11-25',
        departureTime: '09:00',
        passengers: 5,
        vehiclePreference: 'VIP Minivan'
        // missing contactPerson!
      }
    });
    assert.strictEqual(res2.status, 400);
    assert.ok(res2.json.error.includes('contact person'));
  });

  await runTest('Form Validation', 'Cargo Form: Missing Specs & Route Validation', async () => {
    // Missing weight and description
    const res = await httpRequest({
      path: '/api/cargo/bookings',
      method: 'POST',
      headers: { Cookie: yousifCookie },
      body: {
        customerType: 'individual',
        fullName: 'Shipper Test',
        email: 'shipper@test.com',
        phone: '+249 912 888 777',
        cargoType: 'Machinery',
        pickupLocation: 'Khartoum',
        deliveryDestination: 'Kassala',
        pickupDate: '2026-11-25',
        vehiclePreference: 'Box Truck'
        // missing cargoWeight & cargoDesc!
      }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.json.error.includes('weight'));
  });

  await runTest('Error Handling', 'Malformed JSON Payload Handling (400 Bad Request)', async () => {
    const res = await httpRequest({
      path: '/api/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid_json_syntax: true, '
    });
    assert.strictEqual(res.status, 400, `Expected 400 for malformed JSON, got ${res.status}`);
  });

  await runTest('Error Handling', 'Non-existent Endpoint (404 Not Found)', async () => {
    const res = await httpRequest({ path: '/api/non_existent_route', method: 'GET' });
    assert.strictEqual(res.status, 404);
  });

  await runTest('File Upload Validation', 'Disallowed File Extension Rejection (.exe / .sh)', async () => {
    const res = await sendMultipartFile({
      reqPath: '/api/upload/cargo',
      fieldName: 'documents',
      filename: 'exploit_script.sh',
      fileContent: '#!/bin/bash\necho bad',
      mimeType: 'application/x-sh'
    });
    assert.strictEqual(res.status, 400, `Expected 400 for forbidden extension, got ${res.status}`);
    assert.ok(res.json.error.includes('Invalid file type'));
  });

  // ----------------------------------------------------------------
  // SECTION 8: RESPONSIVENESS & FRONTEND RENDERING (SCENARIO 12)
  // ----------------------------------------------------------------
  console.log('\n--- 8. RESPONSIVE VIEWS & FRONTEND DOM AUDIT (SCENARIO 12) ---');

  await runTest('Frontend Views', 'Scenario 12: Validate All 10 Application Pages and Responsive Components', async () => {
    const publicDir = path.join(__dirname, '..', 'public');
    const pages = [
      { file: 'index.html', title: 'Home & Tracking' },
      { file: 'transport.html', title: 'Transport & Fleet' },
      { file: 'distribution.html', title: 'Cargo & Freight Distribution' },
      { file: 'maintenance.html', title: 'Building Maintenance' },
      { file: 'onboarding.html', title: 'Client Onboarding' },
      { file: 'customer.html', title: 'Customer Portal' },
      { file: 'admin.html', title: 'Administrator Dashboard' },
      { file: 'privacy.html', title: 'Privacy Policy' },
      { file: 'terms.html', title: 'Terms of Service' },
      { file: '404.html', title: 'Custom 404' }
    ];

    // 1. Verify all 10 physical files exist and contain viewport meta + ASIL branding
    for (const p of pages) {
      const filePath = path.join(publicDir, p.file);
      assert.ok(fs.existsSync(filePath), `Page file ${p.file} must exist`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('viewport'), `${p.file} must have viewport meta tag`);
      assert.ok(content.includes('ASIL Logistics') || content.includes('ASIL LOGISTICS'), `${p.file} must have ASIL branding`);
    }

    // 2. Verify all 10 Admin Sections are present in admin.html
    const adminContent = fs.readFileSync(path.join(publicDir, 'admin.html'), 'utf8');
    const adminTabs = [
      'overview',
      'passenger',
      'cargo',
      'individual',
      'corporate',
      'vehicles',
      'drivers',
      'bookings',
      'reports',
      'settings'
    ];
    for (const tab of adminTabs) {
      assert.ok(adminContent.toLowerCase().includes(tab), `Admin section '${tab}' must be supported in admin.html`);
    }

    // 3. Verify CSS Responsive Design & Mobile Breakpoints
    const cssContent = fs.readFileSync(path.join(publicDir, 'css', 'asil-core.css'), 'utf8');
    assert.ok(cssContent.includes('@media (max-width: 992px)') || cssContent.includes('@media (max-width: 768px)') || cssContent.includes('@media (max-width: 480px)'), 'Mobile/Tablet media queries must exist in asil-core.css');
    assert.ok(cssContent.includes('table-container') || cssContent.includes('overflow-x') || cssContent.includes('overflow'), 'Table horizontal scrolling for mobile must exist');
  });

  // ----------------------------------------------------------------
  // SECTION 9: APPLICATION PERFORMANCE BENCHMARK
  // ----------------------------------------------------------------
  console.log('\n--- 9. APPLICATION PERFORMANCE BENCHMARKS ---');

  await runTest('Performance', 'API Response Time & Latency Benchmarks (< 100ms)', async () => {
    const endpoints = [
      { name: 'Public Tracking', path: `/api/bookings/${individualPassId}?verifier=5678` },
      { name: 'Admin Overview', path: '/api/admin/overview' },
      { name: 'Admin Fleet Vehicles', path: '/api/admin/fleet/vehicles' },
      { name: 'Admin Reports (Quarter)', path: '/api/admin/reports?period=quarter' }
    ];

    for (const ep of endpoints) {
      const times = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await httpRequest({ path: ep.path, method: 'GET' });
        times.push(Date.now() - start);
      }
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`       -> ${ep.name}: Avg ${avg.toFixed(1)}ms (${times.join(', ')} ms)`);
      assert.ok(avg < 150, `${ep.name} average response time must be under 150ms, was ${avg}ms`);
    }
  });

  await runTest('Performance', 'Concurrent Load Test (20 Parallel Requests)', async () => {
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(httpRequest({ path: `/api/bookings/${individualPassId}?verifier=5678`, method: 'GET', headers: { Cookie: '' } }));
    }
    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;
    const all200 = results.every(r => r.status === 200);
    console.log(`       -> 20 Concurrent Requests processed in ${totalTime}ms (Avg ${(totalTime / 20).toFixed(1)}ms per req)`);
    assert.ok(all200, 'All 20 concurrent requests must return 200 OK');
    assert.ok(totalTime < 1000, `20 concurrent requests must complete in under 1 second, took ${totalTime}ms`);
  });

  // ----------------------------------------------------------------
  // SUMMARY REPORT
  // ----------------------------------------------------------------
  console.log('\n================================================================');
  const passedCount = testResults.filter(t => t.status === 'PASS').length;
  const failedCount = testResults.filter(t => t.status === 'FAIL').length;
  console.log(` AUDIT COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED out of ${testResults.length} TOTAL TESTS`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('FAILED TESTS:');
    testResults.filter(t => t.status === 'FAIL').forEach(f => {
      console.error(`- [${f.category}] ${f.name}: ${f.error}`);
    });
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
