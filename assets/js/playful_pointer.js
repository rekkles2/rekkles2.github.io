(function (window, document) {
  'use strict';

  if (window.__playfulPointerInitialized) return;
  window.__playfulPointerInitialized = true;

  var script = document.currentScript;
  var luluSource = script && script.dataset.luluSrc
    ? script.dataset.luluSrc
    : '/assets/images/etc/lulu/1.png';
  var nailongBase = script && script.dataset.nailongBase
    ? script.dataset.nailongBase
    : '/assets/images/etc/nailong/';

  var finePointerQuery = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cursor = null;
  var cursorReady = false;
  var cursorVisible = false;
  var pointerX = -120;
  var pointerY = -120;
  var cursorFrame = 0;
  var activeSprites = [];
  var maxActiveSprites = 10;

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function removeSprite(sprite) {
    var index = activeSprites.indexOf(sprite);
    if (index !== -1) activeSprites.splice(index, 1);
    if (sprite && sprite.parentNode) sprite.parentNode.removeChild(sprite);
  }

  function enforceSpriteLimit() {
    while (activeSprites.length >= maxActiveSprites) {
      removeSprite(activeSprites[0]);
    }
  }

  function preloadNailongAssets() {
    for (var index = 1; index <= 4; index += 1) {
      var image = new window.Image();
      image.decoding = 'async';
      image.src = nailongBase + index + '.svg';
    }
  }

  function scheduleAssetPreload() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preloadNailongAssets, { timeout: 1200 });
    } else {
      window.setTimeout(preloadNailongAssets, 250);
    }
  }

  function updateCursorPosition() {
    cursorFrame = 0;
    if (!cursor) return;
    cursor.style.transform = 'translate3d(' + pointerX + 'px, ' + pointerY + 'px, 0) translate(-50%, -50%)';
  }

  function requestCursorUpdate() {
    if (cursorFrame) return;
    cursorFrame = window.requestAnimationFrame(updateCursorPosition);
  }

  function setCursorVisibility(visible) {
    if (!cursor || !cursorReady || !finePointerQuery.matches) return;
    if (cursorVisible === visible) return;
    cursorVisible = visible;
    cursor.classList.toggle('is-visible', visible);
  }

  function syncCursorMode() {
    var enabled = Boolean(cursorReady && finePointerQuery.matches);
    document.documentElement.classList.toggle('has-lulu-cursor', enabled);
    if (!enabled) setCursorVisibility(false);
  }

  function createCursor() {
    cursor = document.createElement('div');
    cursor.className = 'lulu-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    var image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    image.addEventListener('load', function () {
      cursorReady = true;
      syncCursorMode();
    }, { once: true });
    image.addEventListener('error', function () {
      cursorReady = false;
      syncCursorMode();
    }, { once: true });
    image.src = luluSource;

    cursor.appendChild(image);
    document.body.appendChild(cursor);
  }

  function handlePointerMove(event) {
    if (!finePointerQuery.matches) return;
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;

    pointerX = event.clientX;
    pointerY = event.clientY;
    requestCursorUpdate();
    setCursorVisibility(true);
  }

  function createNailongSprite(clientX, clientY) {
    enforceSpriteLimit();

    var sprite = document.createElement('span');
    var image = document.createElement('img');
    var size = randomBetween(58, 84);
    var duration = randomBetween(980, 1320);
    var startRotation = randomBetween(-10, 10);
    var endRotation = startRotation + randomBetween(-16, 16);

    sprite.className = 'nailong-click-sprite';
    sprite.setAttribute('aria-hidden', 'true');
    sprite.style.left = clientX + 'px';
    sprite.style.top = clientY + 'px';
    sprite.style.setProperty('--nailong-size', size.toFixed(1) + 'px');
    sprite.style.setProperty('--nailong-duration', Math.round(duration) + 'ms');
    sprite.style.setProperty('--nailong-drift-x', randomBetween(-38, 38).toFixed(1) + 'px');
    sprite.style.setProperty('--nailong-rise-y', -randomBetween(118, 174).toFixed(1) + 'px');
    sprite.style.setProperty('--nailong-start-rotation', startRotation.toFixed(1) + 'deg');
    sprite.style.setProperty('--nailong-end-rotation', endRotation.toFixed(1) + 'deg');
    sprite.style.setProperty('--nailong-end-scale', randomBetween(0.92, 1.08).toFixed(2));

    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    image.src = nailongBase + (Math.floor(Math.random() * 4) + 1) + '.svg';

    sprite.appendChild(image);
    document.body.appendChild(sprite);
    activeSprites.push(sprite);

    if (reducedMotionQuery.matches) {
      sprite.classList.add('is-reduced-motion');
      window.setTimeout(function () {
        sprite.classList.add('is-fading');
      }, 140);
      window.setTimeout(function () {
        removeSprite(sprite);
      }, 340);
      return;
    }

    image.addEventListener('animationend', function () {
      removeSprite(sprite);
    }, { once: true });
    window.setTimeout(function () {
      removeSprite(sprite);
    }, Math.ceil(duration) + 200);
  }

  function handleClick(event) {
    if (typeof event.detail === 'number' && event.detail === 0) return;
    if (typeof event.button === 'number' && event.button !== 0) return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

    createNailongSprite(event.clientX, event.clientY);
  }

  function boot() {
    createCursor();
    scheduleAssetPreload();

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', function () {
      setCursorVisibility(false);
    }, { passive: true });
    window.addEventListener('blur', function () {
      setCursorVisibility(false);
    }, { passive: true });
    document.addEventListener('click', handleClick, { capture: true, passive: true });

    if (typeof finePointerQuery.addEventListener === 'function') {
      finePointerQuery.addEventListener('change', syncCursorMode);
    } else if (typeof finePointerQuery.addListener === 'function') {
      finePointerQuery.addListener(syncCursorMode);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window, document);
