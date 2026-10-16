const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    } else {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));

  console.log('Navigating to swiss-alps-ski-adventure...');
  await page.goto(`http://localhost:5173/packages/swiss-alps-ski-adventure`);

  console.log('Scrolling down to find JOIN GROUP TOUR button...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  const dateBtns = await page.$$('button.cursor-pointer.bg-\\[\\#8b182b\\]'); 
  if (dateBtns.length > 0) {
    console.log('Clicking highlighted date');
    await dateBtns[0].click();
    await page.waitForTimeout(1000);
  }

  const joinBtn = await page.$('button:has-text("JOIN GROUP TOUR")');
  if (joinBtn) {
    console.log('Found JOIN GROUP TOUR button, clicking...');
    await joinBtn.click();
    await page.waitForTimeout(1000);
    
    console.log('Modal opened. Looking for Essential tier...');
    const essentialBtn = await page.$('text="Essential"');
    if (essentialBtn) await essentialBtn.click();
    await page.waitForTimeout(500);

    console.log('Filling form...');
    await page.fill('input[placeholder="e.g. Rahul Sharma"]', 'John Doe').catch(() => {});
    await page.fill('input[placeholder="e.g. rahul@example.com"]', 'john@example.com').catch(() => {});
    await page.fill('input[placeholder="e.g. +91 9876543210"]', '1234567890').catch(() => {});

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit button (Confirm & Join)...');
      await submitBtn.click();
      await page.waitForTimeout(3000); // Wait for potential crash
    } else {
      console.log('Submit button not found');
    }
  } else {
    console.log('JOIN GROUP TOUR button not found on this page');
  }

  console.log('Done.');
  await browser.close();
})();
