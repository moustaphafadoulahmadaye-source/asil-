const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== VERIFYING FRONTEND VIEWS & CLIENT LOGIC SIMULATION ===\n');

const publicDir = path.join(__dirname, '..', 'public');

// 1. Verify all Departmental and Public HTML Files exist and are non-empty
const viewFiles = [
  'index.html',
  'transport.html',
  'distribution.html',
  'sea.html',
  'air.html',
  'subscription.html',
  'maintenance.html',
  'onboarding.html',
  'customer.html',
  'admin.html',
  'privacy.html',
  'terms.html',
  '404.html'
];

for (const vf of viewFiles) {
  const fp = path.join(publicDir, vf);
  assert.ok(fs.existsSync(fp), `View template ${vf} must exist on disk`);
  const content = fs.readFileSync(fp, 'utf8');
  assert.ok(content.length > 500, `View template ${vf} must have content (was ${content.length} bytes)`);
  console.log(`[PASS] View file "${vf}" verified (${content.length} bytes)`);
}

// 2. Verify shared client modules
console.log('\n--- Checking Shared Client Modules ---');
const commonJsPath = path.join(publicDir, 'js', 'asil-common.js');
const authJsPath = path.join(publicDir, 'js', 'auth.js');
assert.ok(fs.existsSync(commonJsPath), 'asil-common.js must exist');
assert.ok(fs.existsSync(authJsPath), 'auth.js must exist');

// Test asil-common.js in VM sandbox
const commonJs = fs.readFileSync(commonJsPath, 'utf8');
const commonSandbox = {
  window: {},
  document: { addEventListener: () => { }, querySelectorAll: () => [], getElementById: () => null }
};
vm.createContext(commonSandbox);
vm.runInContext(commonJs, commonSandbox);
const comp = commonSandbox.COMPANY || commonSandbox.window.COMPANY;
assert.ok(comp, 'COMPANY config object must exist in asil-common.js');
assert.ok(typeof comp.phone === 'string', 'COMPANY.phone must be defined');
assert.ok(typeof comp.email === 'string', 'COMPANY.email must be defined');
assert.ok(typeof comp.address === 'string', 'COMPANY.address must be defined');
console.log('[PASS] Shared configuration module asil-common.js verified in VM');

// 3. Test Admin Dashboard tab navigation & views in admin.html
console.log('\n--- Checking Admin Management Sections in admin.html ---');
const adminHtml = fs.readFileSync(path.join(publicDir, 'admin.html'), 'utf8');
const requiredAdminSections = [
  'tab-overview',
  'tab-bookings',
  'tab-fleet',
  'tab-customers',
  'tab-users',
  'tab-inquiries',
  'tab-reports',
  'tab-audit'
];

for (const sec of requiredAdminSections) {
  assert.ok(adminHtml.includes(sec), `Admin section container #${sec} must be present`);
  console.log(`[PASS] Admin section container #${sec} found`);
}

// 4. Test Customer Portal views in customer.html
console.log('\n--- Checking Customer Portal Views in customer.html ---');
const customerHtml = fs.readFileSync(path.join(publicDir, 'customer.html'), 'utf8');
assert.ok(customerHtml.includes('unauthSection') || customerHtml.includes('auth-container'), 'Portal authentication container must exist');
assert.ok(customerHtml.includes('authSection') || customerHtml.includes('portal-profile-card'), 'Customer dashboard container must exist');
console.log('[PASS] Customer Portal authentication and dashboard structures verified');

console.log('\n====================================================');
console.log('ALL FRONTEND VIEW TESTS & SIMULATIONS PASSED!');
console.log('====================================================');
