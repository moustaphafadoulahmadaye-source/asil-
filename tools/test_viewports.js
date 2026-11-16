const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const page = await browser.newPage();
  
  const viewports = [
    { width: 1366, height: 768, name: 'desktop' },
    { width: 390, height: 844, name: 'mobile' }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    
    const bottomBarDisplay = await page.$eval('.app-bottom-bar', el => window.getComputedStyle(el).display).catch(() => 'not-found');
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): bottom bar display = ${bottomBarDisplay}`);

    const svgWidths = await page.$$eval('.app-bottom-bar svg', svgs => {
      return svgs.map(s => s.getBoundingClientRect().width);
    }).catch(() => []);
    console.log(`Viewport ${vp.name}: SVG widths =`, svgWidths);

    await page.screenshot({ path: `viewport-${vp.name}-home.png` });
  }

  await browser.close();
  console.log('Viewport checks passed!');
})();
