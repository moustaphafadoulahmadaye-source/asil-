/**
 * Capture All Customer Journey Screenshots at 1366px and 390px
 * Saves to Artifacts directory
 */

const path = require('path');
const { chromium } = require('../node_modules/playwright');

const ARTIFACTS_DIR = 'C:\\Users\\Moustapha\\.gemini\\antigravity\\brain\\c45ab2a7-a9b1-4734-82a3-e0d5672155b1';
const BASE_URL = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const viewports = [
    { name: '1366', width: 1366, height: 850, isMobile: false },
    { name: '390', width: 390, height: 844, isMobile: true }
  ];

  for (const vp of viewports) {
    console.log(`\n======================================================`);
    console.log(`>>> Capturing Journey at ${vp.width}x${vp.height} (${vp.name})`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.isMobile
    });
    const page = await context.newPage();

    // 1. Home Page (Information only)
    console.log(`Capturing Home Page (${vp.name})...`);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-1-home-${vp.name}.png`),
      fullPage: false
    });

    // 2. Registration Page (/portal?mode=register&next=/order)
    console.log(`Capturing Register Page (${vp.name})...`);
    await page.goto(`${BASE_URL}/portal?mode=register&next=/order`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-2-register-${vp.name}.png`),
      fullPage: false
    });

    // Perform Registration with a unique user
    const uniqueId = Date.now().toString().slice(-6) + '_' + vp.name;
    const testUsername = `shipper_${uniqueId}`;
    const testEmail = `shipper_${uniqueId}@nilelogistics.sd`;
    const testPassword = `SecurePass${uniqueId}!`;

    console.log(`Registering account ${testUsername}...`);
    await page.fill('#regFullName', 'Tariq Al-Mahdi');
    await page.fill('#regUsername', testUsername);
    await page.fill('#regEmail', testEmail);
    await page.fill('#regPhone', '+249 912 345 678');
    await page.fill('#regPassword', testPassword);

    await page.click('#btnRegisterCustomer');

    // Should redirect directly to /order
    console.log(`Waiting for redirect to /order...`);
    await page.waitForURL('**/order**', { timeout: 10000 });
    await page.waitForSelector('#orderStepper', { timeout: 8000 });
    await page.waitForTimeout(600);

    // 3. Order Step 1: Cargo Details
    console.log(`Capturing Order Step 1: Cargo Details (${vp.name})...`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-3-order-step1-${vp.name}.png`),
      fullPage: false
    });

    // Fill Step 1 Fields
    await page.fill('#cargoDesc', '120 Bags Premium Export Grade Gum Arabic');
    await page.fill('#cargoWeight', '2,400 kg (2.4 Tons)');
    await page.fill('#packagesCount', '120');
    await page.check('#chkKeepDry');
    await page.check('#chkPalletized');
    await page.waitForTimeout(300);

    // Proceed to Step 2
    console.log(`Advancing to Step 2...`);
    await page.click('#btnGoToStep2');
    await page.waitForSelector('#stepPanel2:not([style*="display: none"])', { timeout: 5000 });
    await page.waitForTimeout(1000); // Allow Leaflet map to render tiles

    // 4. Order Step 2: Route & Map Preview
    console.log(`Capturing Order Step 2: Route & Map Preview (${vp.name})...`);
    // Ensure Khartoum and Port Sudan corridor is selected
    await page.selectOption('#originLocation', 'LOC-KRT');
    await page.selectOption('#destLocation', 'LOC-PSU-PORT');
    await page.fill('#pickupAddress', 'Industrial Depot Sector 4, Soba, Khartoum');
    await page.fill('#deliveryAddress', 'Southern Maritime Container Wharf, Port Sudan');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-4-order-step2-${vp.name}.png`),
      fullPage: false
    });

    // Proceed to Step 3
    console.log(`Advancing to Step 3...`);
    await page.click('#btnGoToStep3');
    await page.waitForSelector('.cj-mode-card:not(.is-disabled)', { timeout: 8000 });
    await page.waitForTimeout(800);

    // 5. Order Step 3: Choose How (Quotation Cards)
    console.log(`Capturing Order Step 3: Mode Quotes (${vp.name})...`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-5-order-step3-${vp.name}.png`),
      fullPage: false
    });

    // Ensure road mode is selected and proceed to Step 4
    await page.click('.cj-mode-card[data-mode="road"]');
    await page.waitForTimeout(300);

    console.log(`Advancing to Step 4...`);
    await page.click('#btnGoToStep4');
    await page.waitForSelector('#stepPanel4:not([style*="display: none"])', { timeout: 5000 });
    await page.waitForTimeout(500);

    // 6. Order Step 4: Review and Summary
    console.log(`Capturing Order Step 4: Review Summary (${vp.name})...`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-6-order-step4-${vp.name}.png`),
      fullPage: false
    });

    // Confirm booking
    console.log(`Confirming booking submission...`);
    await page.click('#btnConfirmBooking');
    await page.waitForSelector('#successPanel:not([style*="display: none"])', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Read generated reference number
    const refText = await page.textContent('#successRef');
    console.log(`Booking confirmed with reference: ${refText}`);

    // 7. Order Success Screen
    console.log(`Capturing Order Success Screen (${vp.name})...`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-7-order-success-${vp.name}.png`),
      fullPage: false
    });

    // Navigate to Customer Account Orders List
    console.log(`Navigating to Customer Account...`);
    await page.goto(`${BASE_URL}/portal`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#custBookingsBody tr', { timeout: 8000 });
    await page.waitForTimeout(500);

    // 8. Account Orders List View
    console.log(`Capturing Account Orders List (${vp.name})...`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-8-account-list-${vp.name}.png`),
      fullPage: false
    });

    // Open detail view of the order
    console.log(`Opening Consignment Detail View for ${refText}...`);
    await page.goto(`${BASE_URL}/portal?order=${encodeURIComponent(refText.trim())}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#portalDetailView:not([style*="display: none"])', { timeout: 8000 });
    await page.waitForTimeout(600);

    // 9. Order Detail View with Vertical Timeline
    console.log(`Capturing Order Detail View (${vp.name})...`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `journey-9-order-detail-${vp.name}.png`),
      fullPage: false
    });

    await context.close();
  }

  await browser.close();
  console.log(`\nALL 18 SCREENSHOTS CAPTURED SUCCESSFULLY!`);
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
