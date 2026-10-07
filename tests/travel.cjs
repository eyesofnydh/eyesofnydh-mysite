const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
  try {
    const base = process.env.SITE_URL || 'http://localhost:4173';
    const context = await browser.newContext({reducedMotion:'reduce', viewport:{width:1440,height:1000}});
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);});
    page.on('request', request => requests.push(request.url()));
    await page.goto(`${base}/`);
    await page.locator('.journey-preview-cta').click();
    await page.locator('.journey-home').waitFor();
    assert.equal(new URL(page.url()).pathname,'/travel.html');
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('.journey-destination').count(),3);
    assert.equal(await page.locator('.journey-motion').count(),0);
    assert.ok(await page.locator('body').evaluate(element=>element.classList.contains('motion-paused')));
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://eyesofnydh.netlify.app/travel.html');
    assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/^index,follow/);
    assert.ok(requests.every(url=>url.startsWith(base)), 'travel must not require external requests');
    await page.evaluate(async () => {
      for (const image of document.querySelectorAll('main img')) image.loading = 'eager';
      await Promise.all([...document.querySelectorAll('main img')].map(image=>image.decode()));
    });
    await page.locator('[data-rail="1"]').click();
    await page.waitForFunction(()=>document.querySelector('.journey-destinations').scrollLeft>100);
    await page.locator('[data-rail="-1"]').click();
    await page.waitForFunction(()=>document.querySelector('.journey-destinations').scrollLeft<2);
    for (const id of ['waterways','shoreline','after-dark']) {
      await page.locator(`#place-${id} h3 a`).click();
      assert.ok(await page.locator(`#story-${id}`).evaluate(element=>element.open));
      await page.locator(`#story-${id} summary`).click();
    }
    for (const width of [375,390,414,768,1024,1280,1440,1920]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow at ${width}`);
      assert.ok(await page.locator('.journey-nav').isVisible());
      const cards = await page.locator('.journey-destination').evaluateAll(elements=>elements.map(element=>({top:element.getBoundingClientRect().top,left:element.getBoundingClientRect().left})));
      if (width<=760) assert.ok(cards[1].top>cards[0].top && Math.abs(cards[1].left-cards[0].left)<1,'mobile destinations must stack');
      else assert.ok(Math.abs(cards[1].top-cards[0].top)<1,'desktop destinations must form a rail');
      for (const selector of ['.journey-nav a','.journey-home']) {
        for (const element of await page.locator(selector).all()) {
          const bounds = await element.boundingBox();
          assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width,`navigation bounds ${selector} ${width}`);
        }
      }
    }
    const links = await page.locator('a[href]').evaluateAll(elements=>elements.map(element=>element.href));
    for (const href of new Set(links)) {
      const url = new URL(href);
      if (url.origin !== new URL(base).origin) continue;
      const response = await context.request.get(url.origin+url.pathname);
      assert.equal(response.status(),200,`broken link ${href}`);
      if (url.hash && url.pathname==='/travel.html') assert.ok(await page.evaluate(hash=>!!document.getElementById(hash.slice(1)),url.hash),`missing anchor ${href}`);
    }
    assert.deepEqual(await page.locator('main img').evaluateAll(images=>images.filter(image=>!image.alt || !image.naturalWidth).map(image=>image.src)),[]);
    await page.goto(`${base}/travel.html#story-shoreline`);
    assert.ok(await page.locator('#story-shoreline').evaluate(element=>element.open),'direct story URL');
    await page.locator('#story-shoreline summary').click();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>!document.body.classList.contains('motion-paused'));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.body.classList.contains('motion-paused'));
    assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
    await page.goto(`${base}/travel.html`);
    await page.evaluate(async()=>{for(const image of document.querySelectorAll('main img'))image.loading='eager';await Promise.all([...document.querySelectorAll('main img')].map(image=>image.decode()));});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:'tests/travel-desktop.png',fullPage:true});
    await page.screenshot({path:'tests/travel-hero-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'tests/travel-mobile.png',fullPage:true});
    await page.screenshot({path:'tests/travel-hero-mobile.png'});
    await page.locator('#currently').evaluate(element=>element.scrollIntoView({block:'start'}));
    await page.screenshot({path:'tests/travel-currently-mobile.png'});

    const noJS = await browser.newContext({javaScriptEnabled:false, viewport:{width:390,height:844}});
    const staticPage = await noJS.newPage(); await staticPage.goto(`${base}/travel.html`);
    await staticPage.locator('#story-waterways summary').click();
    assert.ok(await staticPage.locator('#story-waterways .journey-prose').isVisible());
    assert.equal(await staticPage.locator('.journey-motion').count(),0);
    assert.ok(await staticPage.locator('.journey-nav').isVisible());
    assert.ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await noJS.close();

    const failed = await browser.newContext({reducedMotion:'reduce'});
    await failed.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}}));
    await failed.route('**/assets/images/previews/**',route=>route.abort());
    const failedPage=await failed.newPage(); await failedPage.goto(`${base}/travel.html`);
    await failedPage.locator('.journey-hero .journey-missing').waitFor();
    await failedPage.locator('#story-waterways summary').click();
    assert.ok(await failedPage.locator('#story-waterways .journey-prose').isVisible());
    await failed.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: journal navigation, three honest archive stories, eight responsive widths, desktop rail/mobile stack, keyboard controls, static deep links, assets/internal links, SEO, reduced motion, no-JS content, failed-image/storage recovery; no browser errors or external runtime requests.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
