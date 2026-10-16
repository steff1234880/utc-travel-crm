const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Fetching group tours...');
  const res = await fetch('http://localhost:5000/api/group-tours/calendar');
  const data = await res.json();
  const gt = data.data.find(g => g.packageId);
  if (!gt) {
    console.log('No group tour with package found');
    await browser.close();
    return;
  }
  
  const pkgRes = await fetch(`http://localhost:5000/api/packages/public/${gt.packageId}`);
  const pkgData = await pkgRes.json();
  const slug = pkgData.data.slug;

  console.log('Navigating to', slug);
  await page.goto(`http://localhost:5173/packages/${slug}`);

  console.log('Clicking JOIN GROUP TOUR...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  const dateBtns = await page.$$('button.cursor-pointer.bg-\\[\\#8b182b\\]'); 
  if (dateBtns.length > 0) {
    await dateBtns[0].click();
    await page.waitForTimeout(1000);
  }

  const joinBtn = await page.$('button:has-text("JOIN GROUP TOUR")');
  if (joinBtn) {
    await joinBtn.click();
    await page.waitForTimeout(1000);
    
    console.log('Modal opened. Filling form...');
    
    await page.fill('input[placeholder="e.g. Rahul Sharma"]', 'John Doe').catch(() => {});
    await page.fill('input[placeholder="e.g. rahul@example.com"]', 'john@example.com').catch(() => {});
    await page.fill('input[placeholder="e.g. +91 9876543210"]', '1234567890').catch(() => {});

    // Need to select tier if it's there
    const essentialBtn = await page.$('text="Essential"');
    if (essentialBtn) await essentialBtn.click();
    await page.waitForTimeout(500);

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit Book / Join Group Tour...');
      await submitBtn.click();
      await page.waitForTimeout(5000); // Wait for potential crash
    } else {
      console.log('Submit button not found');
    }
  } else {
    console.log('JOIN GROUP TOUR button not found');
  }

  console.log('Done.');
  await browser.close();
})();
