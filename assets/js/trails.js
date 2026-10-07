'use strict';
(() => {
  const section = document.querySelector('#media-trail');
  if (!section) return;

  const words = [...section.querySelectorAll('.media-hover-word')];
  words.forEach(word => {
    const frame = word.querySelector('.inline-media');
    const image = frame?.querySelector('img');
    const files = (word.dataset.media || '').split(',').filter(Boolean);
    if (!frame || !image || !files.length) return;

    files.forEach(file => { const preload = new Image(); preload.src = `./assets/images/previews/${file}-320.jpg`; });
    let index = 0, distance = 0, lastX = null;
    let currentX = 0, currentY = 0, targetX = 0, targetY = 0, frameId = 0;

    const syncRatio = () => {
      if (image.naturalWidth && image.naturalHeight) frame.style.setProperty('--inline-ratio', Math.min(1.85, Math.max(.8, image.naturalWidth / image.naturalHeight)).toFixed(3));
    };
    const changeImage = () => {
      index = (index + 1) % files.length;
      image.style.opacity = '0';
      setTimeout(() => { image.src = `./assets/images/previews/${files[index]}-320.jpg`; }, 120);
    };
    const animate = () => {
      currentX += (targetX - currentX) * .14;
      currentY += (targetY - currentY) * .14;
      image.style.setProperty('--media-pan-x', `${currentX.toFixed(2)}px`);
      image.style.setProperty('--media-pan-y', `${currentY.toFixed(2)}px`);
      if (Math.abs(targetX-currentX) > .08 || Math.abs(targetY-currentY) > .08) frameId = requestAnimationFrame(animate);
      else frameId = 0;
    };
    const move = event => {
      if (!motionAllowed()) return;
      const rect = word.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - .5) * 9;
      targetY = ((event.clientY - rect.top) / rect.height - .5) * 7;
      if (!frameId) frameId = requestAnimationFrame(animate);
      if (lastX !== null) distance += Math.abs(event.clientX - lastX);
      lastX = event.clientX;
      if (distance > 72) { distance = 0; changeImage(); }
    };

    image.addEventListener('load', () => { syncRatio(); image.style.opacity = '1'; });
    if (image.complete) syncRatio();
    word.addEventListener('pointermove', move);
    word.addEventListener('pointerleave', () => { lastX = null; distance = 0; targetX = 0; targetY = 0; if (!frameId) frameId = requestAnimationFrame(animate); });
    word.addEventListener('click', () => {
      const open = word.dataset.open !== 'true';
      words.forEach(item => item.removeAttribute('data-open'));
      if (open) word.dataset.open = 'true';
    });
  });

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.media-hover-word')) words.forEach(word => word.removeAttribute('data-open'));
  });
})();
