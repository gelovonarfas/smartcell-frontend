/* ============================================================
   Фоновые видео: B01 · Хиро и B05 · Амбасадор

   Единственная задача скрипта: при prefers-reduced-motion остановить
   фон и оставить постер.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced || !reduced.matches) return;

  var videos = document.querySelectorAll('[data-hero] .sc-hero__video');
  for (var i = 0; i < videos.length; i++) {
    videos[i].removeAttribute('autoplay');
    videos[i].pause();
  }
}());
