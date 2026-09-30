/* ============================================================
   VM/Rubrics · варіант чипи — рубрика раскрывает темы, тема фильтрует
   figma: node-id=1123:875

   1. Клик по рубрике раскрывает её темы (повторный — сворачивает).
      Ленту рубрика не трогает.
   2. Тема без материалов на странице — disabled: скрипт сверяет
      data-topic с data-topics у карточек ленты.
   3. Темы выбираются независимо (можно несколько, из разных рубрик): под
      конфигуратором вместо «Свіже» — копии карточек хотя бы одной из
      выбранных тем. Отжать все темы или «Скинути» — обратно.
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
  /* порядковый номер для волны появления чипов (и ссылки «Усі матеріали» последней) */
  groups.forEach(function (g) {
    var items = all(g, '.vm-topics__tags > li');
    items.forEach(function (li, i) { li.style.setProperty('--i', i); });
    var link = g.querySelector('.vm-topics__all');
    if (link) link.style.setProperty('--i', items.length);
  });

  /* Раскрытие — класс sc-is-open (переход в CSS). При закрытии группа остаётся
     видимой, пока полочка сворачивается: меняем её только при открытии */
  function openRubric(id) {
    rubrics.forEach(function (b) { b.setAttribute('aria-expanded', b.getAttribute('data-rubric') === id ? 'true' : 'false'); });
    if (id) {
      groups.forEach(function (g) { g.hidden = g.getAttribute('data-rubric-panel') !== id; });
      panel.classList.add('sc-is-open');
      panel.inert = false;
    } else {
      panel.classList.remove('sc-is-open');
      panel.inert = true;
    }
  }

  rubrics.forEach(function (b) {
    b.addEventListener('click', function () {
      openRubric(b.getAttribute('aria-expanded') === 'true' ? null : b.getAttribute('data-rubric'));
    });
  });

  /* 3. темы → карточки. Темы не взаимоисключающие (2026-09-30): каждая
     нажимается и отжимается сама по себе, в выдаче — материалы хотя бы
     одной из выбранных тем, в том числе из разных рубрик */
  function clear() {
    tags.forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
    render();
  }

  function render() {
    var picked = tags.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; });
    list.innerHTML = '';
    current.innerHTML = '';
    if (!picked.length) {
      result.hidden = true;
      fresh.forEach(function (el) { el.hidden = false; });
      return;
    }
    var ids = picked.map(function (x) { return x.getAttribute('data-topic'); });
    cards.filter(function (c) {
      return topicsOf(c).some(function (t) { return ids.indexOf(t) >= 0; });
    }).forEach(function (c) {
      var li = document.createElement('li');
      var copy = c.cloneNode(true);
      /* ленивые картинки в копии: грузим сразу, наблюдатель img-lazy.js их не видит */
      all(copy, 'img[data-src]').forEach(function (img) { img.src = img.getAttribute('data-src'); });
      li.appendChild(copy);
      list.appendChild(li);
    });
    /* подпись каждой темы — целым узлом из её чипа, разделитель рисует CSS */
    picked.forEach(function (x) {
      var span = document.createElement('span');
      span.className = 'vm-topics__result-name';
      span.textContent = x.textContent;
      current.appendChild(span);
    });
    result.hidden = false;
    fresh.forEach(function (el) { el.hidden = true; });
  }

  tags.forEach(function (tag) {
    tag.addEventListener('click', function () {
      tag.setAttribute('aria-pressed', tag.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      render();
    });
  });

  if (reset) reset.addEventListener('click', clear);
}());
