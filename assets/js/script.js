'use strict';
const isIOSDevice = /iP(?:ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && /Mobile\//.test(navigator.userAgent));
if (isIOSDevice) document.documentElement.classList.add('is-ios');
const motionAllowed = () => !isIOSDevice && !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-paused');
(() => {
  const nav = document.querySelector('[data-navbar]');
  const toggle = document.querySelector('.nav-open-btn');
  nav.inert = matchMedia('(max-width: 760px)').matches;
  function closeMenu(returnFocus = false) {
    nav.classList.remove('active');
    nav.inert = matchMedia('(max-width: 760px)').matches;
    document.body.classList.remove('menu-open');
    toggle.querySelector('.menu-label').textContent = 'Menu';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    if (matchMedia('(max-width: 760px)').matches) { document.querySelector('#mobile-lens-toggle').click(); return; }
    const open = nav.classList.toggle('active');
    nav.inert = matchMedia('(max-width: 760px)').matches;
    document.body.classList.toggle('menu-open', open);
    toggle.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.addEventListener('focusin', () => { if (!nav.classList.contains('active') && matchMedia('(min-width: 761px)').matches) toggle.click(); });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('active')) closeMenu(true); });
  document.addEventListener('click', e => { if (!e.target.closest('.header, .mobile-lens')) closeMenu(); });
  document.addEventListener('focusin', e => { if (!e.target.closest('.header, .mobile-lens')) closeMenu(); });
  matchMedia('(min-width: 761px)').addEventListener('change', () => closeMenu());
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();

// The focus barrel follows native page scroll; links remain keyboard accessible.
(() => {
  const links = [...document.querySelectorAll('.focus-dial a[href^="#"]')];
  const sections = links.map(link => document.querySelector(link.hash));
  let pending = false;
  function update() {
    pending = false;
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--read-progress', max ? scrollY / max : 0);
    const threshold = Math.max(document.querySelector('.header').getBoundingClientRect().height + 24, (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 22);
    let selected = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= threshold) selected = index; });
    if (max > 0 && scrollY >= max - 4) selected = links.length - 1;
    links.forEach((link, index) => {
      if (index === selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const currentTop = sections[selected].getBoundingClientRect().top;
    const nextTop = sections[selected + 1]?.getBoundingClientRect().top;
    const fraction = nextTop == null ? 0 : Math.max(0, Math.min(1, (threshold-currentTop)/(nextTop-currentTop)));
    const position = selected + fraction;
    const dial = document.querySelector('.focus-dial');
    dial.style.setProperty('--dial-position', motionAllowed() ? position : selected);
    dial.style.setProperty('--tick-offset', `${position*18}px`);
    document.querySelector('#dial-frame').textContent = String(selected+1).padStart(2,'0');
    links.forEach((link,index) => {
      const distance = Math.abs(index-position);
      link.style.setProperty('--dial-scale', Math.max(.78,1-distance*.12));
      link.style.setProperty('--dial-opacity', Math.max(.18,1-distance*.34));
    });
    document.dispatchEvent(new CustomEvent('nydh:section', {detail:{selected,position}}));
  }
  function queue() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  addEventListener('scroll', queue, {passive:true});
  addEventListener('resize', queue);
  document.addEventListener('nydh:motion', queue);
  new ResizeObserver(queue).observe(document.body);
  links.forEach((link,index) => link.addEventListener('keydown', event => {
    const step = {ArrowDown:1,ArrowUp:-1}[event.key];
    if (step) { event.preventDefault(); links[(index+step+links.length)%links.length].focus(); }
  }));
  update();
})();
// The photographic opening follows the page scroll and remains directly selectable.
(() => {
  const scenes = [
    {file: 'f4.png', title: 'A world of green', alt: 'A quiet waterway through green fields and coconut palms beneath a Kerala sky'},
    {file: 'f3.png', title: 'Drawn to the sea', alt: 'An illuminated beachside building beneath a blue evening sky'},
    {file: 'fp2.png', title: 'Together by the ocean', alt: 'Two people standing together on the beach beneath a pink sunset'}
  ];
  const image = document.querySelector('#scene-image');
  const word = document.querySelector('#scene-word');
  const hero = document.querySelector('.cinematic-hero');
  const choices = [...document.querySelectorAll('[data-scene]')];
  const controls = document.querySelector('.scene-selector');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  function select(index) {
    selected = (index + scenes.length) % scenes.length;
    const scene = scenes[selected];
    window.setPhotoPreview(image, window.NYDH_PHOTOS.find(p=>p.file===scene.file), '(max-width: 760px) 100vw, 90vw');
    image.alt = scene.alt;
    word.textContent = scene.title;
    document.querySelector('#scene-title').textContent = `${String(selected + 1).padStart(2, '0')} — ${scene.title}`;
    choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    image.getAnimations().forEach(animation => animation.cancel());
    if (motionAllowed()) image.animate([{clipPath: 'inset(0 100% 0 0)', transform: 'scale(1.08)'}, {clipPath: 'inset(0 0% 0 0)', transform: 'scale(1)'}], {duration: 850, easing: 'cubic-bezier(.2,.65,.3,1)'});
    if (motionAllowed()) word.animate([{opacity:0,filter:'blur(14px)',transform:'translateY(20px)'},{opacity:.28,filter:'blur(0)',transform:'translateY(0)'}],{duration:720,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  choices.forEach((button, index) => button.addEventListener('click', () => select(index)));
  document.querySelector('#scene-prev').addEventListener('click', () => select(selected - 1));
  document.querySelector('#scene-next').addEventListener('click', () => select(selected + 1));
  controls.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    select(selected + (event.key === 'ArrowRight' ? 1 : -1));
    choices[selected].focus();
  });
  let sceneFrame = 0;
  function syncSceneToScroll() {
    cancelAnimationFrame(sceneFrame);
    sceneFrame = requestAnimationFrame(() => {
      if (!motionAllowed() || innerWidth <= 760) return;
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(0,Math.min(.999,(-rect.top+innerHeight*.08)/(rect.height*.72)));
      const index = Math.floor(progress*scenes.length);
      if (index !== selected) select(index);
    });
  }
  addEventListener('scroll',syncSceneToScroll,{passive:true});
  controls.addEventListener('wheel',event=>{if(event.ctrlKey)return;const delta=Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX;if(Math.abs(delta)<8)return;event.preventDefault();select(selected+Math.sign(delta));choices[selected].focus({preventScroll:true});},{passive:false});
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) image.getAnimations().forEach(animation => animation.cancel()); });
})();

