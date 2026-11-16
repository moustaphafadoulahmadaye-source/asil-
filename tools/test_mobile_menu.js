#!/usr/bin/env node
/**
 * ASIL Logistics - Mobile Navigation Menu Automated Playwright Verification Suite
 * Tests responsive mobile hamburger navigation menu across all public pages
 * at 360px, 390px, 768px, and 1024px viewports.
 *
 * Verifies:
 * - Hamburger button visibility (< 900px) & concealment (>= 900px)
 * - Tap to open & tap to close toggle behavior
 * - ARIA accessibility states (aria-expanded, aria-hidden, role/labels)
 * - Navigation links visibility inside the mobile drawer
 * - Desktop nav menu visibility (>= 900px) & concealment (< 900px)
 * - Zero JavaScript console errors and runtime exceptions
 */

const { chromium } = require('playwright');

const TEST_PORT = process.env.TEST_PORT || process.env.PORT || '3000';
const BASE_URL = process.env.BASE_URL || `http://localhost:${TEST_PORT}`;

// All public pages of ASIL Logistics
const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Transport & Fleet', path: '/transport' },
  { name: 'Distribution', path: '/distribution' },
  { name: 'Maintenance', path: '/maintenance' },
  { name: 'Onboarding', path: '/onboarding' },
  { name: 'Customer Portal', path: '/portal' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
  { name: '404 Page', path: '/404' }
];

const VIEWPORTS = [
  { width: 360, height: 740, isMobile: true, label: '360px' },
  { width: 390, height: 844, isMobile: true, label: '390px' },
  { width: 768, height: 1024, isMobile: true, label: '768px' },
  { width: 1024, height: 768, isMobile: false, label: '1024px' }
];

