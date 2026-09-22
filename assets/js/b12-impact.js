/* ============================================================
   B12 · На що впливаємо — рост полос
   figma: node-id=15:112

   Полосы: scaleX 0 → N (значение берётся из инлайн --impact-fill в разметке),
   переход описан в CSS, скрипт только снимает нулевое состояние.
   Значения считает общий assets/js/counters.js — он же сообщает старт
   через data-counters="running".
   ============================================================ */
(function () {
  'use strict';

  var sections = document.querySelectorAll('[data-impact]');
  if (!sections.length) return;

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function setup(section) {
    /* нулевое состояние ставим сами: без JS полосы сразу финальные */
    section.setAttribute('data-impact-animate', 'pending');

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        observer.disconnect();
        section.setAttribute('data-impact-animate', 'running');
        return;
      }
    }, { threshold: 0.2 });

    observer.observe(section);
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
