'use strict';
(() => {
  const section = document.querySelector('#media-trail');
  const layer = section?.querySelector('.cursor-trail');
  if (!section || !layer) return;
  const files = ['f4.png','fp2.png','f3.png','t1.png','rp8.png','ip7.png','f5.png','rp3.png','ip2.png','t4.png'];
  let last = null, cursor = 0;
  function spawn(x,y) {
    if (!motionAllowed()) return;
    const file=files[cursor++%files.length],photo=window.NYDH_PHOTOS?.find(item=>item.file===file);
    const image=document.createElement('img');image.className='trail-sticker';image.src=`./assets/images/previews/${file.replace('.png','')}-320.jpg`;image.alt='';image.width=photo?.width||320;image.height=photo?.height||240;
    const width=Math.min(150,Math.max(92,innerWidth*.1));image.style.setProperty('--trail-x',`${x-width*.5}px`);image.style.setProperty('--trail-y',`${y-70}px`);image.style.setProperty('--trail-rotate',`${(Math.random()*18-9).toFixed(1)}deg`);image.style.setProperty('--trail-drift',`${(Math.random()*34-17).toFixed(1)}px`);
    layer.append(image);image.addEventListener('animationend',()=>image.remove(),{once:true});
    while(layer.children.length>10)layer.firstElementChild.remove();
  }
  section.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    const rect=section.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top};
    if(!last){last=point;spawn(point.x,point.y);return;}
    const dx=point.x-last.x,dy=point.y-last.y,distance=Math.hypot(dx,dy);
    if(distance<72)return;
    const steps=Math.min(3,Math.floor(distance/72));
    for(let i=1;i<=steps;i++)spawn(last.x+dx*i/steps,last.y+dy*i/steps);
    last=point;
  });
  section.addEventListener('pointerleave',()=>{last=null;});
  document.addEventListener('nydh:motion',()=>{if(!motionAllowed())layer.replaceChildren();});
})();
