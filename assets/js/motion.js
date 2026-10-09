'use strict';

// Shared motion layer for page changes, scroll reveals, and small control feedback.
// Every effect is optional: links and controls keep their native behaviour when
// motion is paused, reduced, unsupported, or JavaScript is unavailable.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const isIOSDevice = /iP(?:ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && /Mobile\//.test(navigator.userAgent));
  if (isIOSDevice) document.documentElement.classList.add('is-ios');
  const motionAllowed = () => {
    return !isIOSDevice && !reducedMotion.matches &&
      !document.documentElement.classList.contains('motion-paused') &&
      !document.body.classList.contains('motion-paused');
  };

  const curtain = document.createElement('div');
  curtain.className = 'page-transition';
  curtain.setAttribute('aria-hidden', 'true');
  document.body.append(curtain);

  function resetTransition() {
    document.documentElement.classList.remove('page-is-leaving');
    curtain.getAnimations().forEach(animation => animation.cancel());
    curtain.style.transform = 'scaleY(0)';
    curtain.style.transformOrigin = 'top';
  }

  if (motionAllowed()) {
    curtain.animate(
      [{transform:'scaleY(1)', transformOrigin:'top'}, {transform:'scaleY(0)', transformOrigin:'top'}],
      {duration:520, easing:'cubic-bezier(.76,0,.24,1)', fill:'forwards'}
    );
    document.querySelector('main')?.animate(
      [{opacity:.72, translate:'0 10px'}, {opacity:1, translate:'0 0'}],
      {duration:560, delay:100, easing:'cubic-bezier(.16,1,.3,1)', fill:'backwards'}
    );
  } else resetTransition();

  addEventListener('pageshow', event => { if (event.persisted) resetTransition(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target || link.hasAttribute('download') || !motionAllowed()) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.protocol !== location.protocol ||
        (destination.pathname === location.pathname && destination.search === location.search)) return;
    event.preventDefault();
    document.documentElement.classList.add('page-is-leaving');
    curtain.style.transformOrigin = 'bottom';
    const animation = curtain.animate(
      [{transform:'scaleY(0)', transformOrigin:'bottom'}, {transform:'scaleY(1)', transformOrigin:'bottom'}],
      {duration:420, easing:'cubic-bezier(.76,0,.24,1)', fill:'forwards'}
    );
    animation.finished.then(() => location.assign(destination.href));
    setTimeout(() => location.assign(destination.href), 650);
  });

  // Reveal editorial groups once as they enter the viewport. Content is never
  // hidden in CSS, so a failed observer cannot make the page inaccessible.
  const revealTargets = document.querySelectorAll([
    '.archive-heading', '.service-grid article', '.availability-card',
    '.selected-work-grid a', '.journey-preview-card', '.photo-detail figure',
    '.photo-detail-copy', '.photo-related-grid a', '.journey-intro > *',
    '.journey-map', '.journey-story'
  ].join(','));
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      if (!motionAllowed()) return;
      const siblings = [...(entry.target.parentElement?.children || [])];
      const order = Math.max(0, siblings.indexOf(entry.target));
      entry.target.animate(
        [{opacity:0, translate:'0 28px', scale:'.985'}, {opacity:1, translate:'0 0', scale:'1'}],
        {duration:680, delay:Math.min(order, 4) * 65, easing:'cubic-bezier(.16,1,.3,1)', fill:'backwards'}
      );
    }), {threshold:.12, rootMargin:'0px 0px -5%'});
    revealTargets.forEach(element => revealObserver.observe(element));
  }

  // A short press response and a checkmark make state changes feel immediate.
  document.addEventListener('pointerdown', event => {
    const control = event.target.closest('button:not(:disabled), .btn');
    if (!control || !motionAllowed()) return;
    control.animate([{scale:'1'}, {scale:'.97'}, {scale:'1'}], {duration:180, easing:'ease-out'});
  });
  document.addEventListener('click', event => {
    const control = event.target.closest('button[aria-pressed]');
    if (!control) return;
    requestAnimationFrame(() => {
      if (control.getAttribute('aria-pressed') !== 'true' || !motionAllowed()) return;
      control.querySelector('.micro-confirm')?.remove();
      const confirmation = document.createElement('span');
      confirmation.className = 'micro-confirm';
      confirmation.setAttribute('aria-hidden', 'true');
      control.append(confirmation);
      confirmation.addEventListener('animationend', () => confirmation.remove(), {once:true});
    });
  });
})();
