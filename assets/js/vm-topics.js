/* ============================================================
   VM/Rubrics · варіант чипи — рубрика раскрывает темы, тема фильтрует
   figma: node-id=1123:875

   1. Клик по рубрике раскрывает её темы (повторный — сворачивает).
      Ленту рубрика не трогает.
   2. Тема без материалов на странице — disabled: скрипт сверяет
      data-topic с data-topics у карточек ленты.
   3. Клик по теме: под конфигуратором вместо «Свіже» — копии карточек
      этой темы со всей ленты. Повторный клик или «Скинути» — обратно.
   Тексты не собираются в JS: подпись темы копируется из её чипа.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-vm-topics]');
  if (!root) return;

  function all(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  var rubrics = all(root, '[data-rubric]');
  var panel = root.querySelector('.vm-topics__panel');
  var groups = all(root, '[data-rubric-panel]');
  var tags = all(root, '[data-topic]');
  var result = root.querySelector('[data-topics-result]');
  var list = root.querySelector('[data-topics-list]');
  var current = root.querySelector('[data-topics-current]');
  var reset = root.querySelector('[data-topics-reset]');

  /* лента «Свіже» в той же секции — её прячем, пока выбран фильтр */
  var section = root.closest('section');
  var fresh = section ? all(section, ':scope > .vm-feed__title, :scope > .vm-feed__rows') : [];

  /* карточки ленты по уникальному заголовку (карточка может встречаться дважды) */
  var cards = [];
  var seen = {};
  all(document, '.sc-mag__card[data-topics]').forEach(function (c) {
    if (root.contains(c)) return;
    var t = c.querySelector('.sc-mag__title');
    var key = t ? t.textContent.trim() : Math.random();
    if (seen[key]) return;
    seen[key] = true;
    cards.push(c);
  });

  function topicsOf(card) { return card.getAttribute('data-topics').split(/\s+/); }

  /* 2. темы без материалов */
  tags.forEach(function (tag) {
    var t = tag.getAttribute('data-topic');
    var has = cards.some(function (c) { return topicsOf(c).indexOf(t) >= 0; });
    if (!has) tag.disabled = true;
  });

  /* 1. рубрика → темы */
  function openRubric(id) {
    rubrics.forEach(function (b) { b.setAttribute('aria-expanded', b.getAttribute('data-rubric') === id ? 'true' : 'false'); });
    groups.forEach(function (g) { g.hidden = g.getAttribute('data-rubric-panel') !== id; });
    panel.hidden = !id;
  }

  rubrics.forEach(function (b) {
    b.addEventListener('click', function () {
      openRubric(b.getAttribute('aria-expanded') === 'true' ? null : b.getAttribute('data-rubric'));
    });
  });

  /* 3. тема → карточки */
  function clear() {
    tags.forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
    list.innerHTML = '';
    result.hidden = true;
    fresh.forEach(function (el) { el.hidden = false; });
  }

  function filter(tag) {
    var t = tag.getAttribute('data-topic');
    tags.forEach(function (x) { x.setAttribute('aria-pressed', x === tag ? 'true' : 'false'); });
    list.innerHTML = '';
    cards.filter(function (c) { return topicsOf(c).indexOf(t) >= 0; }).forEach(function (c) {
      var li = document.createElement('li');
      var copy = c.cloneNode(true);
      /* ленивые картинки в копии: грузим сразу, наблюдатель img-lazy.js их не видит */
      all(copy, 'img[data-src]').forEach(function (img) { img.src = img.getAttribute('data-src'); });
      li.appendChild(copy);
      list.appendChild(li);
    });
    current.textContent = tag.textContent;
    result.hidden = false;
    fresh.forEach(function (el) { el.hidden = true; });
  }

  tags.forEach(function (tag) {
    tag.addEventListener('click', function () {
      if (tag.getAttribute('aria-pressed') === 'true') clear();
      else filter(tag);
    });
  });

  if (reset) reset.addEventListener('click', clear);
}());
