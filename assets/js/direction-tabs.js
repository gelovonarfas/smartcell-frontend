/* ============================================================
   SC/Direction · вкладки напрямку: Опис · Консультанти · Відгуки
   figma: Sub-nav 316:17, кадры 316:3 / 858:2 / 877:2

   1. Клик по вкладке показывает её панель без перезагрузки; бегунок
      едет по линии под вкладками (--tab-x, --tab-w).
   2. Вкладка пишется в адрес после # (#konsultanty, #vidguky) через
      replaceState: ссылкой можно поделиться, «назад» не щёлкает по вкладкам.
      «Опис» — адрес без #. Открытие ссылки с # включает нужную вкладку.
   3. Секции с data-direction-hide-on="<вкладка>" прячутся на этой вкладке:
      слайдер отзывов не нужен там, где уже полный список.
   4. Ссылки на вкладку из страницы ([data-tab-link="vidguky"], «Усі відгуки»,
      клик по карточке отзыва) включают её и прокручивают к линии вкладок.
   5. Клавиатура по шаблону WAI-ARIA tabs: стрелки, Home, End.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-direction-tabs]');
  if (!root) return;

  function all(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  var tabs = all(root, '[role="tab"]');
  var indicator = root.querySelector('[data-tabs-indicator]');
  var list = root.querySelector('[role="tablist"]');
  var hideables = all(document, '[data-direction-hide-on]');
  var DEFAULT = tabs[0].getAttribute('data-tab');

  function panelOf(tab) { return document.getElementById(tab.getAttribute('aria-controls')); }
  function byName(name) {
    for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('data-tab') === name) return tabs[i];
    return null;
  }

  function moveIndicator(tab) {
    if (!indicator || !list) return;
    list.style.setProperty('--tab-x', tab.offsetLeft + 'px');
    list.style.setProperty('--tab-w', tab.offsetWidth + 'px');
  }

  function writeHash(name) {
    var base = location.pathname + location.search;
    history.replaceState(history.state, '', name === DEFAULT ? base : base + '#' + name);
  }

  function select(tab, opts) {
    opts = opts || {};
    var name = tab.getAttribute('data-tab');
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panelOf(t).hidden = !on;
    });
    hideables.forEach(function (el) {
      el.hidden = el.getAttribute('data-direction-hide-on').split(/\s+/).indexOf(name) >= 0;
    });
    moveIndicator(tab);
    if (opts.focus) tab.focus();
    if (opts.hash !== false) writeHash(name);
    if (opts.scroll) root.scrollIntoView({ block: 'start' });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      var to = null;
      if (e.key === 'ArrowRight') to = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') to = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') to = tabs[0];
      else if (e.key === 'End') to = tabs[tabs.length - 1];
      if (!to) return;
      e.preventDefault();
      select(to, { focus: true });
    });
  });

  /* Ссылки на вкладку из других секций страницы */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-tab-link]');
    if (!link) return;
    var tab = byName(link.getAttribute('data-tab-link'));
    if (!tab) return;
    e.preventDefault();
    select(tab, { scroll: true });
  });

  function applyHash() {
    var tab = byName(location.hash.slice(1));
    select(tab || tabs[0], { hash: false });
  }

  window.addEventListener('hashchange', applyHash);

  /* Бегунок меряем после шрифта и при смене ширины: вкладки меняют ширину */
  function remeasure() {
    var cur = root.querySelector('[role="tab"][aria-selected="true"]');
    if (cur) moveIndicator(cur);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener('resize', remeasure);
  /* шрифт иногда подменяется уже после fonts.ready — следим за самими вкладками */
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(remeasure);
    tabs.forEach(function (t) { ro.observe(t); });
  }

  applyHash();
  /* первая установка бегунка — без анимации: переход включаем кадром позже */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { if (list) list.classList.add('sc-is-ready'); });
  });
}());