// A quiet view keeps the image and filmstrip, with an always-visible way back.
(() => {
  const hero = document.querySelector('.cinematic-hero');
  const toggle = document.querySelector('#quiet-toggle');
  const heading = hero.querySelector('.hero-heading');
  function setQuiet(quiet) {
    hero.classList.toggle('quiet-view', quiet);
    toggle.setAttribute('aria-pressed', String(quiet));
    toggle.textContent = quiet ? '◉ Bring back the story' : '◉ Just the photograph';
    heading.inert = quiet;
    if (quiet) heading.setAttribute('aria-hidden', 'true');
    else heading.removeAttribute('aria-hidden');
  }
  toggle.addEventListener('click', () => setQuiet(toggle.getAttribute('aria-pressed') !== 'true'));
  hero.addEventListener('keydown', event => { if (event.key === 'Escape') setQuiet(false); });
})();

// Respect system reduced motion automatically; iOS uses lighter decorative effects.
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  function refresh() {
    if (!motionAllowed()) document.getAnimations().forEach(animation => animation.cancel());
    document.dispatchEvent(new Event('nydh:motion'));
  }
  preference.addEventListener('change', refresh);
  refresh();

  // Finite entrance and section reveals, no permanent hidden initial states.
  if (motionAllowed()) {
    document.querySelectorAll('.title-line > *').forEach((line, index) => line.animate(
      [{transform:'translateY(110%) rotate(3deg)',opacity:0},{transform:'translateY(0) rotate(0)',opacity:1}],
      {duration:1100,delay:120+index*150,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    observer.unobserve(entry.target);
    if (motionAllowed()) entry.target.animate(
      [{opacity:0,transform:'translateY(35px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:800,easing:'cubic-bezier(.16,1,.3,1)'});
  }), {threshold:.12});
  document.querySelectorAll('.section-heading,.service-grid article,.journey-preview-visual,.about-copy,.portrait-wrap,.contact').forEach(el => observer.observe(el));
  const grid = document.querySelector('#photo-grid');
  const photoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    photoObserver.unobserve(entry.target);
    if (motionAllowed()) entry.target.animate(
      [{opacity:.15, transform:'translateY(30px)', clipPath:'inset(8% 0 0 0)'}, {opacity:1, transform:'translateY(0)', clipPath:'inset(0 0 0 0)'}],
      {duration:700,delay:Number(entry.target.dataset.revealOrder || 0)*65,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  }), {threshold:.1});
  new MutationObserver(records => records.forEach(record => {
    record.addedNodes.forEach(node => { if (node.nodeType === 1) photoObserver.observe(node); });
    record.removedNodes.forEach(node => { if (node.nodeType === 1) photoObserver.unobserve(node); });
  })).observe(grid, {childList:true});


  // A soft light follows the pointer on glass surfaces; native cursors stay intact.
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('.cinematic-hero');
  let frame;
  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches || !motionAllowed()) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--light-x', `${event.clientX-r.left}px`);
      hero.style.setProperty('--light-y', `${event.clientY-r.top}px`);
    });
  });
  hero.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); hero.style.removeProperty('--light-x'); hero.style.removeProperty('--light-y'); });
})();

