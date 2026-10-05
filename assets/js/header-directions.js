/* ============================================================
   B00b · Header — меню «Напрямки» (ПРОБА v3, 2026-10-04)
   1. Кнопка «Напрямки» открывает полку разделов под шапкой.
      Закрытие: повторный клик, Esc (фокус возвращается на кнопку),
      клик мимо полки, переход по ссылке, открытие портала логотипа.
      Закрытая полка — inert: фокус и скринридер внутрь не попадают.
   2. Внутри полки — вкладки разделов (WAI-ARIA tabs): переключаются
      наведением на десктопе, кликом и стрелками; бегунок едет по линии
      (--tab-x / --tab-w на полосе вкладок).
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

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = panelOf(t);
      if (p) p.hidden = !on;
    });
    moveIndicator(tab);
    if (focus) tab.focus();
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

  function set(open) {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('sc-is-open', open);
    if (header) header.classList.toggle('sc-hdir-open', open);
    panel.inert = !open;
    if (open && tabs.length) {
      /* первая установка бегунка — без анимации, затем включаем переход */
      moveIndicator(currentTab());
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (tablist) tablist.classList.add('sc-is-ready'); });
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
