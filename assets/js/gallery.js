'use strict';
(() => {
  const photos = window.NYDH_PHOTOS;
  const grid = document.querySelector('#photo-grid');
  const search = document.querySelector('#photo-search');
  const savedButton = document.querySelector('#saved-filter');
  const dialog = document.querySelector('#photo-dialog');
  const filmstrip = document.querySelector('#dialog-filmstrip');
  const more = document.querySelector('#load-more');
  const pageSize = 12;
  let limit = pageSize, category = 'All', savedOnly = false;
  let active = 0, collection = [], opener, lastDiscovery = -1;
  let saved = new Set();
  const deck = document.querySelector('#archive-deck');
  const stage = document.querySelector('#deck-stage');
  const range = document.querySelector('#deck-range');
  let mode = 'dna', deckIndex = 3, deckItems = [], deckFile = null;
  let autoplay = false, autoplayTimer = 0;
  try { const value = localStorage.getItem('nydh-gallery-mode'); if (['dna','stack','shelf','grid'].includes(value)) mode = value; } catch {}

  try {
    const stored = JSON.parse(localStorage.getItem('nydh-saved') || '[]');
    if (Array.isArray(stored)) saved = new Set(stored.filter(file => photos.some(p => p.file === file)));
  } catch {}
  function source(photo) { return photo.src || `./assets/images/${photo.file}`; }
  function preview(photo, size = 800) { return `./assets/images/previews/${photo.file.replace('.png','')}-${size}.jpg`; }
  function slug(photo) { return photo.title.toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function syncSave(button, photo) {
    button.disabled = !photo;
    const isSaved = photo && saved.has(photo.file);
    button.textContent = isSaved ? '♥ Saved' : '♡ Save';
    button.setAttribute('aria-pressed', String(!!isSaved));
    button.setAttribute('aria-label', photo ? `${isSaved ? 'Unsave' : 'Save'} ${photo.title}` : 'Save photograph');
  }
  function toggleSave(photo) {
    if (!photo) return;
    const removing = saved.has(photo.file);
    removing ? saved.delete(photo.file) : saved.add(photo.file);
    window.nydhTrack?.('Photo saved', { photo: slug(photo), action: removing ? 'removed' : 'saved' });
    let stored = true;
    try { localStorage.setItem('nydh-saved', JSON.stringify([...saved])); } catch { stored = false; }
    if (savedOnly) render();
    else {
      const items = matches();
      grid.querySelectorAll('.save-photo').forEach((button,index)=>syncSave(button,items[index]));
      syncSave(document.querySelector('#deck-save'), deckItems[deckIndex]);
      document.querySelector('#saved-count').textContent = saved.size;
    }
    syncSave(document.querySelector('#photo-save'), collection[active]);
    document.querySelector('#save-status').textContent = stored ? '' : 'Browser storage is unavailable; favorites are saved for this visit only.';
  }
  function resetFilters() {
    search.value = ''; category = 'All'; savedOnly = false; limit = pageSize;
    savedButton.setAttribute('aria-pressed','false');
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='All')));
    render(); document.querySelector('.archive-tools').open = true; search.focus();
  }
  function updateStatus() {
    const total = deckItems.length;
    const labels = {dna:'DNA carousel',stack:'Journal',shelf:'Record shelf'};
    document.querySelector('#gallery-status').textContent = total ? (mode === 'grid' ? `${total} photographs · ${Math.min(limit,total)} on view` : `${total} photographs · ${labels[mode]} · frame ${deckIndex+1} of ${total}`) : 'No photographs match. Try another search or turn off a filter.';
  }
  function showPhoto(items, index, trigger) {
    if (!items.length) return;
    const changed = collection !== items;
    collection = items; active = (index + items.length) % items.length;
    const photo = items[active];
    window.nydhTrack?.('Gallery open', { photo: slug(photo), category: photo.category });
    const image = document.querySelector('#dialog-image');
    syncSave(document.querySelector('#photo-save'), photo);
    document.querySelector('#share-status').textContent = '';
    document.querySelector('#share-link').hidden = true;
    image.src = source(photo); image.alt = photo.alt || photo.title;
    document.querySelector('#photo-caption').textContent = photo.title;
    document.querySelector('#photo-position').textContent = `FRAME ${String(active + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    document.querySelector('.dialog-controls').hidden = items.length < 2;
    filmstrip.hidden = items.length < 2;
    if (changed || !dialog.open) {
      filmstrip.replaceChildren();
      if (items.length > 1) items.forEach((item, i) => {
        const button = document.createElement('button');
        button.className = 'filmstrip-thumb'; button.setAttribute('aria-label', `View ${item.title}`);
        const thumb = document.createElement('img'); thumb.src = preview(item, 320); thumb.alt = ''; thumb.width = 64; thumb.height = 48; thumb.loading = 'lazy'; thumb.decoding = 'async';
        button.append(thumb);
        button.addEventListener('click', () => showPhoto(items, i));
        filmstrip.append(button);
      });
    }
    [...filmstrip.children].forEach((button,i) => button.setAttribute('aria-pressed', String(i === active)));
    if (!dialog.open) { opener = trigger; dialog.showModal(); document.body.classList.add('photo-open'); }
    const selected = filmstrip.children[active];
    if (selected) filmstrip.scrollTo({left: selected.offsetLeft - filmstrip.offsetLeft - filmstrip.clientWidth / 2 + selected.offsetWidth / 2, behavior:'instant'});
    image.getAnimations().forEach(a => a.cancel());
    if (motionAllowed()) image.animate([{opacity:.25,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'ease-out'});
  }
  function matches() {
    const query = search.value.trim().toLowerCase();
    return photos.filter(p => (category === 'All' || p.category === category) && (!savedOnly || saved.has(p.file)) && `${p.title} ${p.alt} ${p.category} ${p.category === 'Coast' ? 'beach ocean' : ''}`.toLowerCase().includes(query));
  }
  function makeCard(photo, index, items) {
    const card = document.createElement('article'); card.className = 'photo-card'; card.dataset.revealOrder = index % 3;
    const view = document.createElement('button'); view.className = 'photo-view'; view.setAttribute('aria-label', `View ${photo.title}`);
    const img = document.createElement('img'); window.setPhotoPreview(img, photo, '(max-width: 760px) 100vw, 33vw'); img.alt = photo.alt; img.loading = 'lazy'; img.decoding = 'async'; img.width = photo.width; img.height = photo.height;
    view.append(img); view.addEventListener('click', () => showPhoto(items, index, view));
    const info = document.createElement('div'); info.className = 'photo-info';
    const title = document.createElement('h3');
    const permalink = document.createElement('a'); permalink.href = `./photos/${slug(photo)}.html`; permalink.textContent = photo.title;
    title.append(permalink);
    const tag = document.createElement('p'); tag.textContent = `${String(photos.indexOf(photo)+1).padStart(2,'0')} / ${photo.category}`;
    const save = document.createElement('button'); save.className = 'save-photo';
    syncSave(save, photo);
    save.addEventListener('click', () => {
      toggleSave(photo);
      if (savedOnly) { document.querySelector('.archive-tools').open = true; savedButton.focus(); }
      else [...grid.querySelectorAll('.save-photo')][index]?.focus({preventScroll:true});
    });
    info.append(tag,title,save); card.append(view,info); return card;
  }
  function render(append = false) {
    const items = matches();
    const count = Math.min(limit,items.length);
    const start = append ? grid.querySelectorAll('.photo-card').length : 0;
    if (!append) grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    items.slice(start,count).forEach((photo,index) => fragment.append(makeCard(photo,start+index,items)));
    grid.append(fragment);
    more.hidden = count >= items.length;
    document.querySelector('#collection-progress').textContent = items.length ? `${count} of ${items.length} frames` : '';
    document.querySelector('#saved-count').textContent = saved.size;
    if (!items.length) {
      const reset = document.createElement('button'); reset.className = 'filter-btn gallery-reset'; reset.textContent = 'Clear search & filters ↗';
      reset.addEventListener('click', resetFilters);
      grid.append(reset);
    }
    buildDeck(items);
    if (append) grid.querySelectorAll('.photo-view')[start]?.focus({preventScroll:true});
  }
  more.addEventListener('click', () => { limit += pageSize; render(true); });
  search.addEventListener('input', () => { limit = pageSize; render(); });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter; limit = pageSize;
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); render();
  }));
  savedButton.addEventListener('click', () => { savedOnly = !savedOnly; limit = pageSize; savedButton.setAttribute('aria-pressed',String(savedOnly)); render(); });
  document.querySelector('#surprise-photo').addEventListener('click', e => {
    const choices = photos.map((_,i)=>i).filter(i=>i!==lastDiscovery);
    lastDiscovery = choices[Math.floor(Math.random()*choices.length)]; showPhoto(photos,lastDiscovery,e.currentTarget);
  });
  document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click', e => {
    if(e.target!==dialog) return;
    const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close();
  });
  dialog.addEventListener('close',()=>{ document.body.classList.remove('photo-open'); (opener?.isConnected && !opener.closest('[hidden]') ? opener : document.querySelector(`[data-layout="${mode}"]`))?.focus({preventScroll:true}); });
  document.querySelector('#photo-prev').addEventListener('click',()=>showPhoto(collection,active-1));
  document.querySelector('#photo-next').addEventListener('click',()=>showPhoto(collection,active+1));
  dialog.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showPhoto(collection,active+(e.key==='ArrowLeft'?-1:1));}
  });
  let touchStart;
  const viewerImage = document.querySelector('#dialog-image');
  viewerImage.addEventListener('touchstart',e=>{touchStart=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
  viewerImage.addEventListener('touchcancel',()=>{touchStart=null;});
  viewerImage.addEventListener('touchend',e=>{
    if(!touchStart||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)showPhoto(collection,active+(dx<0?1:-1));
  },{passive:true});
  document.querySelectorAll('.feature-card').forEach(card=>{
    const img=card.querySelector('img'),title=card.querySelector('h3')?.textContent.trim();
    if(!img||!title)return;
    card.querySelectorAll('h3 a,.card-btn').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();showPhoto([photos.find(p=>p.file===img.dataset.original)],0,link);}));
  });

  function applyMode() {
    grid.hidden = mode !== 'grid';
    deck.hidden = mode === 'grid';
    document.querySelector('.gallery-pagination').hidden = mode !== 'grid';
    deck.dataset.mode = mode;
    stage.setAttribute('aria-label', mode === 'dna' ? 'DNA-inspired 3D photo carousel. Drag, swipe, scroll, or use the arrow keys to browse.' : `${mode === 'shelf' ? 'Record shelf' : 'Photo stack'}. Drag sideways or use the previous and next buttons.`);

    document.querySelector('#archive-count').textContent = `${deckItems.length} frames`;
    document.querySelectorAll('[data-layout]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.layout===mode)));
    paintDeck(); updateStatus();
  }
  function paintDeck(position = deckIndex) {
    const count = deckItems.length;
    const width = stage.clientWidth;
    const cardWidth = mode === 'dna' ? Math.min(320, width * (width < 600 ? .58 : .42)) : Math.min(340, width * .62);
    const spread = mode === 'shelf' ? Math.min(100,width*.15) : Math.min(58,width*.078);
    stage.style.setProperty('--deck-card-width',`${cardWidth}px`);
    [...stage.children].forEach((card,index) => {
      let offset = index - position;
      if (count > 2) offset = ((offset + count/2) % count + count) % count - count/2;
      const distance = Math.abs(offset), direction = Math.sign(offset);
      const visible = distance <= Math.min(mode === 'shelf' ? 6 : 5,Math.floor(count/2));
      const selected = index === deckIndex;
      let x, y, z, rotateY, rotateZ, scale = 1, opacity = visible ? 1 : 0, blur = 0;
      if (mode === 'dna') {
        const helixSpread = Math.min(148,width*.17), phase = offset*1.14;
        x = direction * (Math.min(distance,1)*cardWidth*.58 + Math.max(0,distance-1)*helixSpread);
        y = Math.sin(phase) * Math.min(54,width*.075);
        z = (Math.cos(phase)-1)*88 - distance*32;
        rotateY = Math.max(-42,Math.min(42,-offset*13));
        rotateZ = -Math.sin(phase)*4.5;
        scale = selected ? 1.06 : Math.max(.76,1-distance*.055);
        opacity = visible ? Math.max(.2,1-distance*.14) : 0;
        blur = selected ? 0 : Math.min(4,distance*.85);
      } else {
        x = direction * (Math.min(distance,1)*cardWidth*(mode === 'shelf' ? .85 : .4) + Math.max(0,distance-1)*spread);
        y = distance*7;
        z = mode === 'shelf' ? -distance*45 : -distance*85;
        rotateY = mode === 'shelf' ? -direction*Math.min(distance*55,55) : -direction*Math.min(distance*10,24);
        rotateZ = direction*Math.min(distance,3);
      }
      card.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      card.style.zIndex = String(100-Math.round(distance*10));
      card.style.opacity = String(opacity);
      card.style.filter = mode === 'dna' ? `blur(${blur}px) drop-shadow(${-direction*2}px 0 0 rgba(255,58,116,${selected?0:.22})) drop-shadow(${direction*2}px 0 0 rgba(40,238,255,${selected?0:.2}))` : '';
      card.style.visibility = visible ? 'visible' : 'hidden';
      card.style.pointerEvents = visible ? 'auto' : 'none';
      card.tabIndex = selected ? 0 : -1;
      card.setAttribute('aria-hidden',String(!visible));
      card.setAttribute('aria-pressed',String(selected));
      card.setAttribute('aria-label',`${selected ? 'Open' : 'Select'} ${deckItems[index].title}`);
      const img = card.querySelector('img');
      if (mode !== 'grid' && visible && !img.getAttribute('src')) img.src = preview(deckItems[index]);
    });
  }
  function updateDeckCaption() {
    const photo = deckItems[deckIndex];
    syncSave(document.querySelector('#deck-save'), photo);
    updateStatus();
    document.querySelector('#deck-title').textContent = photo?.title || 'Nothing here yet.';
    document.querySelector('#deck-category').textContent = photo ? `${photo.category.toUpperCase()} / THE PERSONAL ARCHIVE` : '';
    document.querySelector('#deck-current').textContent = photo ? String(deckIndex+1).padStart(2,'0') : '00';
    document.querySelector('#deck-total').textContent = String(deckItems.length).padStart(2,'0');
    range.max = Math.max(0,deckItems.length-1); range.value = deckIndex;
    range.setAttribute('aria-valuetext',photo ? `${deckIndex+1} of ${deckItems.length}: ${photo.title}` : 'No photographs');
  }
  function selectDeck(index, focus = false) {
    if (!deckItems.length) return;
    deckIndex = ((index % deckItems.length) + deckItems.length) % deckItems.length;
    deckFile = deckItems[deckIndex].file;
    paintDeck(); updateDeckCaption();
    restartAutoplay();
    if (focus) stage.children[deckIndex]?.focus({preventScroll:true});
  }
  function buildDeck(items) {
    deckItems = items;
    const retained = items.findIndex(photo=>photo.file===deckFile);
    deckIndex = retained >= 0 ? retained : Math.min(deckIndex, Math.max(0,items.length-1));
    deckFile = items[deckIndex]?.file || null;
    stage.replaceChildren();
    items.forEach((photo,index)=>{
      const card = document.createElement('button'); card.className='deck-card'; card.type='button';
      const top = document.createElement('span'); top.className='deck-card-top'; top.textContent=`EYESOFNYDH — ${String(index+1).padStart(2,'0')}`;
      const frame = document.createElement('span'); frame.className='deck-card-photo';
      const img = document.createElement('img'); img.alt=photo.alt; img.width=photo.width; img.height=photo.height; img.decoding='async'; img.draggable=false; frame.append(img);
      const label = document.createElement('span'); label.className='deck-card-title'; label.textContent=photo.title;
      card.append(top,frame,label);
      card.addEventListener('click',()=>{ if(index===deckIndex)showPhoto(deckItems,index,card);else selectDeck(index); });
      stage.append(card);
    });
    stage.hidden = !items.length;
    document.querySelector('#deck-empty').hidden = !!items.length;
    deck.querySelectorAll('.deck-caption,.deck-controls,.deck-scrubber,.deck-hint').forEach(element => element.hidden = !items.length);
    document.querySelectorAll('#deck-prev,#deck-next').forEach(button=>button.disabled=items.length<2);
    range.disabled=items.length<2; document.querySelector('#deck-open').disabled=!items.length;
    updateDeckCaption(); applyMode();
  }
  document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.layout;
    if (mode === 'grid') document.querySelector('.archive-tools').open = true;
    try { localStorage.setItem('nydh-gallery-mode',mode); } catch {}
    applyMode();
  }));
  const autoplayButton = document.querySelector('#deck-autoplay');
  function restartAutoplay() {
    clearInterval(autoplayTimer); autoplayTimer = 0;
    if (!autoplay) return;
    autoplayTimer = setInterval(() => {
      if (mode === 'dna' && deckItems.length > 1 && motionAllowed() && !document.hidden && !stage.matches(':hover,:focus-within') && !stage.classList.contains('dragging')) selectDeck(deckIndex+1);
    }, 3200);
  }
  autoplayButton.addEventListener('click',()=>{
    autoplay = !autoplay;
    autoplayButton.setAttribute('aria-pressed',String(autoplay));
    autoplayButton.setAttribute('aria-label',autoplay?'Pause carousel autoplay':'Start carousel autoplay');
    autoplayButton.textContent = autoplay ? 'Ⅱ Auto' : '▶ Auto';
    restartAutoplay();
  });
  document.querySelector('#deck-prev').addEventListener('click',()=>selectDeck(deckIndex-1));
  document.querySelector('#deck-next').addEventListener('click',()=>selectDeck(deckIndex+1));
  document.querySelector('#deck-open').addEventListener('click',e=>{ if(deckItems.length)showPhoto(deckItems,deckIndex,e.currentTarget); });
  range.addEventListener('input',()=>selectDeck(Number(range.value)));
  stage.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();
    selectDeck(e.key==='Home'?0:e.key==='End'?deckItems.length-1:deckIndex+(e.key==='ArrowRight'?1:-1),true);
  });
  let gesture=null, suppressClickUntil=0;
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary||deckItems.length<2)return;
    gesture={x:e.clientX,y:e.clientY,lastX:e.clientX,lastTime:performance.now(),velocity:0,id:e.pointerId,dragging:false};
  });
  stage.addEventListener('pointermove',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(!gesture.dragging&&Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){
      gesture.dragging=true;stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');
    }
    if(gesture.dragging){
      e.preventDefault();
      const now=performance.now(),elapsed=Math.max(1,now-gesture.lastTime);
      gesture.velocity=(e.clientX-gesture.lastX)/elapsed;gesture.lastX=e.clientX;gesture.lastTime=now;
      paintDeck(deckIndex-dx/(mode==='dna'?105:130));
    }
  });
  function finishGesture(e,cancel=false){
    if(!gesture||e.pointerId!==gesture.id)return;
    const wasDragging=gesture.dragging,dx=e.clientX-gesture.x,velocity=gesture.velocity;
    gesture=null;stage.classList.remove('dragging');
    if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
    if(wasDragging){
      suppressClickUntil=performance.now()+350;
      const step=mode==='dna'?105:130, momentum=cancel?0:velocity*170;
      selectDeck(cancel?deckIndex:deckIndex+Math.round((-dx-momentum)/step));
    }
  }
  stage.addEventListener('pointerup',e=>finishGesture(e));
  stage.addEventListener('pointercancel',e=>finishGesture(e,true));
  stage.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();}},true);
  let lastWheel=0;
  stage.addEventListener('wheel',e=>{
    if(e.ctrlKey||deckItems.length<2)return;
    if(mode!=='dna'&&!e.shiftKey&&Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
    e.preventDefault();
    if(performance.now()-lastWheel<350)return;
    const delta=mode==='dna'?(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY):(e.shiftKey?e.deltaY:e.deltaX);
    if(Math.abs(delta)<8)return;
    selectDeck(deckIndex+Math.sign(delta));lastWheel=performance.now();
  },{passive:false});
  new ResizeObserver(()=>paintDeck()).observe(stage);
  document.addEventListener('nydh:open-story',event=>{
    const files=event.detail?.files;
    if(!Array.isArray(files))return;
    const items=files.map(file=>photos.find(photo=>photo.file===file)).filter(Boolean);
    if(items.length)showPhoto(items,0,event.detail.trigger);
  });
  document.querySelectorAll('.memory-print').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    const index=photos.findIndex(photo=>photo.file===button.dataset.photo);
    if(index>=0)showPhoto(photos,index,button);
  }));

  document.querySelector('.archive-tools').open = mode === 'grid';
  document.querySelector('#deck-reset').addEventListener('click', resetFilters);
  document.querySelector('#deck-save').addEventListener('click', () => {
    toggleSave(deckItems[deckIndex]);
    if (!deckItems.length) document.querySelector('#deck-reset').focus({preventScroll:true});
  });
  document.querySelector('#photo-save').addEventListener('click', () => toggleSave(collection[active]));
  document.querySelector('#photo-share').addEventListener('click', async () => {
    const photo = collection[active], url = new URL(`./photos/${slug(photo)}.html`, location.href);
    const status = document.querySelector('#share-status');
    try {
      if (navigator.share) { await navigator.share({title: photo.title, url: url.href}); return; }
      await navigator.clipboard.writeText(url.href); status.textContent = 'Photo link copied.';
    } catch (error) {
      if (error.name === 'AbortError') return;
      const field = document.querySelector('#share-link'); field.hidden = false; field.value = url.href; field.focus(); field.select();
      status.textContent = 'Copy this link to share the photograph.';
    }
  });
  render();
  const shared = photos.findIndex(p=>p.file===new URL(location.href).searchParams.get('photo'));
  if (shared >= 0) showPhoto(photos, shared, document.querySelector('[data-layout]'));
})();
