(function (window, document) {
  'use strict';

  if (window.__siteCommonInitialized) return;
  window.__siteCommonInitialized = true;

  function boot() {
    const $ = window.jQuery;
    if (!$) return;

    const lazyLoadOptions = {
      scrollDirection: 'vertical',
      effect: 'fadeIn',
      effectTime: 300,
      placeholder: '',
      onError: function (element) {
        const source = element && typeof element.data === 'function' ? element.data('src') : '';
        window.console.warn('[lazyload] Unable to load ' + source);
      },
      afterLoad: function (element) {
        if (!element || typeof element.is !== 'function') return;
        if (element.is('img')) {
          element.css('background-image', 'none');
        } else if (element.is('div')) {
          element.css({
            'background-size': 'cover',
            'background-position': 'center'
          });
        }
      }
    };

    if (typeof $.fn.Lazy === 'function') {
      $('img.lazy, div.lazy:not(.always-load)').Lazy(Object.assign({ visibleOnly: true }, lazyLoadOptions));
      $('div.lazy.always-load').Lazy(Object.assign({ visibleOnly: false }, lazyLoadOptions));
    }

    if (typeof $.fn.tooltip === 'function') {
      $('[data-toggle="tooltip"]').tooltip();
    }

    const $navbarCollapse = $('#navbarResponsive');
    const $navbarToggle = $('.site-navbar-toggle');
    const $navbarToggleLabel = $navbarToggle.find('.site-navbar-toggle-label');
    if ($navbarCollapse.length && $navbarToggle.length) {
      const setNavbarState = function (isOpen) {
        $navbarToggle.attr('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        $navbarToggleLabel.text(isOpen ? 'Close' : 'Menu');
      };
      $navbarCollapse.on('show.bs.collapse', function () { setNavbarState(true); });
      $navbarCollapse.on('hidden.bs.collapse', function () { setNavbarState(false); });
      setNavbarState($navbarCollapse.hasClass('show'));
    }

    const $grids = $('.grid');
    if (!$grids.length || typeof $.fn.masonry !== 'function') return;

    $grids.each(function () {
      const $grid = $(this);
      if ($grid.data('site-masonry-initialized')) return;
      $grid.data('site-masonry-initialized', true);

      $grid.masonry({
        percentPosition: true,
        itemSelector: '.grid-item',
        columnWidth: '.grid-sizer'
      });

      if (typeof $.fn.imagesLoaded === 'function') {
        $grid.imagesLoaded().progress(function () {
          $grid.masonry('layout');
        });
      }

      $grid.find('.lazy').on('load.siteMasonry', function () {
        $grid.masonry('layout');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window, document);
