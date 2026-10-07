const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});try{
 const page=await browser.newPage({reducedMotion:'no-preference'});const base=process.env.SITE_URL||'http://localhost:4173';
 for(const path of ['/','/travel.html']){
  await page.goto(base+path);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://eyesofnydh.netlify.app'+(path==='/'?'/':'/travel.html'));
  for(const width of [320,375,390,414,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   if(path==='/'){
    for(const reduced of ['no-preference','reduce']){
     await page.emulateMedia({reducedMotion:reduced});
     await page.waitForFunction(reduced=>document.querySelector('#motion-toggle').textContent===(reduced==='reduce'?'Reduced motion':'Pause motion'),reduced);
     const fits=await page.locator('#motion-toggle').evaluate(button=>{const box=button.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(button);const text=r.getBoundingClientRect();return text.left>=box.left+2&&text.right<=box.right-2&&text.top>=box.top&&text.bottom<=box.bottom;});
     assert.ok(fits,`motion label outside button ${path} ${width} ${reduced}`);
    }
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${path} ${width}`);
   assert.ok((await page.locator('.wordmark').first().textContent()).startsWith('eyesofnydh'));
   if(path==='/') assert.ok((await page.locator('.deck-hint').boundingBox()).height<=45,`hint too tall ${width}`);
   else{
    const aligned=await page.locator('.journey-home').evaluate(link=>{const [a,b]=[...link.children].map(e=>e.getBoundingClientRect());return Math.abs((a.top+a.height/2)-(b.top+b.height/2))<2;});assert.ok(aligned,`return arrow alignment ${width}`);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path==='/'?'tests/header-fixed-mobile.png':'tests/travel-header-fixed-mobile.png'});
 }
 const robots=await page.request.get(base+'/robots.txt');assert.ok((await robots.text()).includes('https://eyesofnydh.netlify.app/sitemap.xml'));
 const sitemap=await page.request.get(base+'/sitemap.xml');assert.ok(!(await sitemap.text()).includes('https://nydh.netlify.app'));
 console.log('PASS: homepage motion text containment, travel arrow alignment, compact gallery hint, unspaced branding and new-domain canonicals at eight screen widths.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
