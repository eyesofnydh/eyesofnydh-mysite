const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.SITE_URL||'http://localhost:4173';await page.goto(base);
 for(const width of [320,375,390,414,768,1024,1280,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.locator('.nav-open-btn').click();
  await page.locator(width<=760?'#mobile-lens-options a[href="#journey"]':'#navigation a[href="#journey"]').click();
  assert.ok(await page.locator('#journey').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  const links=await page.locator('.header-inner > a,.header-inner > button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  for(let i=0;i<links.length;i++)for(let j=i+1;j<links.length;j++){const a=links[i],b=links[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`header overlap ${width}`);}
  for(const id of ['home','gallery','featured','about','contact'])assert.equal(await page.locator(`#${id}`).count(),1);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#journey').evaluate(e=>e.scrollIntoView({block:'start'}));await page.locator('#journey img').evaluateAll(async imgs=>{for(const i of imgs)i.loading='eager';await Promise.all(imgs.map(i=>i.decode()));});await page.screenshot({path:'tests/journey-home-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.locator('#journey').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:'tests/journey-home-desktop.png'});
 await page.locator('.journey-preview-cta').click();await page.locator('.journey-home').waitFor();assert.equal(new URL(page.url()).pathname,'/travel.html');
 await page.goto(base);await page.locator('.journey-preview-chapters a').first().click();await page.waitForFunction(()=>document.querySelector('#story-waterways')?.open);
 assert.deepEqual(errors,[]);console.log('PASS: homepage Journey section/menu link at nine widths, non-overlapping header, preserved original sections, journal and story navigation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
