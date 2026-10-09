const assert=require('node:assert/strict');
const {webkit,chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_URL||'http://localhost:4173';
(async()=>{
 for(const engine of [webkit,chromium]){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const width of [320,375,390,430,844]){
    await page.setViewportSize({width,height:width===844?390:844});
    for(const route of ['index.html','travel.html','photos/a-world-of-green.html']){
     await page.goto(`${base}/${route}`);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${engine.name()} ${route} overflow at ${width}`);
     assert.equal(await page.locator('#motion-toggle,.journey-motion').count(),0);
     assert.equal(await page.evaluate(()=>/[↗✳♡♥▱▥▦]/u.test(document.body.textContent)),false,'UI icons must not depend on emoji fonts');
     assert(await page.locator('.brand-dot svg').count()>0);
     if(width<=760)assert.equal(await page.locator('.header').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 27, 48)','Header must be opaque');
     if(route==='index.html'){
      await page.locator('.nav-open-btn').click();
      const options=width<=760?'#mobile-lens-options':'#navigation';
      for(const link of await page.locator(`${options} a`).all()){
       await link.scrollIntoViewIfNeeded();const r=await link.boundingBox();
       assert(r&&r.x>=0&&r.x+r.width<=width&&r.y>=0&&r.y+r.height<=page.viewportSize().height,'Menu bounds');
      }
      await page.locator(`${options} a[href="#gallery"]`).click();
      for(const mode of ['dna','stack','shelf','grid']){
       await page.locator(`[data-layout=${mode}]`).click();
       assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Gallery overflow');
      }
     }
    }
   }
   await page.setViewportSize({width:390,height:844});await page.goto(base);
   await page.locator('[data-layout=dna]').click();
   await page.locator('#deck-stage').scrollIntoViewIfNeeded();
   assert(await page.locator('.deck-card[aria-pressed=true]').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)>0),'iOS carousel must animate between frames');
   const stageBox=await page.locator('#deck-stage').boundingBox();
   const nativeBefore=await page.locator('#deck-current').innerText();
   await page.mouse.move(230,stageBox.y+stageBox.height/2);
   await page.mouse.down();await page.mouse.move(170,stageBox.y+stageBox.height/2,{steps:8});await page.mouse.up();
   assert.notEqual(await page.locator('#deck-current').innerText(),nativeBefore,'Native captured drag must advance');
   assert.equal(await page.locator('#photo-dialog').evaluate(d=>d.open),false,'Native drag must not trigger a photo click');
   await page.waitForTimeout(400);
   const before=await page.locator('#deck-current').innerText();
   // Touch pointer events exercise the same gesture path in both browser engines.
   await page.locator('#deck-stage').evaluate(stage=>{
    const send=(type,x,y)=>stage.dispatchEvent(new PointerEvent(type,{pointerId:8,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true,cancelable:true}));
    // Synthetic pointers cannot obtain native capture; preserve dispatch for the test.
    stage.setPointerCapture=()=>{};stage.hasPointerCapture=()=>false;
    send('pointerdown',230,200);send('pointermove',185,202);send('pointerup',185,202);
   });
   assert.notEqual(await page.locator('#deck-current').innerText(),before,'Short swipe must advance');
   assert.equal(await page.locator('#photo-dialog').evaluate(d=>d.open),false,'Swipe must not open viewer');
   const selected=await page.locator('#deck-current').innerText();
   await page.locator('#deck-stage').evaluate(stage=>{
    const send=(type,x,y)=>stage.dispatchEvent(new PointerEvent(type,{pointerId:9,isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true}));
    send('pointerdown',200,200);send('pointermove',202,250);send('pointerup',202,250);
   });
   assert.equal(await page.locator('#deck-current').innerText(),selected,'Vertical gesture must preserve photograph');
   await page.waitForTimeout(400);
   await page.locator('#deck-open').click();assert(await page.locator('#photo-dialog').evaluate(d=>d.open));
   await page.locator('.dialog-close').click();
   await page.locator('#deck-save').click();assert(await page.locator('#deck-save svg').count());
   await page.locator('#deck-autoplay').click();
   assert.equal(await page.locator('#deck-autoplay').getAttribute('aria-pressed'),'true');
   await page.locator('#deck-autoplay').evaluate(e=>e.blur());
   await page.mouse.move(0,0);
   const autoBefore=await page.locator('#deck-current').innerText();
   await page.waitForFunction(before=>document.querySelector('#deck-current').textContent!==before,autoBefore,{timeout:6000});
   await page.locator('#deck-autoplay').click();
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.evaluate(()=>motionAllowed()),false);
   assert.equal(await page.locator('.deck-card[aria-pressed=true]').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)),0,'Reduced motion must disable carousel transitions');
   await page.screenshot({path:`tests/safari-${engine.name()}-gallery.png`});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${engine.name()}: iPhone mode, five widths, menu bounds, four gallery layouts, SVG icons, DNA swiping/autoplay, viewer, save and reduced motion`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1)});
