/* ============================================================
   B04a · Journey — активный этап по скроллу
   figma: node-id=4:295

   Активным считается этап, пересекающий горизонталь по центру вьюпорта:
   IntersectionObserver с rootMargin -50%/-50% сводит root к полосе в центре,
   так что скролл-обработчика не нужно. Когда в полосе никого (промежуток
   между этапами) — активным остаётся последний, который её пересёк.
   ============================================================ */
(function () {
  'use strict';

  var sections = document.querySelectorAll('[data-journey]');
  if (!sections.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Уважаем reduced-motion и для фонового видео: постер вместо движения. */
  if (reduced && reduced.matches) {
    for (var v = 0; v < sections.length; v++) {
      var video = sections[v].querySelector('.sc-journey__video');
      if (video) { video.removeAttribute('autoplay'); video.pause(); }
    }
  }

  /* Без IntersectionObserver ничего не трогаем: в CSS все этапы читаемы. */
  if (!('IntersectionObserver' in window)) return;

  function setup(section) {
    var steps = section.querySelectorAll('[data-journey-step]');
    if (!steps.length) return;

    var active = null;

    function setActive(step) {
      if (step === active) return;
      if (active) active.classList.remove('sc-is-active');
      step.classList.add('sc-is-active');
      active = step;
    }

    /* Дим неактивных включается только теперь — когда есть кому его снимать. */
    section.setAttribute('data-journey', 'active');
    setActive(steps[0]);

    /* Переходы — со следующего кадра, чтобы стартовое состояние не анимировалось. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { section.classList.add('sc-is-animated'); });
    });

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { setActive(entries[i].target); schedule(); }
      }
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

    for (var j = 0; j < steps.length; j++) observer.observe(steps[j]);

    /* Заливка рельса. Сегменты до активного шага залиты целиком, активный
       и следующие пусты: линия доходит ровно до активного маркера, без
       хвоста в сторону следующего шага. Переход делает CSS. */
    function paint() {
      var active = 0;
      for (var a = 0; a < steps.length; a++) {
        if (steps[a].classList.contains('sc-is-active')) active = a;
      }
      for (var i = 0; i < steps.length; i++) {
        steps[i].style.setProperty('--journey-fill', i < active ? 1 : 0);
      }
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
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
