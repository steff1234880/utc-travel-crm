const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating...');
  await page.goto('http://localhost:5173/packages');

  console.log('Waiting for packages to load...');
  await page.waitForTimeout(2000);
  
  console.log('Navigating to first package detail...');
  const pkgLinks = await page.$$('a[href^="/packages/"]');
  if (pkgLinks.length > 0) {
    await pkgLinks[0].click();
    await page.waitForTimeout(3000);
  }

  console.log('Clicking JOIN GROUP TOUR button...');
  // It might be disabled, so wait until we can click
  // Or click the highlighted date
  const dateBtns = await page.$$('button.cursor-pointer.bg-\\[\\#8b182b\\]'); 
  if (dateBtns.length > 0) {
    await dateBtns[0].click();
    await page.waitForTimeout(1000);
  }

  const joinBtn = await page.$('button:has-text("JOIN GROUP TOUR")');
  if (joinBtn) {
    await joinBtn.click();
    await page.waitForTimeout(1000);
    
    console.log('Modal opened. Looking for "Book / Join Group Tour"...');
    
    await page.fill('input[placeholder="e.g. Rahul Sharma"]', 'John Doe').catch(() => {});
    await page.fill('input[placeholder="e.g. rahul@example.com"]', 'john@example.com').catch(() => {});
    await page.fill('input[placeholder="e.g. +91 9876543210"]', '1234567890').catch(() => {});

    const essentialBtn = await page.$('text="Essential"');
    if (essentialBtn) await essentialBtn.click();
    await page.waitForTimeout(500);

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit Book / Join Group Tour...');
      await submitBtn.click();
      await page.waitForTimeout(3000); // Wait for potential crash
    } else {
      console.log('Submit button not found');
    }
  } else {
    console.log('JOIN GROUP TOUR button not found');
  }

  console.log('Done.');
  await browser.close();
})();
