const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page = await browser.newPage({reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`)});
  const base=process.env.SITE_URL || 'http://localhost:4173';
  for(const width of [320,375,390,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['index.html','travel.html']) {
      await page.goto(`${base}/${route}`);
      await page.evaluate(async()=>{for(const img of document.images)if(img.getAttribute('src'))img.loading='eager';await Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.decode().catch(()=>{})))});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${route} ${width}`);
      assert.deepEqual(await page.evaluate(()=>[...document.images].filter(i=>i.getAttribute('src')&&!i.naturalWidth).map(i=>i.src)),[],`Images ${width}`);
      assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[],`Anchors ${route}`);
      if(route==='index.html') {
        assert.equal(await page.locator('.header-note').count(),0);
        if(width>760) {
          assert(await page.locator('#navigation').evaluate(e=>!e.inert));
          await page.locator('.nav-open-btn').click();
          for(const link of await page.locator('#navigation a').all()) {
            const r=await link.boundingBox();
            assert(r&&r.x>=0&&r.x+r.width<=width&&r.y>=0&&r.y+r.height<=900,'Menu link bounds');
          }
          await page.locator('#navigation a[href="#journey"]').click();
          assert(await page.locator('#navigation').evaluate(e=>!e.inert));
          await page.locator('.nav-open-btn').click();
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.nav-open-btn').getAttribute('aria-expanded'),'false');
        } else {
          await page.locator('.nav-open-btn').click();
          await page.locator('#mobile-lens-options a[href="#journey"]').click();
          assert.equal(await page.locator('.nav-open-btn').getAttribute('aria-expanded'),'false');
        }
        await page.locator('[data-layout="grid"]').click();
        await page.locator('.photo-view').first().click();
        assert(await page.locator('#photo-dialog').evaluate(d=>d.open));
        await page.keyboard.press('Escape');
        if(!await page.locator('.archive-tools').evaluate(e=>e.open)) await page.locator('.archive-tools summary').click();
        await page.locator('#photo-search').fill('not-a-photo-at-all');
        assert.match(await page.locator('#gallery-status').innerText(),/No photographs/);
      } else {
        assert.equal(await page.locator('.journey-frame').count(),12);
        await page.locator('[data-series-filter="shoreline"]').click();
        assert.equal(await page.locator('.journey-frame:visible').count(),4);
        await page.locator('.journey-frame:visible .journey-image-link').first().click();
        assert(await page.locator('.journey-viewer').evaluate(d=>d.open));
        assert.match(await page.locator('#journey-viewer-count').innerText(),/01 \/ 04/);
        await page.keyboard.press('ArrowRight');
        assert.match(await page.locator('#journey-viewer-count').innerText(),/02 \/ 04/);
        await page.keyboard.press('Escape');
        assert(await page.locator('.journey-frame:visible .journey-image-link').first().evaluate(e=>e===document.activeElement));
        await page.locator('.journey-notes-toggle').click();
        assert.equal(await page.locator('.journey-frame-note:visible').count(),0);
        await page.locator('.journey-notes-toggle').click();
        await page.locator('[data-series-filter="all"]').click();
        await page.locator('#story-waterways summary').click();
        assert(await page.locator('#story-waterways details').evaluate(d=>d.open));
      }
    }
    console.log(`PASS responsive interactions ${width}px`);
  }
  for(const [width,height] of [[1440,1000],[390,844],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.goto(base);
    if(width===844){await page.locator('.nav-open-btn').click();await page.locator('#navigation a').last().scrollIntoViewIfNeeded();assert(await page.locator('#navigation a').last().isVisible());}
    await page.screenshot({path:`tests/refined-home-${width}.png`});
    await page.goto(`${base}/travel.html`);
    await page.screenshot({path:`tests/refined-journey-${width}.png`});
  }
  await page.goto(`${base}/travel.html#story-after-dark`);
  assert(await page.locator('#story-after-dark details').evaluate(d=>d.open));
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await nojs.goto(`${base}/travel.html`);
  assert.equal(await nojs.locator('.journey-frame').count(),12);
  await nojs.locator('#story-waterways summary').click();
  assert(await nojs.locator('#story-waterways details').evaluate(d=>d.open));
  await nojs.goto(base);
  assert(await nojs.locator('#navigation a[href="#journey"]').isVisible());
  const motion=await browser.newPage({reducedMotion:'no-preference'});
  await motion.goto(base);
  assert.equal(await motion.locator('#motion-toggle').count(),0);
  await motion.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await motion.evaluate(()=>motionAllowed()),false);
  await motion.goto(`${base}/travel.html`);
  assert.equal(await motion.locator('.journey-motion').count(),0);
  assert(await motion.locator('body').evaluate(element=>element.classList.contains('motion-paused')));
  await motion.emulateMedia({reducedMotion:'no-preference'});
  await motion.waitForFunction(()=>!document.body.classList.contains('motion-paused'));
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('PASS images, anchors, navigation, filters, viewers, notes, deep links, no-JS, console and network');
})().catch(e=>{console.error(e);process.exit(1)});
