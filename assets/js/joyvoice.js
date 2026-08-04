(function () {
  'use strict';

  const LANGUAGE_KEY = 'joyvoice-lang';
  const CAROUSEL_INTERVAL = 5000;

  function safeReadLanguage() {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      return saved === 'en' || saved === 'zh' ? saved : 'zh';
    } catch (error) {
      return 'zh';
    }
  }

  function safeSaveLanguage(language) {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      // Language switching still works when storage is unavailable.
    }
  }

  function setLanguage(language) {
    const activeLanguage = language === 'en' ? 'en' : 'zh';
    const inactiveLanguage = activeLanguage === 'zh' ? 'en' : 'zh';

    document.querySelectorAll('.joyvoice-lang[data-lang="' + activeLanguage + '"]').forEach(function (element) {
      element.classList.remove('d-none');
    });
    document.querySelectorAll('.joyvoice-lang[data-lang="' + inactiveLanguage + '"]').forEach(function (element) {
      element.classList.add('d-none');
    });

    document.documentElement.lang = activeLanguage === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('joyvoice-lang-en', activeLanguage === 'en');
    document.body.classList.toggle('joyvoice-lang-zh', activeLanguage === 'zh');

    const toggle = document.getElementById('joyvoice-lang-toggle');
    const label = document.getElementById('lang-toggle-text');
    const destination = activeLanguage === 'zh' ? 'English' : '中文';
    if (label) label.textContent = destination;
    if (toggle) {
      toggle.setAttribute('aria-pressed', activeLanguage === 'en' ? 'true' : 'false');
      toggle.setAttribute('aria-label', activeLanguage === 'zh' ? 'Switch to English' : '切换到中文');
      toggle.setAttribute('data-current-language', activeLanguage);
    }

    safeSaveLanguage(activeLanguage);
  }

  function initLanguageToggle() {
    const toggle = document.getElementById('joyvoice-lang-toggle');
    setLanguage(safeReadLanguage());
    if (!toggle || toggle.getAttribute('data-initialized') === 'true') return;

    toggle.setAttribute('data-initialized', 'true');
    toggle.addEventListener('click', function () {
      const currentLanguage = toggle.getAttribute('data-current-language') || 'zh';
      setLanguage(currentLanguage === 'zh' ? 'en' : 'zh');
    });
  }

  function initCarousel(root) {
    if (root.getAttribute('data-initialized') === 'true') return;
    root.setAttribute('data-initialized', 'true');

    const viewport = root.querySelector('.joyvoice-carousel-viewport');
    const slides = Array.from(root.querySelectorAll('.joyvoice-slide'));
    const dots = Array.from(root.querySelectorAll('.joyvoice-dot'));
    const previous = root.querySelector('.joyvoice-prev');
    const next = root.querySelector('.joyvoice-next');
    const toggle = root.querySelector('.joyvoice-carousel-toggle');
    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    if (!viewport || slides.length < 2) return;

    let index = 0;
    let timer = null;
    let manualPause = false;
    let pointerInside = false;
    let focusInside = false;
    let documentHidden = document.hidden;
    let offscreen = false;
    let touchStartX = null;

    root.tabIndex = 0;

    function reducedMotion() {
      return Boolean(motionQuery && motionQuery.matches);
    }

    function shouldPause() {
      return manualPause || pointerInside || focusInside || documentHidden || offscreen || reducedMotion();
    }

    function updateToggle() {
      if (!toggle) return;
      const icon = toggle.querySelector('i');
      toggle.setAttribute('aria-pressed', manualPause ? 'true' : 'false');
      toggle.setAttribute('aria-label', manualPause ? 'Resume autoplay' : 'Pause autoplay');
      if (icon) {
        icon.classList.toggle('fa-pause', !manualPause);
        icon.classList.toggle('fa-play', manualPause);
      }
    }

    function render() {
      viewport.style.transform = 'translateX(' + (-index * 100) + '%)';
      slides.forEach(function (slide, slideIndex) {
        slide.setAttribute('aria-hidden', slideIndex === index ? 'false' : 'true');
      });
      dots.forEach(function (dot, dotIndex) {
        const current = dotIndex === index;
        dot.classList.toggle('is-active', current);
        if (current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }

    function stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (shouldPause()) return;
      timer = window.setInterval(function () {
        index = (index + 1) % slides.length;
        render();
      }, CAROUSEL_INTERVAL);
    }

    function syncAutoplay() {
      if (shouldPause()) stop();
      else start();
      updateToggle();
    }

    function goTo(nextIndex) {
      index = (nextIndex + slides.length) % slides.length;
      render();
      syncAutoplay();
    }

    if (previous) {
      previous.addEventListener('click', function () {
        goTo(index - 1);
      });
    }

    if (next) {
      next.addEventListener('click', function () {
        goTo(index + 1);
      });
    }

    dots.forEach(function (dot, dotIndex) {
      dot.addEventListener('click', function () {
        goTo(dotIndex);
      });
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        manualPause = !manualPause;
        syncAutoplay();
      });
    }

    root.addEventListener('mouseenter', function () {
      pointerInside = true;
      syncAutoplay();
    });

    root.addEventListener('mouseleave', function () {
      pointerInside = false;
      syncAutoplay();
    });

    root.addEventListener('focusin', function () {
      focusInside = true;
      syncAutoplay();
    });

    root.addEventListener('focusout', function () {
      window.setTimeout(function () {
        focusInside = root.contains(document.activeElement);
        syncAutoplay();
      }, 0);
    });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1);
      }
    });

    viewport.addEventListener('touchstart', function (event) {
      if (!event.touches.length) return;
      touchStartX = event.touches[0].clientX;
      pointerInside = true;
      syncAutoplay();
    }, { passive: true });

    viewport.addEventListener('touchend', function (event) {
      if (touchStartX === null || !event.changedTouches.length) return;
      const distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      pointerInside = false;
      if (Math.abs(distance) > 40) goTo(index + (distance > 0 ? -1 : 1));
      else syncAutoplay();
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      documentHidden = document.hidden;
      syncAutoplay();
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target !== root) return;
          offscreen = !entry.isIntersecting || entry.intersectionRatio < 0.25;
          syncAutoplay();
        });
      }, { threshold: [0, 0.25, 0.6] });
      observer.observe(root);
    }

    if (motionQuery) {
      const onMotionChange = function () { syncAutoplay(); };
      if (typeof motionQuery.addEventListener === 'function') motionQuery.addEventListener('change', onMotionChange);
      else if (typeof motionQuery.addListener === 'function') motionQuery.addListener(onMotionChange);
    }

    render();
    updateToggle();
    syncAutoplay();
  }

  function bootJoyVoice() {
    if (!document.body.classList.contains('page-joyvoice')) return;
    initLanguageToggle();
    document.querySelectorAll('.joyvoice-carousel').forEach(initCarousel);
  }

  if (document.body.classList.contains('page-joyvoice')) {
    bootJoyVoice();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootJoyVoice, { once: true });
  }
})();
