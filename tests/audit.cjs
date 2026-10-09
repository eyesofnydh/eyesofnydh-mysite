const assert = require('node:assert/strict');
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://localhost:4173';
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const failures = [];
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({headless:true});
    try {
      const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce'});
      const check = async (name, action) => {
        try { await action(); console.log(`PASS ${engine.name()}: ${name}`); }
        catch (error) { failures.push(`${engine.name()} ${name}: ${error.message}`); }
      };
      await check('mobile menu Escape restores visible header focus', async () => {
        await page.goto(base);
        await page.locator('.nav-open-btn').click();
        await page.locator('#mobile-lens-options a').first().focus();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.nav-open-btn').evaluate(e=>document.activeElement===e),true);
      });
      await check('mobile menu can be reached directly from header by keyboard', async () => {
        await page.locator('.nav-open-btn').focus();
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.locator('#mobile-lens-options').evaluate(e=>e.contains(document.activeElement)),true);
        await page.keyboard.press('Escape');
        await page.locator('.nav-open-btn').click();
        await page.locator('#mobile-lens-toggle').click();
        assert.equal(await page.locator('.nav-open-btn').evaluate(e=>document.activeElement===e),true);
      });
      await check('failed original has a readable fallback and next photo recovers', async () => {
        await page.goto(base);
        await page.route('**/assets/images/f4.png',route=>route.abort());
        await page.locator('#deck-open').click();
        await page.waitForFunction(()=>document.querySelector('#dialog-image').complete);
        assert.match(await page.locator('#photo-load-status').innerText(),/could not load/i);
        await page.locator('#photo-next').click();
        await page.locator('#dialog-image').evaluate(e=>e.decode());
        assert.equal(await page.locator('#photo-load-status').innerText(),'');
        assert.equal(await page.locator('#dialog-image').isVisible(),true);
        await page.keyboard.press('Escape');
      });
      await check('autoplay pauses while viewer is open and resumes after closing', async () => {
        await page.goto(base);
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.locator('#deck-autoplay').click();
        await page.locator('#deck-open').click();
        const before = await page.locator('#deck-current').innerText();
        await page.waitForTimeout(3500);
        assert.equal(await page.locator('#deck-current').innerText(),before);
        await page.keyboard.press('Escape');
        await page.mouse.move(0,0);
        await page.waitForFunction(value=>document.querySelector('#deck-current').textContent!==value,before,{timeout:4200});
      });
      await page.close();
      const desktop = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      await check('ordinary vertical wheel scroll escapes the carousel', async () => {
        await desktop.goto(base);
        await desktop.locator('#deck-stage').evaluate(e=>e.scrollIntoView({block:'center'}));
        const position = await desktop.evaluate(()=>scrollY);
        const frame = await desktop.locator('#deck-current').innerText();
        await desktop.locator('#deck-stage').hover();
        await desktop.mouse.wheel(0,260);
        await desktop.waitForTimeout(300);
        assert.ok(await desktop.evaluate(()=>scrollY)>position,'vertical page scroll was captured');
        assert.equal(await desktop.locator('#deck-current').innerText(),frame);
        await desktop.locator('#deck-stage').scrollIntoViewIfNeeded();
        await desktop.locator('#deck-stage').hover();
        await desktop.keyboard.down('Shift');
        await desktop.mouse.wheel(0,100);
        await desktop.keyboard.up('Shift');
        await desktop.waitForFunction(value=>document.querySelector('#deck-current').textContent!==value,frame);
      });
      await check('all photo pages fit narrow screens and load their previews', async () => {
        await desktop.setViewportSize({width:320,height:844});
        for (const file of fs.readdirSync(path.join(__dirname,'../photos')).filter(f=>f.endsWith('.html'))) {
          await desktop.goto(`${base}/photos/${file}`);
          await desktop.locator('.photo-detail figure img').evaluate(e=>e.decode());
          assert.equal(await desktop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${file}: overflow`);
          const bounds=await desktop.locator('.photo-detail-copy h1').boundingBox();
          assert.ok(bounds.x>=0&&bounds.x+bounds.width<=320,`${file}: title bounds`);
          const logo=await desktop.locator('.header .wordmark').boundingBox(),back=await desktop.locator('.header .text-link').boundingBox();
          assert.ok(logo.x+logo.width<=back.x||back.y>=logo.y+logo.height,`${file}: header links overlap`);
          assert.ok(back.x+back.width<=320,`${file}: header link clipped`);
        }
        for (const width of [390,768,1440]) {
          await desktop.setViewportSize({width,height:900});
          await desktop.goto(`${base}/photos/tea-country.html`);
          await desktop.locator('.photo-detail figure img').evaluate(e=>e.decode());
          assert.equal(await desktop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`photo page overflow ${width}`);
        }
        await desktop.screenshot({path:`tests/audit-${engine.name()}-photo.png`});
      });
      await desktop.close();
    } finally { await browser.close(); }
  }
  assert.deepEqual(failures,[]);
})().catch(error=>{console.error(error);process.exit(1)});
