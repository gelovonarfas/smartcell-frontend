/* ============================================================
   B09 · лента отзывов — Control/SliderNav + Control/Progress
   figma: node-id=15:76

   Шаг листания — один отзыв. Сколько карточек помещается в кадр,
   считаем из ширины: три на десктопе, одна на телефоне. Полоса под
   стрелками отсчитывает интервал и по концу шагает ленту дальше;
   дойдя до конца, лента возвращается к первому отзыву.

   Наведение и фокус ставят таймер на паузу. При prefers-reduced-motion
   автолистания нет — только стрелки.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-reviews]');
  if (!root) return;

  var track = root.querySelector('[data-reviews-track]');
  var items = track ? Array.prototype.slice.call(track.children) : [];
  if (items.length < 2) return;

  var prev = root.querySelector('[data-reviews-prev]');
  var next = root.querySelector('[data-reviews-next]');
  var counter = root.querySelector('[data-reviews-counter]');
  var bar = root.querySelector('[data-reviews-progress]');
  var viewport = root.querySelector('.sc-reviews__viewport');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var auto = !(reduced && reduced.matches);

  var interval = parseFloat(getComputedStyle(root).getPropertyValue('--reviews-interval')) || 5000;

  var index = 0;
  var timer = null;
  var paused = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* сколько карточек в кадре: три на десктопе, одна на телефоне */
  var narrow = window.matchMedia && window.matchMedia('(max-width: 640px)');
  function perView() { return narrow && narrow.matches ? 1 : 3; }

  /* Ширина карточки — целое число пикселей, окно ужимается до «N карточек»:
     иначе кромка-разделитель ложится между пикселями и размывается.
     Зазоров между карточками нет: линию рисует кромка самой карточки
     (b09-reviews.css, правка 2026-09-14). Потеря — до двух пикселей окна. */
  function fit() {
    if (!viewport) return;
    var n = perView();
    viewport.style.inlineSize = '';
    root.style.removeProperty('--reviews-card-w');
    var inner = viewport.clientWidth;               /* без рамки */
    var cw = Math.floor(inner / n);
    root.style.setProperty('--reviews-card-w', cw + 'px');
    var frame = viewport.offsetWidth - inner;       /* рамка слева и справа */
    viewport.style.inlineSize = (n * cw + frame) + 'px';
  }

  function maxIndex() { return Math.max(0, items.length - perView()); }

  function render() {
    fit();
    if (index > maxIndex()) index = maxIndex();
    /* сдвиг округляем: дробный translate размывает кромки карточек */
    root.style.setProperty('--reviews-shift', (-Math.round(items[index].offsetLeft)) + 'px');
    if (counter) counter.textContent = pad(index + 1) + ' / ' + pad(items.length);
    var single = maxIndex() === 0;
    if (prev) prev.disabled = single;
    if (next) next.disabled = single;
  }

  /* Полосу заполняем в два шага: мгновенно сбрасываем в 0,
     кадром позже — включаем переход до 1 длиной в интервал. */
  function armBar() {
    if (!bar) return;
    root.classList.remove('sc-is-running');
    root.style.setProperty('--reviews-fill', 0);
    if (!auto || maxIndex() === 0) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('sc-is-running');
        root.style.setProperty('--reviews-fill', 1);
      });
    });
  }

  function schedule() {
    clearTimeout(timer);
    if (!auto || paused || maxIndex() === 0) return;
    timer = setTimeout(function () { go(index + perView()); }, interval);
  }

  /* Шаг — кадр целиком: три карточки на десктопе, одна на телефоне */
  function go(i) {
    var max = maxIndex();
    index = i < 0 ? max : (i > max ? 0 : Math.min(i, max));
    render();
    armBar();
    schedule();
  }

  if (prev) prev.addEventListener('click', function () { go(index === 0 ? -1 : index - perView()); });
  if (next) next.addEventListener('click', function () { go(index >= maxIndex() ? maxIndex() + 1 : index + perView()); });

  function pause() {
    paused = true;
    clearTimeout(timer);
    if (!bar) return;
    var fill = bar.getBoundingClientRect().width / bar.parentNode.getBoundingClientRect().width;
    root.classList.remove('sc-is-running');
    root.style.setProperty('--reviews-fill', Math.min(1, Math.max(0, fill)).toFixed(3));
  }

  function resume() {
    if (!paused) return;
    paused = false;
    armBar();
    schedule();
  }

  /* Пауза по наведению — только на курсорных устройствах и только над самой
     лентой и стрелками: секция во всю ширину, и курсор, случайно оставленный
     в её пустой части, останавливал листание насовсем. */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
  if (fine && fine.matches) {
    var zones = [viewport, root.querySelector('.sc-reviews__controls')];
    for (var z = 0; z < zones.length; z++) {
      if (!zones[z]) continue;
      zones[z].addEventListener('mouseenter', pause);
      zones[z].addEventListener('mouseleave', resume);
    }
  }

  /* Клавиатура: пока фокус внутри блока, лента стоит */
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) resume();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(timer); root.classList.remove('sc-is-running'); }
    else if (!paused) { armBar(); schedule(); }
  });

  /* смена ширины меняет число видимых карточек — пересчитываем шаг */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { render(); }, 150);
  });

  render();
  armBar();
  schedule();
}());
