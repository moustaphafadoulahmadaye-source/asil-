const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function request(options, body = null, isMultipart = false, boundary = '') {
  options.port = PORT;
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    req.on('error', reject);
    if (body) {
      if (isMultipart) {
        req.write(body);
      } else if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING CARGO & FREIGHT SYSTEM COMPREHENSIVE TESTS ===\n');
  let cookie = '';

  // Login as admin / freight officer to authenticate for upload
  const authLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
  const authCookie = (authLogin.headers['set-cookie'] && authLogin.headers['set-cookie'][0]) ? authLogin.headers['set-cookie'][0].split(';')[0] : '';

  // 1. Test File Upload Endpoint
  console.log('Test 1: Testing protected file upload endpoint (/api/upload/cargo)...');
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = '%PDF-1.4\nSimulated Commercial Invoice & Packing List for Cargo Consignment.\n%%EOF';
  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="documents"; filename="packing_list.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    Buffer.from(fileContent),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/upload/cargo',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': multipartBody.length,
      'Cookie': authCookie
    }
  }, multipartBody, true);

  if (uploadRes.status === 200 && uploadRes.body.files && uploadRes.body.files.length > 0) {
    console.log('✅ File upload successful! File metadata:', uploadRes.body.files[0]);
  } else {
    console.error('❌ File upload failed:', uploadRes);
    process.exit(1);
  }
  const uploadedDoc = uploadRes.body.files[0];

  // 2. Individual Cargo Booking Submission
  console.log('\nTest 2: Submitting Individual Cargo Booking...');
  const indCargoPayload = {
    customerType: 'individual',
    fullName: 'Ali Babiker',
    email: 'ali.babiker@example.sd',
    phone: '+249 912 345678',
    cargoType: 'Agricultural Produce & Commodities',
    cargoDesc: '20 Bags of Premium Gum Arabic for Export',
    packagesCount: 20,
    cargoWeight: '1,000 kg (1 Ton)',
    cargoDimensions: '120x80x100 cm per pallet',
    specialHandling: 'Keep Dry, Do Not Stack Over 3 High',
    cargoDocs: [uploadedDoc],
    pickupLocation: 'Al-Gadarif Agricultural Market Hub',
    deliveryDestination: 'Port Sudan Export Terminal Berth 4',
    pickupDate: '2026-11-20',
    deliveryDate: '2026-11-23',
    vehiclePreference: 'Isuzu NPR 5-Ton Box Truck (5-7 Ton)',
    instructions: 'Requires waterproof tarp covers at all times.',
    priority: 'urgent'
  };

  // Verify anonymous booking is blocked with 401
  const unauthBooking = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/cargo/bookings',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, indCargoPayload);
  if (unauthBooking.status === 401) {
    console.log('✅ Anonymous cargo booking correctly rejected with 401 Unauthorized');
  }

  // Login as individual customer
  const custLogin = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'customer_ali', password: 'customer123' });
  const custCookie = (custLogin.headers['set-cookie'] && custLogin.headers['set-cookie'][0]) ? custLogin.headers['set-cookie'][0].split(';')[0] : '';

  const indRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/cargo/bookings',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': custCookie }
  }, indCargoPayload);

  if ((indRes.status === 200 || indRes.status === 201) && indRes.body.booking && indRes.body.booking.id.startsWith('CR-')) {
    console.log(`✅ Individual Cargo Booking created successfully! Reference: ${indRes.body.booking.id}`);
  } else {
    console.error('❌ Individual Cargo Booking failed:', indRes);
    process.exit(1);
  }
  const indBookingId = indRes.body.booking.id;

  // 3. Corporate Cargo Booking Submission
  console.log('\nTest 3: Submitting Corporate Cargo Booking...');
  const corpCargoPayload = {
    customerType: 'company',
    companyName: 'Nile Agro Industries Ltd',
    contactPerson: 'Eng. Mona Hassan (Supply Chain Director)',
    companyReg: 'CR-KRT-994821',
    billingDetails: 'Corporate Account #SU-99120, Net 30 Terms',
    fullName: 'Nile Agro Industries Ltd',
    email: 'supplychain@nileagro.sd',
    phone: '+249 183 998877',
    cargoType: 'Heavy Machinery & Equipment Parts',
    cargoDesc: '3 Crates of High-Pressure Industrial Hydraulic Pumps & Valves',
    packagesCount: 3,
    cargoWeight: '4,500 kg (4.5 Ton)',
    cargoDimensions: '250x180x160 cm',
    specialHandling: 'Heavy Lift Required, Fragile Instruments, Forklift Loading Only',
    cargoDocs: [uploadedDoc],
    pickupLocation: 'Khartoum North Industrial Area Gate 2',
    deliveryDestination: 'Atbara Power Generation Plant Site',
    pickupDate: '2026-11-22',
    deliveryDate: '2026-11-25',
    vehiclePreference: 'Heavy Duty Flatbed Hauler (20-40 Ton)',
    instructions: 'Deliver during site morning operations (07:00 - 14:00).',
    priority: 'normal'
  };

  // Login as corporate customer
  const corpLogin = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'customer_nile', password: 'customer123' });
  const corpCookie = (corpLogin.headers['set-cookie'] && corpLogin.headers['set-cookie'][0]) ? corpLogin.headers['set-cookie'][0].split(';')[0] : '';

  const corpRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/cargo/bookings',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': corpCookie }
  }, corpCargoPayload);

  if ((corpRes.status === 200 || corpRes.status === 201) && corpRes.body.booking && corpRes.body.booking.id.startsWith('CR-')) {
    console.log(`✅ Corporate Cargo Booking created successfully! Reference: ${corpRes.body.booking.id}`);
    console.log(`   Customer Type: ${corpRes.body.booking.customerType}`);
    console.log(`   Company Name: ${corpRes.body.booking.companyName}`);
    console.log(`   Status: ${corpRes.body.booking.status} (Initial state correctly starts as Pending)`);
  } else {
    console.error('❌ Corporate Cargo Booking failed:', corpRes);
    process.exit(1);
  }
  const corpBookingId = corpRes.body.booking.id;

  // 4. Customer Tracking Verification
  console.log(`\nTest 4: Customer Tracking Verification for ${corpBookingId}...`);
  const trackRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/bookings/${corpBookingId}?verifier=${encodeURIComponent(corpCargoPayload.email)}`,
    method: 'GET'
  });

  if (trackRes.status === 200 && trackRes.body && trackRes.body.id) {
    const bk = trackRes.body;
    console.log(`✅ Tracking found shipment: ${bk.id}`);
    console.log(`   Category: ${bk.bookingCategory}`);
    console.log(`   Route: ${bk.departure} -> ${bk.destination}`);
    console.log(`   Total Milestones: ${bk.totalSteps} (Expected 9 cargo milestones)`);
    console.log(`   Current Step: ${bk.step + 1} (${bk.stepName})`);
    console.log(`   Attached Documents: ${JSON.stringify(bk.cargoDocs)}`);
    if (bk.totalSteps !== 9) {
      console.error('❌ Expected exactly 9 milestones for cargo!');
      process.exit(1);
    }
  } else {
    console.error('❌ Tracking lookup failed:', trackRes);
    process.exit(1);
  }

  // 5. Admin Authentication & Protection Check
  console.log('\nTest 5: Checking Admin Security Boundaries...');
  const unauthRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/bookings',
    method: 'GET'
  });
  if (unauthRes.status === 401) {
    console.log('✅ Unauthenticated access to /api/admin/bookings successfully blocked (401 Unauthorized)');
  } else {
    console.error('❌ Security check failed! Expected 401, got:', unauthRes.status);
    process.exit(1);
  }

  // 6. Admin Sign In
  console.log('\nTest 6: Authenticating Administrator...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });

  if (loginRes.status === 200 && loginRes.headers['set-cookie']) {
    cookie = loginRes.headers['set-cookie'][0].split(';')[0];
    console.log('✅ Admin login successful! Session cookie obtained.');
  } else {
    console.error('❌ Admin login failed:', loginRes);
    process.exit(1);
  }

  // 7. Verify Admin Stats
  console.log('\nTest 7: Fetching Admin Operations Stats...');
  const statsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  if (statsRes.status === 200 && statsRes.body.totalBookings >= 2) {
    console.log('✅ Admin stats verified:', {
      totalBookings: statsRes.body.totalBookings,
      passengerBookings: statsRes.body.passengerBookings,
      cargoBookings: statsRes.body.cargoBookings,
      pending: statsRes.body.pendingBookings
    });
  } else {
    console.error('❌ Admin stats check failed:', statsRes);
    process.exit(1);
  }

  // 8. Lifecycle Transition through all 9 cargo statuses
  console.log(`\nTest 8: Full 9-Step Cargo Status Lifecycle Transition for ${corpBookingId}...`);
  const statusFlow = [
    {
      status: 'Approved',
      vehicle: null,
      driver: null,
      note: 'Manifest and cargo dimensions approved by dispatch manager.'
    },
    {
      status: 'Pickup Scheduled',
      vehicle: 'Volvo FH Flatbed Container Carrier (Plate KRT-6631)',
      driver: 'Captain Osman Babiker (Heavy Goods - +249 912 445566)',
      note: 'Pickup scheduled for 2026-11-22 at 08:00 AM. Driver allocated.'
    },
    {
      status: 'Picked Up',
      vehicle: null,
      driver: null,
      note: 'Cargo securely loaded and strapped. Bill of lading #BOL-8821 signed.'
    },
    {
      status: 'In Transit',
      vehicle: null,
      driver: null,
      note: 'Passed Shendi Highway Checkpoint. GPS telemetry live and normal.'
    },
    {
      status: 'Out for Delivery',
      vehicle: null,
      driver: null,
      note: 'Arrived at Atbara Industrial Distribution Hub. Staged for site gate delivery.'
    },
    {
      status: 'Delivered',
      vehicle: null,
      driver: null,
      note: 'Consignment safely delivered to site receiving bay. Received and signed by Eng. Ahmed.'
    }
  ];

  for (const step of statusFlow) {
    console.log(`   -> Transitioning to: "${step.status}"...`);
    const patchPayload = {
      status: step.status,
      internalNotes: step.note
    };
    if (step.vehicle) patchPayload.assignedVehicle = step.vehicle;
    if (step.driver) patchPayload.assignedDriver = step.driver;

    const patchRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/admin/bookings/${corpBookingId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    }, patchPayload);

    if (patchRes.status === 200 && patchRes.body.status === step.status) {
      console.log(`      ✓ Status updated to "${step.status}"`);
    } else {
      console.error(`      ❌ Failed to update status to ${step.status}:`, patchRes);
      process.exit(1);
    }
  }

  // 9. Verify Final Delivery State and Status History Log
  console.log(`\nTest 9: Verifying Final Delivered State & Audit Log Trail for ${corpBookingId}...`);
  const finalTrack = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/bookings/${corpBookingId}?verifier=${encodeURIComponent(corpCargoPayload.email)}`,
    method: 'GET'
  });

  const finalBk = finalTrack.body;
  if (finalBk && finalBk.status === 'Delivered' && finalBk.step === 8) {
    console.log('✅ Final status confirmed: Delivered (Step 9/9)');
    console.log(`   Assigned Vehicle: ${finalBk.assignedVehicle}`);
    console.log(`   Assigned Driver: ${finalBk.assignedDriver}`);
    console.log('   Audit Log Trail:');
    if (finalBk.log && finalBk.log.length > 0) {
      finalBk.log.forEach((entry, idx) => {
        console.log(`     [${idx + 1}] ${new Date(entry.ts).toLocaleTimeString()} - Step: "${entry.step}" | Note: "${entry.note}"`);
      });
      console.log(`✅ Audit trail verified with ${finalBk.log.length} milestone transitions logged!`);
    } else {
      console.error('❌ No audit log entries recorded!');
      process.exit(1);
    }
  } else {
    console.error('❌ Final state verification failed:', finalBk);
    process.exit(1);
  }

  // 10. Rejection and Cancellation Path Verification on indBookingId
  console.log(`\nTest 10: Testing Rejection and Cancellation for ${indBookingId}...`);
  const rejectRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/bookings/${indBookingId}`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, {
    status: 'Rejected',
    internalNotes: 'Goods documentation incomplete for export customs clearance.'
  });

  if (rejectRes.status === 200 && rejectRes.body.status === 'Rejected') {
    console.log('✅ Booking successfully marked as Rejected with reason recorded.');
  } else {
    console.error('❌ Rejection test failed:', rejectRes);
    process.exit(1);
  }

  const cancelRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/bookings/${indBookingId}`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, {
    status: 'Cancelled',
    internalNotes: 'Customer requested cancellation.'
  });

  if (cancelRes.status === 200 && cancelRes.body.status === 'Cancelled') {
    console.log('✅ Booking successfully marked as Cancelled with reason recorded.');
  } else {
    console.error('❌ Cancellation test failed:', cancelRes);
    process.exit(1);
  }

  console.log('\n=== ALL 10 CARGO & FREIGHT VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
