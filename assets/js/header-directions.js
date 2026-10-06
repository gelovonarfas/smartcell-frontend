/* ============================================================
   B00b · Header — меню «Напрямки» (ПРОБА v3, 2026-10-04)
   1. Кнопка «Напрямки» открывает полку разделов под шапкой.
      Закрытие: повторный клик, Esc (фокус возвращается на кнопку),
      клик мимо полки, переход по ссылке, открытие портала логотипа.
      Закрытая полка — inert: фокус и скринридер внутрь не попадают.
   2. Внутри полки — вкладки разделов (WAI-ARIA tabs): переключаются
      наведением на десктопе, кликом и стрелками; бегунок едет по линии
      (--tab-x / --tab-w на полосе вкладок).
   3. Анимация (2026-10-06): если на странице есть GSAP (window.gsap,
      подключается отдельным <script> перед этим файлом), полка открывается
      таймлайном — высота expo.out, скрим, содержимое волной со сдвигом;
      закрывается быстрее; при смене вкладки высота доезжает, панель
      проявляется. Без GSAP работают CSS-переходы (ПРОБА — только
      на тестовой странице direction-plastic-nav.html).
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-directions]');
  if (!root) return;

  var trigger = root.querySelector('[data-directions-trigger]');
  var panel = root.querySelector('[data-directions-panel]');
  var header = root.closest('[data-header]');
  if (!trigger || !panel) return;

  function all(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  /* ---------- вкладки разделов ---------- */

  var tabs = all(panel, '[data-hdir-tab]');
  var tablist = tabs.length ? tabs[0].parentNode : null;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');

  function panelOf(tab) { return document.getElementById(tab.getAttribute('aria-controls')); }

  function moveIndicator(tab) {
    if (!tablist) return;
    tablist.style.setProperty('--tab-x', tab.offsetLeft + 'px');
    tablist.style.setProperty('--tab-w', tab.offsetWidth + 'px');
  }

  /* ---------- GSAP (если подключён) ---------- */

  var gsap = window.gsap || null;
  /* высоту ведём на .sc-hdir__clip (у него overflow: hidden): сама полка остаётся без
     обрезки, иначе скрим-псевдоэлемент под ней отсекался (правка 2026-10-06) */
  var clip = panel.querySelector('.sc-hdir__clip') || panel;
  var wide = window.matchMedia ? window.matchMedia('(min-width: 641px)') : null;
  function animated() { return !!(gsap && (!wide || wide.matches)); }
  if (gsap) root.classList.add('sc-hdir--gsap');

  var EASE_IN = 'expo.out', EASE_OUT = 'power3.inOut';
  var D_OPEN = 0.7, D_CLOSE = 0.42, D_TAB = 0.45;

  /* что проявляется волной: полоса вкладок и блоки открытой панели + анонс */
  function waveItems() {
    var items = [];
    var tabsEl = panel.querySelector('.sc-hdir__tabs');
    if (tabsEl) items.push(tabsEl);
    var pane = panelOf(currentTab());
    if (pane) all(pane, ':scope > *').forEach(function (n) { items.push(n); });
    var article = panel.querySelector('.sc-hdir__col--article');
    if (article && article.offsetParent) items.push(article);
    return items;
  }

  function selectTab(tab, focus) {
    var was = tabs.length ? currentTab() : null;
    var h0 = (animated() && isOpen() && was !== tab) ? clip.offsetHeight : null;
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = panelOf(t);
      if (p) p.hidden = !on;
    });
    moveIndicator(tab);
    syncFull(tab);
    if (focus) tab.focus();
    /* смена вкладки в открытой полке: высота доезжает до новой, панель проявляется */
    if (h0 !== null) {
      var pane = panelOf(tab);
      gsap.killTweensOf(clip);
      gsap.set(clip, { height: 'auto' });
      var h1 = clip.offsetHeight;
      gsap.fromTo(clip, { height: h0 }, { height: h1, duration: D_TAB, ease: EASE_IN, clearProps: 'height' });
      if (pane) {
        var kids = all(pane, ':scope > *');
        gsap.killTweensOf(kids);
        gsap.fromTo(kids, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE_IN, stagger: 0.05, clearProps: 'opacity,transform' });
      }
    }
  }

  /* Вкладка во всю полку (data-hdir-full на панели): анонс журнала прячется */
  function syncFull(tab) {
    var p = panelOf(tab);
    panel.classList.toggle('sc-is-full', !!(p && p.hasAttribute('data-hdir-full')));
  }

  function currentTab() {
    for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('aria-selected') === 'true') return tabs[i];
    return tabs[0];
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    /* на курсорных устройствах — как у OneSkin: наведение уже переключает */
    if (fine && fine.matches) tab.addEventListener('mouseenter', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var to = null;
      if (e.key === 'ArrowRight') to = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') to = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') to = tabs[0];
      else if (e.key === 'End') to = tabs[tabs.length - 1];
      if (!to) return;
      e.preventDefault();
      selectTab(to, true);
    });
  });

  /* ---------- открыть / закрыть полку ---------- */

  function isOpen() { return trigger.getAttribute('aria-expanded') === 'true'; }

  var tl = null;

  function set(open) {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.inert = !open;
    if (open && tabs.length) {
      /* первая установка бегунка — без анимации, затем включаем переход */
      moveIndicator(currentTab());
      syncFull(currentTab());
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (tablist) tablist.classList.add('sc-is-ready'); });
      });
    }
    if (!animated()) {
      root.classList.toggle('sc-is-open', open);
      if (header) header.classList.toggle('sc-hdir-open', open);
      return;
    }

    /* --- GSAP: таймлайн открытия / закрытия --- */
    if (tl) tl.kill();
    var items = waveItems();
    gsap.killTweensOf([panel, clip].concat(items));
    tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

    if (open) {
      root.classList.add('sc-is-open');
      if (header) header.classList.add('sc-hdir-open');
      gsap.set(clip, { height: 'auto' });
      var h = clip.offsetHeight;
      tl.fromTo(clip, { height: 0 }, { height: h, duration: D_OPEN, ease: EASE_IN, clearProps: 'height' }, 0)
        .fromTo(panel, { '--hdir-scrim': 0 }, { '--hdir-scrim': 1, duration: 0.6, ease: 'power2.out' }, 0)
        .fromTo(items, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.65, ease: EASE_IN, stagger: 0.055, clearProps: 'opacity,transform' }, 0.1);
    } else {
      /* занавес и содержимое уходят вместе: текст тает, пока полка сворачивается,
         а не раньше неё — иначе на миг остаётся пустая белая коробка */
      tl.to(items, { opacity: 0, y: -6, duration: D_CLOSE * 0.85, ease: 'power1.in' }, 0)
        .to(panel, { '--hdir-scrim': 0, duration: D_CLOSE, ease: 'power2.out' }, 0)
        .to(clip, { height: 0, duration: D_CLOSE, ease: EASE_OUT }, 0)
        .add(function () {
          root.classList.remove('sc-is-open');
          if (header) header.classList.remove('sc-hdir-open');
          gsap.set(clip, { clearProps: 'height' });
          gsap.set(items, { clearProps: 'opacity,transform' });
        });
    }
  }

  trigger.addEventListener('click', function () { set(!isOpen()); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { set(false); trigger.focus(); }
  });

  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (root.contains(e.target)) {
      if (e.target.closest('a')) set(false);   /* ушли по ссылке */
      return;
    }
    set(false);                                /* клик мимо полки */
  });

  /* портал логотипа и меню «Напрямки» не открыты одновременно */
  var portal = document.querySelector('[data-portal-trigger]');
  if (portal) portal.addEventListener('click', function () { if (isOpen()) set(false); });

  window.addEventListener('resize', function () { if (isOpen() && tabs.length) moveIndicator(currentTab()); });

  set(false);
}());