// Scroll-linked depth: finite, clamped movement using the native document scroll.
(() => {
  const hero = document.querySelector('.cinematic-hero');
  const frame = hero.querySelector('.hero-frame');
  const ribbon = document.querySelector('.frame-ribbon');
  let pending = false;
  function draw() {
    const top = hero.getBoundingClientRect().top;
    const depth = motionAllowed() && innerWidth > 760 ? Math.min(65, Math.max(0, -top * .15)) : 0;
    if (isIOSDevice) {
      frame.style.removeProperty('translate');
      frame.style.removeProperty('scale');
    } else {
      frame.style.translate = `0 ${depth}px`;
      frame.style.scale = depth ? '1.08' : '1';
    }
    const r = ribbon.getBoundingClientRect();
    const progress = motionAllowed() ? Math.max(-1,Math.min(1,(innerHeight*.5-r.top)/innerHeight)) : 0;
    ribbon.querySelectorAll('b').forEach((star,index) => { star.style.rotate = `${progress * (index%2 ? -100 : 100)}deg`; });
    pending = false;
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(draw); } }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  document.addEventListener('nydh:motion',schedule);
  draw();
})();

// Mobile navigation: the lens opens a fan of sections and rotates with the page.
(() => {
  const root = document.querySelector('#mobile-lens');
  const toggle = document.querySelector('#mobile-lens-toggle');
  const options = document.querySelector('#mobile-lens-options');
  const topToggle = document.querySelector('.nav-open-btn');
  const links = [...options.querySelectorAll('a')];
  const mobile = matchMedia('(max-width: 760px)');
  function setOpen(open, restoreFocus = false) {
    if(open)root.classList.remove('is-minimized');
    root.classList.toggle('is-open',open);
    document.body.classList.toggle('lens-menu-open',open&&mobile.matches);
    options.inert = !open;
    options.setAttribute('aria-hidden',String(!open));
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open ? 'Close lens menu' : 'Open lens menu');
    toggle.querySelector('.lens-button-label').textContent = open ? 'Close' : 'Menu';
    if(mobile.matches){
      topToggle.setAttribute('aria-expanded',String(open));
      topToggle.setAttribute('aria-label',open ? 'Close menu' : 'Open menu');
      topToggle.querySelector('.menu-label').textContent=open ? 'Close' : 'Menu';
    }
    if(restoreFocus)topToggle.focus({preventScroll:true});
  }
  function syncMode(){
    const focusInside=root.contains(document.activeElement);
    setOpen(false);
    root.hidden=!mobile.matches;
    topToggle.setAttribute('aria-controls',mobile.matches?'mobile-lens-options':'navigation');
    if(!mobile.matches&&focusInside)topToggle.focus({preventScroll:true});
  }
  function syncSection(selected,position=selected){
    root.style.setProperty('--lens-rotation',`${(motionAllowed()?position:selected)*(360/links.length)}deg`);
    root.classList.toggle('is-at-contact',selected===links.length-1);
    links.forEach((link,index)=>{
      if(index===selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
    });
    document.querySelector('#mobile-lens-caption').textContent=links[selected]?.textContent.replace(/^\s*\d+\s*/,'').trim() || 'Home';
  }
  toggle.addEventListener('click',()=>{
    const open = !root.classList.contains('is-open');
    setOpen(open,!open);
  });
  links.forEach((link,index)=>{
    link.addEventListener('click',event=>{
      event.preventDefault();
      syncSection(index);setOpen(false);root.classList.add('is-minimized');
      const section=document.querySelector(link.hash);
      if(section){history.pushState(null,'',link.hash);section.scrollIntoView({block:'start',behavior:motionAllowed()?'smooth':'instant'});section.tabIndex=-1;section.focus({preventScroll:true});}
    });
    link.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();links[(index+(e.key==='ArrowRight'?1:-1)+links.length)%links.length].focus();
      }
    });
  });
  toggle.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp'||(e.key==='Tab'&&!e.shiftKey&&root.classList.contains('is-open'))){
      e.preventDefault();setOpen(true);(links.find(link=>link.hasAttribute('aria-current'))||links[0]).focus();
    }
  });
  topToggle.addEventListener('keydown',e=>{
    if(mobile.matches&&e.key==='ArrowDown'){
      e.preventDefault();setOpen(true);(links.find(link=>link.hasAttribute('aria-current'))||links[0]).focus();
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&root.classList.contains('is-open')){e.preventDefault();setOpen(false,true);}
  });
  document.addEventListener('click',e=>{if(!root.contains(e.target)&&!topToggle.contains(e.target))setOpen(false);});
  document.addEventListener('focusin',e=>{if(!root.contains(e.target)&&!topToggle.contains(e.target))setOpen(false);});
  document.addEventListener('nydh:section',e=>syncSection(e.detail.selected,e.detail.position));
  addEventListener('scroll',()=>{
    if(!root.classList.contains('is-open'))root.classList.toggle('is-minimized',scrollY>120);
  },{passive:true});
  mobile.addEventListener('change',syncMode);
  syncMode();
  const initial=[...document.querySelectorAll('.focus-dial a')].findIndex(link=>link.hasAttribute('aria-current'));
  syncSection(Math.max(0,initial));
  root.classList.toggle('is-minimized',scrollY>120);
})();
