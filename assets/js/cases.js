/* ============================================================
   B06 · До-Після · 3 кейси — переключение кейсов, видов и кадров
   figma: node-id=925:1315

   Три оси: кейс (стрелки), вид контролю — Фото / УЗД / Морфологія
   (миниатюры), кадр — ДО / ПІСЛЯ (сегменты). Разметка полная и статичная:
   скрипт ничего не строит и не подставляет тексты, только переключает
   видимость по data-атрибутам. Источник истины — DOM: какие виды есть
   у кейса, скрипт узнаёт по кадрам, которые для него сверстаны.

   Смена ДО ↔ ПІСЛЯ — мягкий кроссфейд в CSS; здесь только атрибут.
   Без JS видно кейс 1 · Фото · ПІСЛЯ.
   ============================================================ */
(function () {
  'use strict';

  var sections = document.querySelectorAll('[data-cases]');
  if (!sections.length) return;

  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function setup(section) {
    var frames  = all(section, '[data-case-frame]');
    var panels  = all(section, '[data-case-panel]');
    var metas   = all(section, '[data-case-meta]');
    var types   = all(section, '[data-case-type-btn]');
    var thumbs  = all(section, '[data-case-thumb]');
    var segs    = all(section, '[data-case-shot-btn]');
    var prev    = section.querySelector('[data-case-prev]');
    var next    = section.querySelector('[data-case-next]');
    if (!frames.length) return;

    /* порядок кейсов — как они идут в разметке */
    var cases = [];
    frames.forEach(function (f) {
      var id = f.getAttribute('data-case-frame');
      if (cases.indexOf(id) < 0) cases.push(id);
    });

    var state = { c: cases[0], type: 'photo', shot: 'after' };
    var start = section.querySelector('[data-case-frame][data-current]');
    if (start) { state.c = start.getAttribute('data-case-frame'); state.type = start.getAttribute('data-case-type'); }

    function hasView(c, type) {
      return frames.some(function (f) {
        return f.getAttribute('data-case-frame') === c && f.getAttribute('data-case-type') === type;
      });
    }

    function paint() {
      /* у этого кейса может не быть текущего вида — падаем на «Фото» */
      if (!hasView(state.c, state.type)) state.type = 'photo';

      frames.forEach(function (f) {
        var on = f.getAttribute('data-case-frame') === state.c && f.getAttribute('data-case-type') === state.type;
        if (on) f.setAttribute('data-current', ''); else f.removeAttribute('data-current');
        all(f, '[data-case-shot]').forEach(function (img) {
          if (img.getAttribute('data-case-shot') === state.shot) img.setAttribute('data-current', '');
          else img.removeAttribute('data-current');
        });
      });

      panels.forEach(function (p) {
        p.hidden = !(p.getAttribute('data-case-panel') === state.c && p.getAttribute('data-case-type') === state.type);
      });

      metas.forEach(function (m) { m.hidden = m.getAttribute('data-case-meta') !== state.c; });

      types.forEach(function (btn) {
        var type = btn.getAttribute('data-case-type-btn');
        var available = hasView(state.c, type);
        btn.parentNode.hidden = !available;         /* у кейса 2 нет морфологии */
        var on = available && type === state.type;
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        btn.tabIndex = on ? 0 : -1;
      });

      thumbs.forEach(function (img) { img.hidden = img.getAttribute('data-case-thumb') !== state.c; });

      segs.forEach(function (s) {
        var on = s.getAttribute('data-case-shot-btn') === state.shot;
        s.setAttribute('aria-checked', on ? 'true' : 'false');
        s.tabIndex = on ? 0 : -1;
      });
    }

    function step(delta) {
      var i = cases.indexOf(state.c);
      state.c = cases[(i + delta + cases.length) % cases.length];
      paint();
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    types.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.type = btn.getAttribute('data-case-type-btn');
        paint();
      });
    });

    segs.forEach(function (s) {
      s.addEventListener('click', function () {
        state.shot = s.getAttribute('data-case-shot-btn');
        paint();
      });
    });

    /* Клавиатура: стрелки по видам (tablist) и по сегментам (radiogroup) */
    section.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t.hasAttribute) return;
      var fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      var back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      if (!fwd && !back) return;

      if (t.hasAttribute('data-case-type-btn')) {
        e.preventDefault();
        var visible = types.filter(function (b) { return !b.parentNode.hidden; });
        var i = visible.indexOf(t);
        var nextBtn = visible[(i + (fwd ? 1 : -1) + visible.length) % visible.length];
        state.type = nextBtn.getAttribute('data-case-type-btn');
        paint();
        nextBtn.focus();
      } else if (t.hasAttribute('data-case-shot-btn')) {
        e.preventDefault();
        state.shot = state.shot === 'after' ? 'before' : 'after';
        paint();
        segs.forEach(function (s) { if (s.getAttribute('data-case-shot-btn') === state.shot) s.focus(); });
      }
    });

    paint();
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
