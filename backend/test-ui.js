const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to dashboard...');
    // Log in
    await page.goto('http://localhost:5173/admin/crm/pipeline');
    
    // We might need to mock auth or login first. 
    // Wait, the frontend might redirect to /login if not authenticated.
    // Let's just wait for the network to be idle and see if the new lead button is there.
    
    // Wait for a bit
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if redirect happened
    if (page.url().includes('login')) {
      console.log('Redirected to login. Filling login...');
      await page.type('input[type="email"]', 'admin@utctravel.com'); // We'll try whatever
      await page.type('input[type="password"]', 'password123'); // or whatever
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('Current URL:', page.url());
    
    // Check if new lead button exists
    const buttonExists = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Lead'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (buttonExists) {
      console.log('Clicked New Lead button');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for select
      const options = await page.evaluate(() => {
        const select = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Pipeline Stage'))?.nextElementSibling;
        if (select && select.tagName === 'SELECT') {
          return Array.from(select.options).map(o => o.value);
        }
        return [];
      });
      
      console.log('Dropdown options:', options);
    } else {
      console.log('New Lead button not found');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
