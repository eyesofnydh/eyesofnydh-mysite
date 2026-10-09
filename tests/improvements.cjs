const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH});
  try {
    const context = await browser.newContext({reducedMotion:'reduce', viewport:{width:390,height:844}});
    const page = await context.newPage(), errors = [], originals = [];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('request', r=>{if (/\/images\/[^/]+\.(?:png|jpe?g)(?:\?|$)/.test(r.url()) && !r.url().includes('nidhin')) originals.push(r.url());});
    const base = process.env.SITE_URL || 'http://localhost:4173';
    await page.goto(base);
    await page.locator('#deck-save').click();
    assert.equal(await page.locator('#deck-save').getAttribute('aria-pressed'),'true');
    const total = await page.evaluate(()=>window.NYDH_PHOTOS.length);
    assert((await page.locator('#gallery-status').innerText()).includes(`DNA carousel · frame 4 of ${total}`));
    assert.deepEqual(originals, [], 'original photos should load only in the viewer');
    await page.locator('#deck-open').click();
    assert.equal(await page.locator('#photo-save').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#dialog-image').getAttribute('src'),/images\/f4.png$/);
    await page.evaluate(()=>{
      Object.defineProperty(navigator,'share',{value:undefined, configurable:true});
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied')}}, configurable:true});
    });
    await page.locator('#photo-share').click();
    const url = await page.locator('#share-link').inputValue();
    assert.equal(new URL(url).pathname,'/photos/a-world-of-green.html');
    await page.locator('#photo-save').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#deck-save').getAttribute('aria-pressed'),'false');
    await page.locator('.archive-tools').evaluate(e=>e.open=true);
    await page.locator('#photo-search').fill('Tea country');
    await page.locator('#deck-open').click();
    assert.match(await page.locator('#dialog-image').getAttribute('src'),/new-tea-country\.jpg$/);
    await page.locator('#dialog-image').evaluate(image=>image.decode());
    await page.keyboard.press('Escape');
    await page.locator('#photo-search').fill('');
    for (const mode of ['dna','stack','shelf','grid']) {
      await page.locator(`[data-layout="${mode}"]`).click();
      await page.locator('.archive-tools').evaluate(e=>e.open=true);
      await page.locator('#photo-search').fill('no-matching-photo');
      await page.locator(mode==='grid'?'.gallery-reset':'#deck-reset').click();
      assert.equal(await page.locator('#photo-search').inputValue(),'');
      assert.equal(await page.locator('#saved-count').innerText(),'0');
      assert.ok(await page.locator('#gallery-status').isVisible());
    }
    await page.goto(url);
    assert.equal(await page.locator('h1').innerText(),'A world of green');
    assert.match(await page.locator('.photo-detail img').getAttribute('src'),/f4-800\.jpg$/);
    await page.goto(base);
    await page.locator('#scene-next').click();
    await page.locator('#scene-image').evaluate(i=>i.decode());
    assert.match(await page.locator('#scene-image').evaluate(i=>i.currentSrc),/f3-/);
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    const restricted = await browser.newContext({reducedMotion:'reduce'});
    await restricted.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));
    const visit = await restricted.newPage(); await visit.goto(base);
    await visit.locator('#deck-save').click();
    assert.match(await visit.locator('#save-status').innerText(),/this visit only/);
    await restricted.close();
    const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:844}});
    const fallback = await noJS.newPage(); await fallback.goto(base);
    assert.equal(await fallback.locator('.fallback-gallery a').count(),total);
    assert.ok(await fallback.locator('.fallback-gallery a').first().isVisible());
    assert.equal(await fallback.locator('button:visible').count(),0);
    assert.ok(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.equal(await fallback.locator('main .memory-strip').count(),1);
    await noJS.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: preview delivery, original viewer, shared-link recovery, Save synchronization, all-layout reset/status, denied storage, responsive bounds and full no-JS collection.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
