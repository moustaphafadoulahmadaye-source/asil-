const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('Navigating to http://localhost:3000/admin...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });

  // 1. Check Auth Gate is visible
  const gateVisible = await page.$eval('#adminAuthGate', el => window.getComputedStyle(el).display !== 'none');
  console.log('Auth gate visible initially:', gateVisible);

  // 2. Fill login credentials
  await page.fill('#admUser', 'admin');
  await page.fill('#admPass', 'admin123');
  console.log('Credentials filled. Clicking Authenticate button...');
  await page.click('#btnAdminSignIn');

  // 3. Wait for adminMainContent to be visible
  await page.waitForFunction(() => {
    const main = document.getElementById('adminMainContent');
    return main && window.getComputedStyle(main).display !== 'none';
  }, { timeout: 8000 });

  const mainVisible = await page.$eval('#adminMainContent', el => window.getComputedStyle(el).display !== 'none');
  console.log('Main console visible after authentication:', mainVisible);

  // 4. Test Tab Navigation
  const tabsToTest = ['bookings', 'fleet', 'customers', 'inquiries', 'users', 'reports', 'audit', 'overview'];
  for (const t of tabsToTest) {
    console.log(`Testing tab: ${t}...`);
    await page.click(`#btn-tab-${t}`);
    const isVis = await page.$eval(`#tab-${t}`, el => window.getComputedStyle(el).display !== 'none');
    if (!isVis) throw new Error(`Tab ${t} did not become visible!`);
    console.log(`Tab ${t} OK!`);
  }

  console.log('Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  // 5. Take screenshot to verify visual appearance
  await page.screenshot({ path: 'admin-dashboard-verified.png', fullPage: false });
  console.log('Screenshot saved: admin-dashboard-verified.png');

  await browser.close();
  console.log('VERIFICATION FINISHED SUCCESSFULLY!');
})();
