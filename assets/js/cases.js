/* ============================================================
   B06 · До-Після · 3 кейси — пациентки, вкладки и шторка «до / після»
   figma: node-id=931:1130 … 937:1337 (правка 2026-09-25)

   Три оси: пациентка (стрелки), вид контролю — ФОТО / УЗД (вкладки
   с бегунком по линии), положение шторки (тянется мышью и пальцем,
   стрелками с клавиатуры). Разметка полная и статичная: скрипт ничего
   не строит и не подставляет тексты, только переключает видимость по
   data-атрибутам и пишет положение шторки в --cases-pos.

   Старт шторки берётся из data-case-start у пары кадров: для фото 33 (левая треть — кадры не совпадают точно),
   для УЗД 30 (так в макете). При смене пациентки или вида шторка
   возвращается на старт этого вида.
   Без JS видно пациентку 1 · фото, шторка на левой трети.
   ============================================================ */
(function () {
  'use strict';

  var sections = document.querySelectorAll('[data-cases]');
  if (!sections.length) return;

  var STEP = 5;      /* шаг шторки стрелкой, % */
  var STEP_BIG = 25; /* PageUp / PageDown */

  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function clamp(v) { return Math.min(100, Math.max(0, v)); }

  function setup(section) {
    var frames = all(section, '[data-case-frame]');
    var panels = all(section, '[data-case-panel]');
    var metas  = all(section, '[data-case-meta]');
    var tabs   = all(section, '[data-case-type-btn]');
    var ind    = section.querySelector('[data-case-tab-ind]');
    var stage  = section.querySelector('[data-case-stage]');
    var handle = section.querySelector('[data-case-handle]');
    var prev   = section.querySelector('[data-case-prev]');
    var next   = section.querySelector('[data-case-next]');
    if (!frames.length || !stage) return;

    /* порядок пациенток — как они идут в разметке */
    var cases = [];
    frames.forEach(function (f) {
      var id = f.getAttribute('data-case-frame');
      if (cases.indexOf(id) < 0) cases.push(id);
    });

    var state = { c: cases[0], type: 'photo', pos: 33 };

    function current() {
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i];
        if (f.getAttribute('data-case-frame') === state.c && f.getAttribute('data-case-type') === state.type) return f;
      }
      return null;
    }

    function setPos(v) {
      state.pos = clamp(v);
      var p = Math.round(state.pos * 10) / 10;
      stage.style.setProperty('--cases-pos', p + '%');
      if (handle) {
        handle.setAttribute('aria-valuenow', String(Math.round(p)));
        handle.setAttribute('aria-valuetext', Math.round(p) + ' %');
      }
    }

    function placeIndicator() {
      if (!ind) return;
      var on = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (!on) return;
      ind.style.setProperty('--cases-ind-x', on.offsetLeft + 'px');
      ind.style.setProperty('--cases-ind-w', on.offsetWidth + 'px');
    }

    function paint(resetPos) {
      var cur = null;
      frames.forEach(function (f) {
        var on = f.getAttribute('data-case-frame') === state.c && f.getAttribute('data-case-type') === state.type;
        if (on) { f.setAttribute('data-current', ''); cur = f; } else f.removeAttribute('data-current');
      });

      panels.forEach(function (p) { p.hidden = p.getAttribute('data-case-panel') !== state.c; });
      metas.forEach(function (m) { m.hidden = m.getAttribute('data-case-meta') !== state.c; });

      tabs.forEach(function (t) {
        var on = t.getAttribute('data-case-type-btn') === state.type;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      placeIndicator();

      if (resetPos && cur) setPos(parseFloat(cur.getAttribute('data-case-start')) || 33);
    }

    function step(delta) {
      var i = cases.indexOf(state.c);
      state.c = cases[(i + delta + cases.length) % cases.length];
      paint(true);
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        if (state.type === t.getAttribute('data-case-type-btn')) return;
        state.type = t.getAttribute('data-case-type-btn');
        paint(true);
      });
    });

    /* Вкладки: стрелки влево/вправо по кругу (tablist) */
    tabs.forEach(function (t) {
      t.addEventListener('keydown', function (e) {
        var fwd = e.key === 'ArrowRight', back = e.key === 'ArrowLeft';
        if (!fwd && !back) return;
        e.preventDefault();
        var i = tabs.indexOf(t);
        var n = tabs[(i + (fwd ? 1 : -1) + tabs.length) % tabs.length];
        state.type = n.getAttribute('data-case-type-btn');
        paint(true);
        n.focus();
      });
    });

    /* ---------- Шторка: мышь и палец ----------
       Тянуть можно за любое место кадра. touch-action: pan-y на кадре
       оставляет пальцу вертикальный скролл страницы; горизонтальный
       жест двигает шторку. */
    var dragging = false;

    function posFromEvent(e) {
      var r = stage.getBoundingClientRect();
      return (e.clientX - r.left) / r.width * 100;
    }

    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      stage.classList.add('sc-is-dragging');
      if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
      setPos(posFromEvent(e));
    });

    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      setPos(posFromEvent(e));
    });

    function stop(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('sc-is-dragging');
      if (stage.releasePointerCapture && e && e.pointerId !== undefined) {
        try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* уже отпущен */ }
      }
    }

    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);
    stage.addEventListener('lostpointercapture', stop);

    /* ---------- Шторка: клавиатура (role="slider") ---------- */
    if (handle) {
      handle.addEventListener('keydown', function (e) {
        var v = state.pos;
        switch (e.key) {
          case 'ArrowLeft': case 'ArrowDown': v -= STEP; break;
          case 'ArrowRight': case 'ArrowUp': v += STEP; break;
          case 'PageDown': v -= STEP_BIG; break;
          case 'PageUp': v += STEP_BIG; break;
          case 'Home': v = 0; break;
          case 'End': v = 100; break;
          default: return;
        }
        e.preventDefault();
        setPos(v);
      });
    }

    /* бегунок вкладок пересчитываем, когда встал шрифт и когда меняется ширина */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeIndicator);
    window.addEventListener('resize', placeIndicator);

    paint(true);
    section.classList.add('sc-is-ready');
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
