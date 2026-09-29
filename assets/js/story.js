/* ============================================================
   B02 · v3 · стаття — зачіпка по скролу, інверсія, самоперевірка
   figma: node-id=999:1116

   Три вещи:
   1. Зачіпка. Каждая часть статьи справа несёт индекс фразы
      (data-story-hook-index). На каждый скролл заново считаем, какая часть
      стоит на своей линии, и оттуда берём фразу: старая уходит в размытие,
      новая появляется сразу, без анимации (с 2026-09-28; раньше — размытие GSAP).
   2. Инверсия. Части с data-story-solution — «рішення». Пока активная часть
      не раньше первой из них, на секции стоит data-theme="inverse".
      Состояние не копится обработчиками «вошли/вышли», поэтому возврат
      снизу вверх не оставляет застрявшую фразу и тёмный фон.
      Цвета переключаются мгновенно (--story-invert-dur: 0s, решение 2026-09-28).
   3. Самоперевірка. Один симптом в кадре, стрелки листают, полоса
      отсчитывает интервал и переключает — та же механика, что у фактов B08.

   Тексты не трогаем: все фразы и симптомы лежат в разметке цельными узлами.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-story]');
  if (!root) return;

  /* «Меньше движения» — самопроверка не листает симптомы сама */
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* ---------- Зачіпка ---------- */
  var hooks = Array.prototype.slice.call(root.querySelectorAll('[data-story-hook]'));
  var parts = Array.prototype.slice.call(root.querySelectorAll('[data-story-part]'));
  var current = 0;

  /* без JS лишние фразы скрыты атрибутом — снимаем, стопка ложится в сетку */
  hooks.forEach(function (h, i) {
    h.hidden = false;
    if (h.hasAttribute('data-current')) current = i;
  });

  /* Смена фразы мгновенная, без проявления из размытия (решение 2026-09-28):
     только переставляем data-current, видимость задаёт CSS */
  function setHook(i) {
    if (i === current || !hooks[i]) return;
    hooks[current].removeAttribute('data-current');
    hooks[i].setAttribute('data-current', '');
    current = i;
  }

  /* ---------- Инверсия ---------- */
  function setSolution(on) {
    if (on) root.setAttribute('data-theme', 'inverse');
    else root.removeAttribute('data-theme');
  }

  /* Линия переключения. Части «проблеми» меняют зачіпку, когда их верх
     доходит до 45% экрана. Части «рішення» — позже: когда верхняя кромка
     части (вместе с воздухом --story-solution-gap перед ней) встаёт на
     линию sticky-зачіпки (шапка + отступ). Фон начинает темнеть на этом
     отступе и к заголовку уже перетёк — тёмное не приходит раньше,
     чем читатель дошёл до самого решения. */
  function stickyLine() {
    var sticky = root.querySelector('.sc-story__sticky');
    var top = sticky ? parseFloat(getComputedStyle(sticky).top) : NaN;
    if (!isFinite(top) || top <= 0) {
      var aside = root.querySelector('.sc-story__aside');
      top = aside ? parseFloat(getComputedStyle(aside).top) : NaN;
    }
    return isFinite(top) && top > 0 ? top : 120;
  }

  /* Состояние считаем от живых координат, а не копим переходами.
     Почему так: обработчики «вошли/вышли» копят состояние, и стоит одному
     не сработать (ленивые картинки меняют высоту и сдвигают заранее
     посчитанные границы, быстрый скролл снизу проскакивает диапазон) —
     фраза и инверсия застревают. Здесь на каждый кадр скролла заново
     считаем, какая часть стоит на своей линии: ошибка не накапливается,
     возврат снизу вверх приводит блок в порядок сам. */
  var firstSolution = root.querySelector('[data-story-solution]');
  var firstSolutionIdx = firstSolution ? parts.indexOf(firstSolution) : parts.length;

  function lineFor(i) {
    /* «Проблема» переключается на 45% экрана, «рішення» — позже,
       по линии sticky-зачіпки (см. комментарий к stickyLine) */
    return i >= firstSolutionIdx ? stickyLine() : window.innerHeight * 0.45;
  }

  function resolve() {
    var active = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].getBoundingClientRect().top <= lineFor(i)) active = i;
    }
    var idx = parseInt(parts[active].getAttribute('data-story-hook-index'), 10);
    if (!isNaN(idx)) setHook(idx);
    setSolution(active >= firstSolutionIdx);
  }

  function bindParts() {
    /* Считаем прямо в обработчике: это пять чтений getBoundingClientRect,
       дешевле, чем кадр анимации, зато состояние верно и в тех прогонах,
       где rAF не идёт (headless-проверки, фоновая вкладка) */
    window.addEventListener('scroll', resolve, { passive: true });
    window.addEventListener('resize', resolve);
    /* картинки внутри статьи ленивые: когда догружаются, высоты меняются */
    window.addEventListener('load', resolve);
    resolve();
  }

  bindParts();

  /* ---------- Самоперевірка ---------- */
  var check = root.querySelector('[data-story-check]');
  if (check) {
    var items = Array.prototype.slice.call(check.querySelectorAll('[data-story-symptom]'));
    var counter = check.querySelector('[data-story-counter]');
    var bar = check.querySelector('[data-story-progress]');
    var prev = check.querySelector('[data-story-prev]');
    var next = check.querySelector('[data-story-next]');
    var interval = parseFloat(getComputedStyle(check).getPropertyValue('--story-check-interval')) || 6000;
    var auto = !reduced && items.length > 1;
    var index = 0, timer = null, paused = false;

    items.forEach(function (it, i) { it.hidden = false; if (it.hasAttribute('data-current')) index = i; });

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function render() {
      items.forEach(function (it, i) {
        if (i === index) it.setAttribute('data-current', ''); else it.removeAttribute('data-current');
      });
      if (counter) counter.textContent = pad(index + 1) + ' / ' + pad(items.length);
    }

    function armBar() {
      if (!bar) return;
      check.classList.remove('sc-is-running');
      check.style.setProperty('--story-check-fill', 0);
      if (!auto) return;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          check.classList.add('sc-is-running');
          check.style.setProperty('--story-check-fill', 1);
        });
      });
    }

    function schedule() {
      clearTimeout(timer);
      if (!auto || paused) return;
      timer = setTimeout(function () { go(index + 1); }, interval);
    }

    function go(i) {
      index = (i + items.length) % items.length;
      render(); armBar(); schedule();
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    function pause() {
      paused = true; clearTimeout(timer);
      if (!bar) return;
      var fill = bar.getBoundingClientRect().width / bar.parentNode.getBoundingClientRect().width;
      check.classList.remove('sc-is-running');
      check.style.setProperty('--story-check-fill', Math.min(1, Math.max(0, fill)).toFixed(3));
    }
    function resume() { if (!paused) return; paused = false; armBar(); schedule(); }

    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
    if (fine && fine.matches) {
      check.addEventListener('mouseenter', pause);
      check.addEventListener('mouseleave', resume);
    }
    check.addEventListener('focusin', pause);
    check.addEventListener('focusout', function (e) { if (!check.contains(e.relatedTarget)) resume(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearTimeout(timer); check.classList.remove('sc-is-running'); }
      else if (!paused) { armBar(); schedule(); }
    });

    render(); armBar(); schedule();
  }
}());
