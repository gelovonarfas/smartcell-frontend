/* ============================================================
   VM/StickyPromo · Face Control — показ промо в статье
   figma: node-id=1091:769

   1. Через SHOW_AFTER мс после открытия статьи блок выезжает снизу
      (CSS-переход по data-promo-state="in", выраженный ease-out),
      фото проявляется отдельно, с задержкой — тоже в CSS.
   2. Картинка подставляется из data-promo-src за PRELOAD мс до показа:
      до этого блок ничего не грузит и статье не мешает.
   3. Над подвалом блок уезжает вниз, при возврате — выезжает снова.
   4. Крестик прячет на HIDE_DAYS дней (localStorage); на телефоне
      закрывает и свайп вниз по тосту.
   Без JS блок остаётся hidden.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-promo]');
  if (!root) return;

  var SHOW_AFTER = 5500;          /* «через 5–6 секунд» */
  var PRELOAD = 1000;
  var HIDE_DAYS = 7;
  var KEY = 'sc-promo-fc-closed';
  var SWIPE = 40;                 /* px вниз, чтобы свайп закрыл тост */
  var SETTLE = 1300;              /* выезд полосы 900 + задержка постера 280 + запас */

  function closedRecently() {
    try {
      var t = parseInt(localStorage.getItem(KEY), 10);
      return t && Date.now() - t < HIDE_DAYS * 864e5;
    } catch (e) { return false; }
  }

  /* Для просмотра: адрес с ?promo сбрасывает «закрыто» — блок снова покажется */
  if (/[?&]promo\b/.test(location.search)) {
    try { localStorage.removeItem(KEY); } catch (e) { /* приватный режим */ }
  }

  if (closedRecently()) return;

  var visible = false;   /* выехал по таймеру */
  var overFooter = false;
  var closed = false;

  function paint() {
    root.setAttribute('data-promo-state', visible && !overFooter && !closed ? 'in' : 'out');
  }

  /* картинку — заранее, чтобы к выезду она уже была */
  setTimeout(function () {
    Array.prototype.forEach.call(root.querySelectorAll('[data-promo-src]'), function (img) {
      img.src = img.getAttribute('data-promo-src');
    });
  }, Math.max(0, SHOW_AFTER - PRELOAD));

  setTimeout(function () {
    root.hidden = false;
    root.setAttribute('data-promo-state', 'out');
    /* принудительный пересчёт раскладки фиксирует стартовое положение —
       без него браузер склеит два состояния и перехода не будет */
    void root.offsetHeight;
    visible = true;
    paint();
    /* выезд закончился — снимаем задержку постера для наведения */
    setTimeout(function () { root.setAttribute('data-promo-settled', ''); }, SETTLE);
  }, SHOW_AFTER);

  /* над подвалом — прячемся */
  var footer = document.querySelector('.sc-footer');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      overFooter = entries[0].isIntersecting;
      paint();
    }).observe(footer);
  }

  function close() {
    closed = true;
    paint();
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* приватный режим */ }
    root.addEventListener('transitionend', function done(e) {
      if (e.target !== root) return;
      root.removeEventListener('transitionend', done);
      root.hidden = true;
    });
  }

  var btn = root.querySelector('[data-promo-close]');
  if (btn) btn.addEventListener('click', close);

  /* свайп вниз по тосту */
  var startY = null;
  root.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (startY === null) return;
    if (e.changedTouches[0].clientY - startY > SWIPE) close();
    startY = null;
  }, { passive: true });
}());
