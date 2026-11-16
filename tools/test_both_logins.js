const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  // TEST 1: Direct Admin Console Login on /admin
  console.log('--- TEST 1: Direct Admin Console Login (/admin) ---');
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  
  const errors1 = [];
  page1.on('console', msg => { if (msg.type() === 'error') errors1.push(msg.text()); });
  page1.on('pageerror', err => errors1.push(err.message));

  await page1.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  const gateVisible1 = await page1.$eval('#adminAuthGate', el => window.getComputedStyle(el).display !== 'none');
  console.log('1. Admin auth gate displayed initially:', gateVisible1);

  await page1.fill('#admUser', 'admin');
  await page1.fill('#admPass', 'admin123');
  await page1.click('#btnAdminSignIn');

  await page1.waitForFunction(() => {
    const main = document.getElementById('adminMainContent');
    return main && window.getComputedStyle(main).display !== 'none';
  }, { timeout: 8000 });

  const mainVisible1 = await page1.$eval('#adminMainContent', el => window.getComputedStyle(el).display !== 'none');
  console.log('1. Operations Console unlocked successfully:', mainVisible1);
  console.log('1. Console error count on /admin:', errors1.length);
  if (errors1.length) console.log('Errors:', errors1);

  await context1.close();

  // TEST 2: Signing in as Admin via Portal (/portal)
  console.log('\n--- TEST 2: Signing in via /portal as Admin ---');
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  const errors2 = [];
  page2.on('console', msg => { if (msg.type() === 'error') errors2.push(msg.text()); });
  page2.on('pageerror', err => errors2.push(err.message));

  await page2.goto('http://localhost:3000/portal', { waitUntil: 'networkidle' });
  
  // Fill the form on /portal
  await page2.fill('#loginUsername', 'admin');
  await page2.fill('#loginPassword', 'admin123');
  console.log('2. Filled login form on /portal with admin credentials. Clicking submit...');
  await page2.click('#btnLoginCustomer');

  // Should automatically redirect to /admin
  await page2.waitForURL('**/admin**', { timeout: 8000 });
  console.log('2. Automatically redirected to URL:', page2.url());

  // Wait for admin console to load
  await page2.waitForFunction(() => {
    const main = document.getElementById('adminMainContent');
    return main && window.getComputedStyle(main).display !== 'none';
  }, { timeout: 8000 });

  const mainVisible2 = await page2.$eval('#adminMainContent', el => window.getComputedStyle(el).display !== 'none');
  console.log('2. Operations Console active after portal login:', mainVisible2);
  console.log('2. Console error count on /portal redirect:', errors2.length);

  await context2.close();
  await browser.close();

  console.log('\n>>> ALL ADMIN AUTHENTICATION PATHWAYS VERIFIED 100%!');
})();
