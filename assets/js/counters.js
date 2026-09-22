/* ============================================================
   Счёт значений от нуля при появлении секции во вьюпорте.

   Общий для блоков: B12 «На що впливаємо», B04c «Clinical data».
   Разметка: секция помечена data-counters, каждое значение — data-count.
   В конце в узел возвращается ИСХОДНАЯ строка из HTML, поэтому «+80%»
   остаётся «+80%», а «100%» — «100%».
   Без JS и при prefers-reduced-motion значения сразу финальные.
   ============================================================ */
(function () {
  'use strict';

  var DURATION = 900; /* синхронно с --impact-dur */

  var sections = document.querySelectorAll('[data-counters]');
  if (!sections.length) return;

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Кривая --sc-ease: cubic-bezier(.4, 0, .2, 1) */
  function bezier(t, p1, p2) {
    var mt = 1 - t;
    return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
  }

  function ease(x) {
    var lo = 0, hi = 1, t = x, i, v;
    for (i = 0; i < 12; i++) {
      v = bezier(t, 0.4, 0.2);
      if (v < x) { lo = t; } else { hi = t; }
      t = (lo + hi) / 2;
    }
    return bezier(t, 0, 1);
  }

  function read(el) {
    var text = el.textContent;
    var match = text.match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return null;

    var raw = match[0];
    return {
      el: el,
      final: text,
      target: parseFloat(raw.replace(',', '.')),
      prefix: text.slice(0, match.index),
      suffix: text.slice(match.index + raw.length),
      decimals: (raw.split(/[.,]/)[1] || '').length,
      separator: raw.indexOf(',') > -1 ? ',' : '.'
    };
  }

  function render(c, value) {
    var s = c.decimals ? value.toFixed(c.decimals) : String(Math.round(value));
    if (c.separator === ',') s = s.replace('.', ',');
    c.el.textContent = c.prefix + s + c.suffix;
  }

  function setup(section) {
    var nodes = section.querySelectorAll('[data-count]');
    if (!nodes.length) return;

    var counters = [];
    for (var i = 0; i < nodes.length; i++) {
      var c = read(nodes[i]);
      if (!c) continue;
      counters.push(c);
      render(c, 0);
    }
    if (!counters.length) return;

    var observer = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (!entries[j].isIntersecting) continue;
        observer.disconnect();
        run(section, counters);
        return;
      }
    }, { threshold: 0.2 });

    observer.observe(section);
  }

  function run(section, counters) {
    /* сообщаем секции, что счёт пошёл: B12 на этом же классе пускает полосы */
    section.setAttribute('data-counters', 'running');

    var start = null;

    function frame(now) {
      if (start === null) start = now;

      var progress = Math.min((now - start) / DURATION, 1);
      var eased = ease(progress);

      for (var i = 0; i < counters.length; i++) {
        if (progress === 1) counters[i].el.textContent = counters[i].final;
        else render(counters[i], counters[i].target * eased);
      }

      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
