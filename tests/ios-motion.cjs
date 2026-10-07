const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try {
    const context = await browser.newContext({
      viewport:{width:390,height:844},
      hasTouch:true,
      isMobile:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));

    await page.goto(process.env.SITE_URL || 'http://localhost:4173');
    assert(await page.locator('html').evaluate(element=>element.classList.contains('is-ios')));
    assert.equal(await page.locator('#motion-toggle').innerText(),'iOS motion safe');
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-disabled'),'true');
    assert.equal(await page.locator('.page-transition').evaluate(element=>getComputedStyle(element).display),'none');
    await page.locator('#scene-next').click();
    assert.match(await page.locator('#scene-title').innerText(),/02/);
    assert.equal(await page.locator('#scene-image').evaluate(element=>element.getAnimations().length),0);
    await page.locator('.nav-open-btn').click();
    assert.equal(await page.locator('#mobile-lens-options').getAttribute('aria-hidden'),'false');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

    await page.goto('http://localhost:4173/travel.html');
    assert(await page.locator('html').evaluate(element=>element.classList.contains('is-ios')));
    assert.equal(await page.locator('.journey-motion').count(),0);
    assert(await page.locator('body').evaluate(element=>element.classList.contains('motion-paused')));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

    await page.goto('http://localhost:4173/photos/a-world-of-green.html');
    assert(await page.locator('html').evaluate(element=>element.classList.contains('is-ios')));
    assert.equal(await page.locator('.page-transition').evaluate(element=>getComputedStyle(element).display),'none');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.setViewportSize({width:844,height:390});
    await page.goto('http://localhost:4173');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);

    const ipad = await browser.newContext({
      viewport:{width:1024,height:768},hasTouch:true,
      userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    });
    await ipad.addInitScript(() => {
      Object.defineProperty(navigator,'platform',{get:()=> 'MacIntel'});
      Object.defineProperty(navigator,'maxTouchPoints',{get:()=> 5});
    });
    const ipadPage=await ipad.newPage();
    await ipadPage.goto('http://localhost:4173');
    assert(await ipadPage.locator('html').evaluate(element=>element.classList.contains('is-ios')));
    assert.equal(await ipadPage.locator('#motion-toggle').innerText(),'iOS motion safe');
    await ipad.close();
    console.log('PASS: iPhone compatibility mode keeps navigation, scenes, travel and photo pages stable without heavy motion.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
