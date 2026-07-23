import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000');
    console.log('Page loaded');
    
    const button = page.locator('.skill-pill').first();
    console.log('Button text:', await button.innerText());
    
    // Check if element is clickable
    const isClickable = await button.isEnabled();
    console.log('Is button enabled?', isClickable);
    
    await button.click({ timeout: 5000 });
    console.log('Button clicked successfully');
    
    const className = await button.getAttribute('class');
    console.log('Button class after click:', className);
    
    const profiles = page.locator('article.card-wrapper');
    console.log('Number of profiles shown:', await profiles.count());
    
  } catch (err) {
    console.error('Error during click test:', err.message);
  } finally {
    await browser.close();
  }
})();
