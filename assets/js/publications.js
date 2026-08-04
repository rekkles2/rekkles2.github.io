(function () {
  'use strict';

  const initializedRoots = new WeakSet();
  const itemTerms = new WeakMap();

  function cleanLabel(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function termKey(value) {
    return cleanLabel(value).toLocaleLowerCase();
  }

  function parseTerms(value) {
    const seen = new Set();
    const terms = [];

    String(value || '').split(';').forEach(function (rawTerm) {
      const label = cleanLabel(rawTerm);
      const key = termKey(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      terms.push({ key: key, label: label });
    });

    return terms;
  }

  function buildTermIndex(items) {
    const index = new Map();
    let firstAppearance = 0;

    items.forEach(function (item) {
      const terms = parseTerms(item.getAttribute('data-index-terms'));
      const keys = new Set();

      terms.forEach(function (term) {
        keys.add(term.key);
        if (!index.has(term.key)) {
          index.set(term.key, {
            key: term.key,
            label: term.label,
            count: 0,
            firstAppearance: firstAppearance++
          });
        }
        index.get(term.key).count += 1;
      });

      itemTerms.set(item, keys);
    });

    return Array.from(index.values()).sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.firstAppearance - b.firstAppearance;
    });
  }

  function updateUrl(root, activeTerm, mode) {
    if (root.getAttribute('data-filter-url') !== 'true') return;

    const param = root.getAttribute('data-filter-param') || 'pub-term';
    const url = new URL(window.location.href);

    if (activeTerm) url.searchParams.set(param, activeTerm.label);
    else url.searchParams.delete(param);

    const nextUrl = url.pathname + url.search + url.hash;
    if (mode === 'push') window.history.pushState({}, '', nextUrl);
    else window.history.replaceState({}, '', nextUrl);
  }

  function removeHiddenYearHash(hiddenYears) {
    if (!window.location.hash) return;
    const currentYear = window.location.hash.replace('#year-', '');
    if (!hiddenYears.has(currentYear)) return;

    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  function initPublicationFilter(root, rootIndex) {
    if (initializedRoots.has(root)) return;
    initializedRoots.add(root);

    const items = Array.from(root.querySelectorAll('[data-publication-item]'));
    const filterUi = root.querySelector('[data-publication-filter-ui]');
    const chipList = root.querySelector('[data-filter-chip-list]');
    const allButton = root.querySelector('[data-filter-term][data-term-key=""]');
    const moreButton = root.querySelector('[data-filter-more]');
    const moreLabel = root.querySelector('[data-filter-more-label]');
    const disclosure = root.querySelector('[data-filter-disclosure]');
    const summaryLabel = root.querySelector('[data-filter-summary-label]');
    const summaryCount = root.querySelector('[data-filter-summary-count]');
    const status = root.querySelector('[data-filter-status]');
    const emptyState = root.querySelector('[data-filter-empty]');
    const filterNav = root.querySelector('[data-filter-nav]');
    const yearGroups = Array.from(root.querySelectorAll('[data-year-group]'));
    const yearLinks = Array.from(root.querySelectorAll('[data-year-link]'));
    const maxTerms = Math.max(1, parseInt(root.getAttribute('data-max-terms') || '6', 10));
    const terms = buildTermIndex(items);
    const termByKey = new Map(terms.map(function (term) { return [term.key, term]; }));
    const buttonsByKey = new Map();
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeKey = '';
    let expanded = false;
    let yearObserver = null;

    if (!filterUi || !chipList || !allButton || !filterNav) return;

    const chipListId = chipList.id || 'publication-filter-terms-' + (rootIndex + 1);
    chipList.id = chipListId;
    if (moreButton) moreButton.setAttribute('aria-controls', chipListId);

    function setChipContent(button, label, count) {
      const labelNode = document.createElement('span');
      const countNode = document.createElement('span');
      const publicationLabel = count === 1 ? 'publication' : 'publications';

      labelNode.className = 'publication-filter-chip-label';
      labelNode.textContent = label;
      countNode.className = 'publication-filter-count';
      countNode.textContent = String(count);
      countNode.setAttribute('aria-hidden', 'true');

      button.replaceChildren(labelNode, countNode);
      button.setAttribute('aria-label', label + ', ' + count + ' ' + publicationLabel);
      button.title = label + ' · ' + count + ' ' + publicationLabel;
    }

    setChipContent(allButton, 'All', items.length);

    terms.forEach(function (term) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'publication-filter-chip';
      button.setAttribute('data-filter-term', '');
      button.setAttribute('data-term-key', term.key);
      button.setAttribute('aria-pressed', 'false');
      setChipContent(button, term.label, term.count);
      chipList.appendChild(button);
      buttonsByKey.set(term.key, button);
    });

    function activeTerm() {
      return activeKey ? termByKey.get(activeKey) : null;
    }

    function visibleTermKeys() {
      if (expanded || terms.length <= maxTerms) {
        return terms.map(function (term) { return term.key; });
      }

      const visible = terms.slice(0, maxTerms).map(function (term) { return term.key; });
      if (activeKey && visible.indexOf(activeKey) === -1) {
        visible[visible.length - 1] = activeKey;
      }
      return visible;
    }

    function setYearCurrent(year) {
      yearLinks.forEach(function (link) {
        const isCurrent = link.getAttribute('data-publication-year') === year && !link.hidden;
        link.classList.toggle('is-active', isCurrent);
        if (isCurrent) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function refreshYearObserver() {
      if (!yearGroups.length || !('IntersectionObserver' in window)) return;
      if (yearObserver) yearObserver.disconnect();

      const visibleGroups = yearGroups.filter(function (group) { return !group.hidden; });
      if (!visibleGroups.length) return;

      yearObserver = new IntersectionObserver(function (entries) {
        const visibleEntries = entries
          .filter(function (entry) { return entry.isIntersecting && !entry.target.hidden; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });

        if (!visibleEntries.length) return;
        setYearCurrent(visibleEntries[0].target.getAttribute('data-publication-year'));
      }, {
        rootMargin: '-24% 0px -62% 0px',
        threshold: [0.05, 0.2, 0.45, 0.7]
      });

      visibleGroups.forEach(function (group) { yearObserver.observe(group); });
      setYearCurrent(visibleGroups[0].getAttribute('data-publication-year'));
    }

    function render(options) {
      const settings = options || {};
      const active = activeTerm();
      const visibleKeys = new Set(visibleTermKeys());
      let visibleCount = 0;

      allButton.classList.toggle('is-active', !activeKey);
      allButton.setAttribute('aria-pressed', activeKey ? 'false' : 'true');

      buttonsByKey.forEach(function (button, key) {
        button.hidden = !visibleKeys.has(key);
        const selected = key === activeKey;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });

      if (moreButton && moreLabel) {
        const hiddenCount = Math.max(0, terms.length - maxTerms);
        moreButton.hidden = hiddenCount === 0;
        moreButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        moreLabel.textContent = expanded ? 'Show fewer' : 'Show all · +' + hiddenCount;
        moreButton.title = expanded ? 'Show only the five most frequent Index Terms' : 'Expand all Index Terms';
      }

      items.forEach(function (item) {
        const matches = !activeKey || (itemTerms.get(item) || new Set()).has(activeKey);
        item.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      const hiddenYears = new Set();
      yearGroups.forEach(function (group) {
        const year = group.getAttribute('data-publication-year');
        const visibleYearItems = Array.from(group.querySelectorAll('[data-publication-item]')).filter(function (item) {
          return !item.hidden;
        });
        const hasVisibleItems = visibleYearItems.length > 0;
        const yearCount = group.querySelector('[data-year-count]');
        group.hidden = !hasVisibleItems;
        if (yearCount) {
          yearCount.textContent = visibleYearItems.length + (visibleYearItems.length === 1 ? ' paper' : ' papers');
        }
        if (!hasVisibleItems) hiddenYears.add(year);
      });

      yearLinks.forEach(function (link) {
        link.hidden = hiddenYears.has(link.getAttribute('data-publication-year'));
      });

      root.querySelectorAll('[data-filter-clear]').forEach(function (button) {
        button.hidden = !activeKey;
      });

      if (emptyState) emptyState.hidden = visibleCount !== 0;

      if (summaryLabel) summaryLabel.textContent = active ? active.label : 'All';
      if (summaryCount) {
        summaryCount.textContent = String(visibleCount);
        summaryCount.setAttribute('aria-label', visibleCount + (visibleCount === 1 ? ' publication' : ' publications'));
      }

      if (status) {
        if (active) {
          status.textContent = 'Showing ' + visibleCount + (visibleCount === 1 ? ' publication' : ' publications') + ' for “' + active.label + '”';
        } else {
          status.textContent = visibleCount + (visibleCount === 1 ? ' publication shown' : ' publications shown');
        }
      }

      if (hiddenYears.size) removeHiddenYearHash(hiddenYears);
      refreshYearObserver();

      if (settings.updateUrl) updateUrl(root, active, settings.updateUrl);
    }

    function setActive(key, urlMode) {
      activeKey = termByKey.has(key) ? key : '';
      render({ updateUrl: urlMode || null });
    }

    function restoreFromUrl(cleanInvalid) {
      if (root.getAttribute('data-filter-url') !== 'true') return;
      const param = root.getAttribute('data-filter-param') || 'pub-term';
      const url = new URL(window.location.href);
      const rawValue = url.searchParams.get(param);
      if (!rawValue) {
        activeKey = '';
        return;
      }

      const key = termKey(rawValue);
      if (termByKey.has(key)) {
        activeKey = key;
      } else {
        activeKey = '';
        if (cleanInvalid) {
          url.searchParams.delete(param);
          window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        }
      }
    }

    filterNav.addEventListener('click', function (event) {
      const button = event.target.closest('[data-filter-term]');
      if (!button || !filterNav.contains(button)) return;
      setActive(button.getAttribute('data-term-key') || '', 'push');
    });

    root.addEventListener('click', function (event) {
      const clearButton = event.target.closest('[data-filter-clear]');
      if (clearButton && root.contains(clearButton)) {
        setActive('', 'push');
        return;
      }

      const disclosureButton = event.target.closest('[data-filter-more]');
      if (disclosureButton && root.contains(disclosureButton)) {
        expanded = !expanded;
        render();
      }
    });

    filterNav.addEventListener('keydown', function (event) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const target = event.target.closest('[data-filter-term]');
      if (!target) return;

      const visibleButtons = [allButton].concat(Array.from(buttonsByKey.values()).filter(function (button) {
        return !button.hidden;
      }));
      const currentIndex = visibleButtons.indexOf(target);
      if (currentIndex === -1) return;

      event.preventDefault();
      let nextIndex = currentIndex;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + visibleButtons.length) % visibleButtons.length;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % visibleButtons.length;
      }
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = visibleButtons.length - 1;

      visibleButtons[nextIndex].focus();
      visibleButtons[nextIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });

    if (disclosure) {
      disclosure.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' || !disclosure.open) return;
        event.preventDefault();
        disclosure.open = false;
        disclosure.querySelector('summary')?.focus();
      });
    }

    yearLinks.forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (link.hidden) return;
        const year = link.getAttribute('data-publication-year');
        const heading = document.getElementById('year-' + year);
        if (!heading) return;

        event.preventDefault();
        heading.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        setYearCurrent(year);

        const url = new URL(window.location.href);
        url.hash = 'year-' + year;
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        window.setTimeout(function () {
          heading.focus({ preventScroll: true });
        }, prefersReducedMotion ? 0 : 260);
      });
    });

    if (root.getAttribute('data-filter-url') === 'true') {
      window.addEventListener('popstate', function () {
        expanded = false;
        restoreFromUrl(true);
        render();
      });
    }

    restoreFromUrl(true);
    render();
    filterUi.hidden = false;
  }

  function boot() {
    document.querySelectorAll('[data-publication-filter]').forEach(function (root, index) {
      initPublicationFilter(root, index);
    });
  }

  if (document.querySelector('[data-publication-filter]')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
