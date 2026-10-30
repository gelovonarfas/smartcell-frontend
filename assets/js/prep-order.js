/* ============================================================
   SC/Preparations · кошик препаратів (2026-10-29)
   Як на virtus: «Додати в замовлення» у продукту → кнопка стає
   «Препарат доданий» (aria-pressed="true"), поруч з'являється кошик —
   прибрати. Склад замовлення у формі ([data-order-list]) збирається
   з доданих продуктів — у попапі і на плиті «Замовлення»; без них — текст [data-order-empty].
   Прихований input[data-order-input] — назви через кому, для кодера
   (відправка форми — на його боці, як і в modal.js).
   ============================================================ */
(function () {
  'use strict';

  var adds = document.querySelectorAll('[data-order-add]');
  if (!adds.length) return;

  /* склад показується в кількох місцях: попап форми і плита «Замовлення» на сторінці */
  var lists = document.querySelectorAll('[data-order-list]');
  var empties = document.querySelectorAll('[data-order-empty]');
  var input = document.querySelector('[data-order-input]');
  var order = [];   /* у порядку додавання, як у формі virtus */

  function sync() {
    Array.prototype.forEach.call(adds, function (btn) {
      var name = btn.getAttribute('data-order-add');
      var on = order.indexOf(name) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var remove = btn.parentNode.querySelector('[data-order-remove]');
      if (remove) remove.hidden = !on;
    });
    /* через кому одним рядком — форма не розростається (правка 2026-10-29) */
    Array.prototype.forEach.call(lists, function (list) {
      list.textContent = order.join(', ');
      list.hidden = !order.length;
    });
    Array.prototype.forEach.call(empties, function (el) { el.hidden = !!order.length; });
    if (input) input.value = order.join(', ');
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var add = e.target.closest('[data-order-add]');
    if (add) {
      var name = add.getAttribute('data-order-add');
      /* «Препарат доданий» (вже в замовленні) — веде до плити «Замовлення» з формою (2026-10-29) */
      if (order.indexOf(name) !== -1) {
        var target = document.getElementById('order');
        if (target) {
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          /* scrollTo з відступом під фіксовану шапку (scroll-margin секції); scrollIntoView
             у частині браузерів не спрацьовував */
          var off = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - off, behavior: reduce ? 'auto' : 'smooth' });
        }
        return;
      }
      order.push(name);
      sync();
      return;
    }
    var remove = e.target.closest('[data-order-remove]');
    if (remove) {
      var n = remove.getAttribute('data-order-remove');
      order = order.filter(function (x) { return x !== n; });
      sync();
      /* фокус не губимо: кошик зникає — повертаємо на кнопку продукту */
      var btn = remove.parentNode.querySelector('[data-order-add]');
      if (btn) btn.focus();
    }
  });

  sync();
}());
