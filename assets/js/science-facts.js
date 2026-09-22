/* ============================================================
   B08 · автослайдер фактов — Control/SliderNav · progress=on
   figma: node-id=4:291

   Показывается один факт из N. Полоса под стрелками — таймер: заполняется
   на всю ширину за интервал показа, по концу отсчёта переключает на
   следующий факт и начинается заново. Наведение и фокус ставят её на паузу.
   Стрелки листают вручную и перезапускают отсчёт.

   При prefers-reduced-motion автоперелистывания нет — только стрелки.
   Тексты фактов лежат в разметке целиком: ничего не склеивается.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-science]');
  if (!root) return;

  var facts = Array.prototype.slice.call(root.querySelectorAll('[data-fact]'));
  if (facts.length < 2) return;

  var prev = root.querySelector('[data-facts-prev]');
  var next = root.querySelector('[data-facts-next]');
  var counter = root.querySelector('[data-facts-counter]');
  var bar = root.querySelector('[data-facts-progress]');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var auto = !(reduced && reduced.matches);

  /* интервал берём из CSS, чтобы полоса и таймер шли вровень */
  var interval = parseFloat(getComputedStyle(root).getPropertyValue('--science-interval')) || 5000;

  var index = 0;
  var timer = null;
  var paused = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function render() {
    facts.forEach(function (f, i) { f.hidden = i !== index; });
    if (counter) counter.textContent = pad(index + 1) + ' / ' + pad(facts.length);
    root.style.setProperty('--facts-index', index);
  }

  /* Полосу заполняем в два шага: мгновенно сбрасываем в 0,
     кадром позже — включаем переход до 1 длиной в интервал. */
  function armBar() {
    if (!bar) return;
    root.classList.remove('sc-is-running');
    root.style.setProperty('--facts-fill', 0);
    if (!auto) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('sc-is-running');
        root.style.setProperty('--facts-fill', 1);
      });
    });
  }

  function schedule() {
    clearTimeout(timer);
    if (!auto || paused) return;
    timer = setTimeout(function () { go(index + 1); }, interval);
  }

  function go(i) {
    index = (i + facts.length) % facts.length;
    render();
    armBar();
    schedule();
  }

  if (prev) prev.addEventListener('click', function () { go(index - 1); });
  if (next) next.addEventListener('click', function () { go(index + 1); });

  /* Пауза: курсор над блоком или фокус внутри — таймер стоит, полоса замирает */
  function pause() {
    paused = true;
    clearTimeout(timer);
    if (!bar) return;
    /* фиксируем текущую ширину заливки, чтобы переход не докрутился сам */
    var fill = bar.getBoundingClientRect().width / bar.parentNode.getBoundingClientRect().width;
    root.classList.remove('sc-is-running');
    root.style.setProperty('--facts-fill', Math.min(1, Math.max(0, fill)).toFixed(3));
  }

  function resume() {
    if (!paused) return;
    paused = false;
    /* дозаполняем остаток за пропорциональное время — проще перезапустить факт */
    armBar();
    schedule();
  }

  var facts_box = root.querySelector('.sc-science__facts');
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
  if (facts_box) {
    /* наведение тормозит только на курсорных устройствах */
    if (fine && fine.matches) {
      facts_box.addEventListener('mouseenter', pause);
      facts_box.addEventListener('mouseleave', resume);
    }
    facts_box.addEventListener('focusin', pause);
    facts_box.addEventListener('focusout', function (e) {
      if (!facts_box.contains(e.relatedTarget)) resume();
    });
  }

  /* В фоновой вкладке таймер не крутим */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(timer); root.classList.remove('sc-is-running'); }
    else if (!paused) { armBar(); schedule(); }
  });

  render();
  armBar();
  schedule();
}());