async function runMobileMenuTests() {
  console.log('='.repeat(98));
  console.log('       ASIL LOGISTICS - PLAYWRIGHT MOBILE HAMBURGER MENU VERIFICATION SUITE       ');
  console.log('='.repeat(98));
  console.log(`Target Base URL   : ${BASE_URL}`);
  console.log(`Pages Tested      : ${PAGES.length} pages (${PAGES.map(p => p.path).join(', ')})`);
  console.log(`Viewports Tested  : 360px (Small Mobile), 390px (Standard Mobile), 768px (Tablet), 1024px (Desktop)`);
  console.log(`Total Test Runs   : ${PAGES.length * VIEWPORTS.length} configurations\n`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (_) {
    browser = await chromium.launch({ headless: true });
  }

  const results = [];
  let totalCount = 0;
  let passCount = 0;
  let failCount = 0;

  for (const pageDef of PAGES) {
    const pageRow = {
      name: pageDef.name,
      path: pageDef.path,
      vpResults: {}
    };

    for (const vp of VIEWPORTS) {
      totalCount++;
      const context = await browser.newContext({
        serviceWorkers: 'block', // prevent test context disruption from sw reload
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.isMobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      const consoleErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const txt = msg.text();
          // Filter out intentional HTTP 404 network status on 404 page
          if (pageDef.path === '/404' && txt.includes('404 (Not Found)')) {
            return;
          }
          consoleErrors.push(txt);
        }
      });

      page.on('pageerror', err => {
        consoleErrors.push(err.message);
      });

      const failures = [];
      const targetUrl = `${BASE_URL}${pageDef.path}`;

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(150);

        const btnToggle = page.locator('#btnMobileToggle');
        const mobileMenu = page.locator('#mobile-menu');
        const desktopNav = page.locator('.nav-menu');

        if (vp.isMobile) {
          // --- MOBILE / TABLET VIEWPORTS (< 900px) ---

          // 1. Verify hamburger is visible and desktop nav is hidden
          const isBtnVisible = await btnToggle.isVisible();
          if (!isBtnVisible) {
            failures.push('Hamburger button #btnMobileToggle is not visible');
          }

          const isDesktopNavVisible = await desktopNav.isVisible();
          if (isDesktopNavVisible) {
            failures.push('Desktop .nav-menu should be hidden below 900px');
          }

          // 2. Initial state: closed
          const initExpanded = await btnToggle.getAttribute('aria-expanded');
          const initHidden = await mobileMenu.getAttribute('aria-hidden');
          const initOpenClass = await mobileMenu.evaluate(el => el.classList.contains('open'));
          const initMenuVisible = await mobileMenu.isVisible();

          if (initExpanded === 'true' || initHidden === 'false' || initOpenClass || initMenuVisible) {
            failures.push('Menu should be closed initially');
          }

          // 3. First tap: Open Menu
          await btnToggle.click();
          await page.waitForTimeout(200);

          const openClass = await mobileMenu.evaluate(el => el.classList.contains('open'));
          const openExpanded = await btnToggle.getAttribute('aria-expanded');
          const openHidden = await mobileMenu.getAttribute('aria-hidden');
          const menuVisible = await mobileMenu.isVisible();

          if (!openClass || openExpanded !== 'true' || openHidden !== 'false' || !menuVisible) {
            failures.push('Menu failed to open on first tap (open class, aria-expanded="true", or visibility missing)');
          }

          // 4. Verify menu links are present and visible
          const links = mobileMenu.locator('a');
          const linkCount = await links.count();
          if (linkCount < 3) {
            failures.push(`Expected at least 3 menu links, found ${linkCount}`);
          } else {
            const firstLinkVisible = await links.first().isVisible();
            if (!firstLinkVisible) {
              failures.push('Menu navigation links are not visible inside drawer');
            }
          }

          // 5. Second tap: Close Menu
          await btnToggle.click();
          await page.waitForTimeout(200);

          const closedClass = await mobileMenu.evaluate(el => el.classList.contains('open'));
          const closedExpanded = await btnToggle.getAttribute('aria-expanded');
          const closedHidden = await mobileMenu.getAttribute('aria-hidden');
          const menuStillVisible = await mobileMenu.isVisible();

          if (closedClass || closedExpanded !== 'false' || closedHidden !== 'true' || menuStillVisible) {
            failures.push('Menu failed to close on second tap');
          }

        } else {
          // --- DESKTOP VIEWPORT (>= 900px) ---

          const isBtnVisible = await btnToggle.isVisible();
          if (isBtnVisible) {
            failures.push('Hamburger button should be hidden on desktop (>= 900px)');
          }

          const isDesktopNavVisible = await desktopNav.isVisible();
          if (!isDesktopNavVisible) {
            failures.push('Desktop .nav-menu should be visible on desktop (>= 900px)');
          }

          const isMenuVisible = await mobileMenu.isVisible();
          if (isMenuVisible) {
            failures.push('Mobile drawer menu should be hidden on desktop (>= 900px)');
          }
        }

        // 6. Zero Console Errors Check
        if (consoleErrors.length > 0) {
          failures.push(`Console errors (${consoleErrors.length}): ${consoleErrors.slice(0, 2).join('; ')}`);
        }

      } catch (err) {
        failures.push(`Test execution exception: ${err.message}`);
      } finally {
        await context.close();
      }

      const isPass = failures.length === 0;
      if (isPass) {
        passCount++;
      } else {
        failCount++;
      }

      pageRow.vpResults[vp.width] = {
        passed: isPass,
        failures,
        consoleErrorsCount: consoleErrors.length
      };
    }

    results.push(pageRow);
  }

  await browser.close();

  // Print Structured Markdown / ASCII Table
  console.log('| ' + 'Page'.padEnd(22) + ' | ' + '360px'.padEnd(12) + ' | ' + '390px'.padEnd(12) + ' | ' + '768px'.padEnd(12) + ' | ' + '1024px'.padEnd(12) + ' | Status   |');
  console.log('|' + '-'.repeat(24) + '|' + '-'.repeat(14) + '|' + '-'.repeat(14) + '|' + '-'.repeat(14) + '|' + '-'.repeat(14) + '|' + '-'.repeat(10) + '|');

  let allSucceeded = true;
  for (const r of results) {
    const s360 = r.vpResults[360].passed ? 'PASS' : 'FAIL';
    const s390 = r.vpResults[390].passed ? 'PASS' : 'FAIL';
    const s768 = r.vpResults[768].passed ? 'PASS' : 'FAIL';
    const s1024 = r.vpResults[1024].passed ? 'PASS' : 'FAIL';

    const pagePassed = r.vpResults[360].passed && r.vpResults[390].passed && r.vpResults[768].passed && r.vpResults[1024].passed;
    if (!pagePassed) allSucceeded = false;

    console.log(`| ${r.name.padEnd(22)} | ${s360.padEnd(12)} | ${s390.padEnd(12)} | ${s768.padEnd(12)} | ${s1024.padEnd(12)} | ${(pagePassed ? 'PASS' : 'FAIL').padEnd(8)} |`);

    if (!pagePassed) {
      for (const [width, info] of Object.entries(r.vpResults)) {
        if (!info.passed) {
          console.log(`    -> [${width}px Failure]: ${info.failures.join(' | ')}`);
        }
      }
    }
  }

  console.log('='.repeat(98));
  console.log(`Total Configurations: ${totalCount} | Passed: ${passCount} | Failed: ${failCount}`);

  if (!allSucceeded) {
    console.error('\nFAILURE: One or more pages failed the mobile menu test.');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All public pages passed mobile menu verification across all viewports with 0 console errors!');
    process.exit(0);
  }
}

if (require.main === module) {
  runMobileMenuTests().catch(err => {
    console.error('Fatal error running mobile menu tests:', err);
    process.exit(1);
  });
}

module.exports = { runMobileMenuTests };
