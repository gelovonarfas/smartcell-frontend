/* ============================================================
   Отложенные картинки ниже первого экрана.

   Зачем: у родного loading="lazy" порог на медленной сети — 2500 px, и на
   длинной странице журнала карточки ленты стартуют вместе с обложкой первого
   слайда, деля с ней канал: обложка доезжала за 11,6 с (замер 2026-09-22).
   Здесь адрес лежит в data-src / data-srcset, а подставляется, когда картинка
   подходит к вьюпорту на 300 px. Разметка для темы та же: <img data-src …>
   с width/height, чтобы место было занято заранее.
   ============================================================ */
(function () {
  'use strict';

  var imgs = Array.prototype.slice.call(document.querySelectorAll('img[data-src]'));
  if (!imgs.length) return;

  function load(img) {
    if (!img.getAttribute('data-src')) return;
    var srcset = img.getAttribute('data-srcset');
    if (srcset) { img.setAttribute('srcset', srcset); img.removeAttribute('data-srcset'); }
    img.setAttribute('src', img.getAttribute('data-src'));
    img.removeAttribute('data-src');
  }

  if (!('IntersectionObserver' in window)) {
    window.addEventListener('load', function () { imgs.forEach(load); }, { once: true });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      load(e.target);
    });
  }, { rootMargin: '300px 0px' });
  imgs.forEach(function (img) { io.observe(img); });

  /* Печать и «сохранить как» видят всё: подставляем разом */
  window.addEventListener('beforeprint', function () { imgs.forEach(load); });
}());
