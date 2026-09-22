/* ============================================================
   B08c · Динаміка за даними УЗД — монохромный график
   figma: 496:575 · состояния 508:122 / 509:122 / 509:202

   Ряды и шкалы живут здесь единственным объектом: правка данных —
   правка одной строки. Значения сверены с состояниями макета
   508:122 / 509:122 / 509:202 (выгрузка 2026-09-04).

   Подписи оси X и единица измерения — латиницей, как в макете:
   это обозначения протокола (AMC, PRP, FB), а не проза для перевода.

   Показатель переключают только стрелки, как в макете.
   SVG создаётся один раз: при переключении обновляются подписи осей
   и атрибут d у линий — узлы не пересоздаются.
   ============================================================ */
(function () {
  'use strict';

  /* dash-паттерны рядов повторяют макет: у каждой возрастной группы свой */
  var DASH = {
    '25–35': '2 5',
    '36–45': '8 6',
    '45–55': '',
    '56 і старше': '8 4 2 4'
  };

  var STATES = [
    {
      id: '1',
      label: 'Товщина епідермісу',
      unit: 'мкм',
      axisUnit: 'µm',
      decimals: 0,
      axisY: [70, 80, 90, 100, 110],
      axisX: ['AMC', 'FB', '6 mo', '12 mo'],
      baseline: null,
      series: [
        { name: '25–35',       values: [94, 82, 89, 90] },
        { name: '36–45',       values: [90, 76, 85, 85] },
        { name: '45–55',       values: [103, 89, 99, 99.5] },
        { name: '56 і старше', values: [88, 75, 83, 85] }
      ]
    },
    {
      id: '2',
      label: 'Товщина дерми',
      unit: '',
      axisUnit: 'ratio',
      decimals: 2,
      axisY: [0.90, 1.00, 1.10, 1.20],
      axisX: ['PRP', 'FB', '6 mo', '12 mo'],
      baseline: { value: 1.00, name: 'До лікування' },
      series: [
        { name: '25–35',       values: [1.00, 1.00, 1.00, 1.00] },
        { name: '36–45',       values: [1.00, 1.04, 1.08, 1.09] },
        /* Первая точка у всех групп ровно 1.00: график нормирован на
           значение до терапии, и просадки на старте в нём нет
           (сверено с оригиналом исследования 2026-09-14) */
        { name: '45–55',       values: [1.00, 1.05, 1.09, 1.11] },
        { name: '56 і старше', values: [1.00, 1.06, 1.13, 1.11] }
      ]
    },
    {
      id: '3',
      label: 'Акустична щільність',
      unit: '',
      axisUnit: 'ratio',
      decimals: 2,
      axisY: [0.90, 0.95, 1.00, 1.05, 1.10],
      axisX: ['PRP', 'FB', '6 mo', '12 mo'],
      baseline: { value: 1.00, name: 'До лікування' },
      series: [
        { name: '25–35',       values: [1.00, 0.95, 1.03, 1.09] },
        { name: '36–45',       values: [1.00, 0.95, 1.02, 1.08] },
        { name: '45–55',       values: [1.00, 0.93, 1.00, 1.08] },
        { name: '56 і старше', values: [1.00, 0.93, 0.98, 1.04] }
      ]
    }
  ];

  var NS = 'http://www.w3.org/2000/svg';

  /* Полотно и поля 1:1 с макетом (chart · 680): сетка 560 широкая,
     от 48 сверху до 600 снизу. Совпадение единиц viewBox с пикселями
     держит подписи осей ровно в 12px, без увеличения при масштабировании. */
  var VB = 680;
  var PAD = { top: 48, right: 48, bottom: 80, left: 72 };
  var MARK = 6;                        /* точки — квадраты 6×6, как в макете */

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
    return node;
  }

  /* Относительные показатели пишем с двумя знаками: «1.00», а не «1» —
     иначе теряется смысл нормировки. Микроны — целыми, но 99.5 сохраняем. */
  function fmt(v, unit, decimals) {
    var s = decimals ? v.toFixed(decimals)
                     : (Math.round(v * 10) / 10).toString();
    if (unit) s += ' ' + unit;
    return s;
  }

  function setup(section) {
    var host = section.querySelector('[data-usg-chart]');
    var legend = section.querySelector('[data-usg-legend]');
    var label = section.querySelector('[data-usg-label]');
    var count = section.querySelector('[data-usg-count]');
    var unit = section.querySelector('[data-usg-unit]');
    var panels = Array.prototype.slice.call(section.querySelectorAll('[data-usg-panel]'));
    var prev = section.querySelector('[data-usg-prev]');
    var next = section.querySelector('[data-usg-next]');
    if (!host || !legend) return;

    var plot = {
      x: PAD.left,
      y: PAD.top,
      w: VB - PAD.left - PAD.right,
      h: VB - PAD.top - PAD.bottom
    };

    var svg = el('svg', {
      viewBox: '0 0 ' + VB + ' ' + VB,
      class: 'sc-usg__svg',
      role: 'img',
      'aria-label': 'Графік динаміки показника за чотирма віковими групами'
    });

    var gGrid = el('g', { class: 'sc-usg__grid' });
    var gAxis = el('g', { class: 'sc-usg__axis' });
    var gSeries = el('g', { class: 'sc-usg__series' });
    svg.appendChild(gGrid);
    svg.appendChild(gAxis);
    svg.appendChild(gSeries);
    host.appendChild(svg);

    var current = 0;

    function scaleY(v, state) {
      var min = state.axisY[0];
      var max = state.axisY[state.axisY.length - 1];
      return plot.y + plot.h - ((v - min) / (max - min)) * plot.h;
    }

    function scaleX(i, state) {
      var n = state.axisX.length - 1;
      return plot.x + (plot.w / n) * i;
    }

    function draw(state) {
      gGrid.textContent = '';
      gAxis.textContent = '';
      gSeries.textContent = '';

      /* горизонтальная сетка и подписи оси Y */
      state.axisY.forEach(function (v) {
        var y = scaleY(v, state);
        gGrid.appendChild(el('line', {
          x1: plot.x, y1: y, x2: plot.x + plot.w, y2: y, class: 'sc-usg__gridline'
        }));
        var t = el('text', { x: plot.x - 12, y: y + 4, class: 'sc-usg__tick', 'text-anchor': 'end' });
        t.textContent = v.toFixed(state.decimals);
        gAxis.appendChild(t);
      });

      /* засечки и подписи оси X; крайние прижаты внутрь, как в макете */
      var last = state.axisX.length - 1;
      state.axisX.forEach(function (name, i) {
        var x = scaleX(i, state);
        gAxis.appendChild(el('line', {
          x1: x, y1: plot.y + plot.h, x2: x, y2: plot.y + plot.h + 6, class: 'sc-usg__tickline'
        }));
        var t = el('text', {
          x: x, y: plot.y + plot.h + 29, class: 'sc-usg__tick',
          'text-anchor': i === 0 ? 'start' : (i === last ? 'end' : 'middle')
        });
        t.textContent = name;
        gAxis.appendChild(t);
      });

      /* базовая линия 1.0 — там, где показатель нормирован */
      if (state.baseline) {
        gGrid.appendChild(el('line', {
          x1: plot.x, y1: scaleY(state.baseline.value, state),
          x2: plot.x + plot.w, y2: scaleY(state.baseline.value, state),
          class: 'sc-usg__baseline'
        }));
      }

      /* ряды */
      state.series.forEach(function (s) {
        var d = s.values.map(function (v, i) {
          return (i ? 'L' : 'M') + scaleX(i, state).toFixed(1) + ' ' + scaleY(v, state).toFixed(1);
        }).join(' ');

        var path = el('path', { d: d, class: 'sc-usg__line' });
        if (DASH[s.name]) path.setAttribute('stroke-dasharray', DASH[s.name]);
        gSeries.appendChild(path);

        s.values.forEach(function (v, i) {
          gSeries.appendChild(el('rect', {
            x: scaleX(i, state) - MARK / 2,
            y: scaleY(v, state) - MARK / 2,
            width: MARK, height: MARK, class: 'sc-usg__dot'
          }));
        });
      });
    }

    function drawLegend(state) {
      legend.textContent = '';

      if (state.baseline) {
        var base = document.createElement('li');
        base.className = 'sc-usg__legend-row';
        base.innerHTML = '<span class="sc-usg__legend-sample sc-usg__legend-sample--base"></span>' +
                         '<span class="sc-usg__legend-name sc-t-small"></span>' +
                         '<span class="sc-usg__legend-value sc-t-small"></span>';
        base.querySelector('.sc-usg__legend-name').textContent = state.baseline.name;
        base.querySelector('.sc-usg__legend-value').textContent = fmt(state.baseline.value, state.unit, state.decimals);
        legend.appendChild(base);
      }

      state.series.forEach(function (s) {
        var row = document.createElement('li');
        row.className = 'sc-usg__legend-row';

        var sample = document.createElement('span');
        sample.className = 'sc-usg__legend-sample';
        var mini = el('svg', { viewBox: '0 0 40 2', width: '40', height: '2', 'aria-hidden': 'true' });
        var line = el('line', { x1: 0, y1: 1, x2: 40, y2: 1, class: 'sc-usg__line' });
        if (DASH[s.name]) line.setAttribute('stroke-dasharray', DASH[s.name]);
        mini.appendChild(line);
        sample.appendChild(mini);

        var name = document.createElement('span');
        name.className = 'sc-usg__legend-name sc-t-small';
        name.textContent = s.name;

        var value = document.createElement('span');
        value.className = 'sc-usg__legend-value sc-t-small';
        value.textContent = fmt(s.values[0], '', state.decimals) + ' → ' +
                            fmt(s.values[s.values.length - 1], state.unit, state.decimals);

        row.appendChild(sample);
        row.appendChild(name);
        row.appendChild(value);
        legend.appendChild(row);
      });
    }

    function show(index, instant) {
      current = (index + STATES.length) % STATES.length;
      var state = STATES[current];

      /* при переключении показателя перерисовку не анимируем */
      if (instant && section.hasAttribute('data-usg-drawn')) {
        section.setAttribute('data-usg-drawn', 'instant');
      }

      panels.forEach(function (p, i) { p.hidden = i !== current; });

      if (label) label.textContent = state.label;
      if (count) count.textContent = (current + 1) + ' / ' + STATES.length;
      if (unit) unit.textContent = state.axisUnit;
      draw(state);
      drawLegend(state);
    }

    if (prev) prev.addEventListener('click', function () { show(current + -1, true); });
    if (next) next.addEventListener('click', function () { show(current + 1, true); });

    show(0);

    /* Линии рисуются один раз, когда секция появилась во вьюпорте.
       Без IntersectionObserver и при reduced-motion они просто на месте. */
    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      section.setAttribute('data-usg-drawn', '');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        io.disconnect();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { section.setAttribute('data-usg-drawn', ''); });
        });
        return;
      }
    }, { threshold: 0.2 });

    io.observe(section);
  }

  var sections = document.querySelectorAll('[data-usg]');
  for (var i = 0; i < sections.length; i++) setup(sections[i]);
}());
