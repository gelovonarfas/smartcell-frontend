/* ============================================================
   Полоса прочитанного на странице статьи

   Считает долю прокрученного тела статьи и пишет её в --article-progress.
   Полоса живёт только на статье: по ней сразу видно, что читаешь материал,
   а не ленту журнала (решение 2026-09-07).

   Считаем от начала тела до конца источников, а не по всей странице:
   подвал и «Читайте також» к чтению статьи не относятся.
   ============================================================ */
(function () {
  'use strict';

  var bar = document.querySelector('[data-article-progress]');
  var body = document.querySelector('.vm-article__main');
  if (!bar || !body) return;

  var root = document.querySelector('.vm-article');

  function paint() {
    var box = body.getBoundingClientRect();
    var start = box.top - window.innerHeight * 0.5;   /* половина экрана — уже читают */
    var length = box.height;
    var done = length > 0 ? -start / length : 0;
    if (done < 0) done = 0;
    if (done > 1) done = 1;
    root.style.setProperty('--article-progress', done.toFixed(3));
  }

  var ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; paint(); });
  }

  paint();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}());
