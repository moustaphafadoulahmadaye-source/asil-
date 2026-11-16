const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });

  // Type in username and password to verify padding
  await page.fill('#admUser', 'admin');
  await page.fill('#admPass', 'admin123');

  // Verify text does not contain provisioning text
  const bodyText = await page.textContent('body');
  console.log('Contains "Provisioning"?', bodyText.includes('Provisioning'));
  console.log('Contains "admin123"?', bodyText.includes('admin123'));
  console.log('Contains "npm run"?', bodyText.includes('npm run'));

  // Get padding of input
  const padLeft = await page.$eval('#admUser', el => window.getComputedStyle(el).paddingLeft);
  console.log('admUser paddingLeft:', padLeft);

  await page.screenshot({ path: 'admin-login-professional.png' });
  console.log('Screenshot saved: admin-login-professional.png');

  await browser.close();
})();
