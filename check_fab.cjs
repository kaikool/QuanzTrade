const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:3000');
  
  // Wait for the app to load
  await page.waitForSelector('#m3-fab');
  
  const fabRect = await page.evaluate(() => {
    const fab = document.getElementById('m3-fab');
    if (!fab) return null;
    const rect = fab.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      windowWidth: window.innerWidth
    };
  });
  
  console.log('FAB Rect:', fabRect);
  await browser.close();
})();
