/* ============================================================
   VM/Rubrics · тематики (плитки) — рубрика раскрывает темы, тема фильтрует
   figma: node-id=1123:875

   1. Клик по рубрике раскрывает её темы (повторный — сворачивает).
      Ленту рубрика не трогает.
   2. Тема без материалов на странице — disabled: скрипт сверяет
      data-topic с data-topics у карточек ленты.
   3. Темы выбираются независимо (можно несколько, из разных рубрик): под
      конфигуратором вместо «Свіже» — копии карточек хотя бы одной из
      выбранных тем. Отжать все темы или «Скинути» — обратно.
   4. Выбор пишется в адрес после # и восстанавливается по ссылке;
      страница при этом не перезагружается.
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
     видимой, пока полочка сворачивается: меняем её только при открытии.
     Полочка — пункт того же списка, что и плитки: ставим её сразу за последней
     плиткой ряда, где живёт нажатая рубрика (ряды считаем по offsetTop —
     сетка сама решает, сколько плиток в ряду). Переезд в другой ряд — без
     анимации закрытия, раскрытие на новом месте — с анимацией */
  var openId = null;

  function rowEnd(li) {
    var last = li;
    rubrics.forEach(function (b) {
      if (b.parentNode.offsetTop === li.offsetTop) last = b.parentNode;
    });
    return last;
  }

  function placePanel(id, keepOpen) {
    var end = rowEnd(root.querySelector('[data-rubric="' + id + '"]').parentNode);
    if (end.nextElementSibling === panel) return;
    panel.classList.add('sc-is-moving');
    if (!keepOpen) panel.classList.remove('sc-is-open');
    end.parentNode.insertBefore(panel, end.nextElementSibling);
    void panel.offsetHeight; /* зафиксировать закрытое состояние до раскрытия */
    panel.classList.remove('sc-is-moving');
  }

  function openRubric(id) {
    openId = id;
    rubrics.forEach(function (b) { b.setAttribute('aria-expanded', b.getAttribute('data-rubric') === id ? 'true' : 'false'); });
    if (id) {
      placePanel(id, false);
      groups.forEach(function (g) { g.hidden = g.getAttribute('data-rubric-panel') !== id; });
      panel.classList.add('sc-is-open');
      panel.inert = false;
    } else {
      panel.classList.remove('sc-is-open');
      panel.inert = true;
    }
  }

  /* Ширина поменялась — плиток в ряду может стать другое число */
  var resizeFrame = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(function () {
      if (openId) placePanel(openId, true);
    });
  });

  rubrics.forEach(function (b) {
    b.addEventListener('click', function () {
      openRubric(b.getAttribute('aria-expanded') === 'true' ? null : b.getAttribute('data-rubric'));
    });
  });

  /* 3. темы → карточки. Темы не взаимоисключающие (2026-09-30): каждая
     нажимается и отжимается сама по себе, в выдаче — материалы хотя бы
     одной из выбранных тем, в том числе из разных рубрик.

     Выбор живёт в адресе после # (#topics=krasa-1,krasa-5): ссылкой можно
     поделиться, а поисковик такие адреса не обходит — комбинации тем не
     плодят страниц (совет Google для фильтров, faceted navigation).
     Страница не перезагружается: адрес меняет history.replaceState,
     карточки приходят из loadCards. */

  /* ЗАМЕНИТЬ В ТЕМЕ. В вёрстке карточки берутся из ленты на этой странице.
     На сайте — запрос к REST API, например
       fetch('/wp-json/wp/v2/posts?topics=12,15&per_page=12&_embed')
     и отрисовка ответа той же разметкой .sc-mag__card (или admin-ajax,
     который отдаёт готовый HTML карточек). Контракт: принимает ключи тем,
     возвращает Promise со списком элементов-карточек. */
  function loadCards(ids) {
    var found = cards.filter(function (c) {
      return topicsOf(c).some(function (t) { return ids.indexOf(t) >= 0; });
    }).map(function (c) {
      var copy = c.cloneNode(true);
      /* ленивые картинки в копии: грузим сразу, наблюдатель img-lazy.js их не видит */
      all(copy, 'img[data-src]').forEach(function (img) { img.src = img.getAttribute('data-src'); });
      return copy;
    });
    return Promise.resolve(found);
  }

  var HASH_KEY = 'topics=';
  var request = 0; /* номер последнего запроса: ответ на устаревший выбор не рисуем */

  function pickedTags() {
    return tags.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; });
  }

  function writeHash(ids) {
    var base = location.pathname + location.search;
    history.replaceState(history.state, '', ids.length ? base + '#' + HASH_KEY + ids.join(',') : base);
  }

  function readHash() {
    var h = location.hash.slice(1);
    if (h.indexOf(HASH_KEY) !== 0) return [];
    return decodeURIComponent(h.slice(HASH_KEY.length)).split(',').filter(Boolean);
  }

  function render() {
    var picked = pickedTags();
    var ids = picked.map(function (x) { return x.getAttribute('data-topic'); });
    var my = ++request;
    writeHash(ids);
    current.innerHTML = '';

    if (!ids.length) {
      list.innerHTML = '';
      result.hidden = true;
      result.removeAttribute('aria-busy');
      fresh.forEach(function (el) { el.hidden = false; });
      return;
    }

    /* подпись каждой темы — целым узлом из её чипа, разделитель рисует CSS */
    picked.forEach(function (x) {
      var span = document.createElement('span');
      span.className = 'vm-topics__result-name';
      span.textContent = x.textContent;
      current.appendChild(span);
    });
    result.hidden = false;
    fresh.forEach(function (el) { el.hidden = true; });
    result.setAttribute('aria-busy', 'true'); /* загрузка: старые карточки приглушены */

    loadCards(ids).then(function (found) {
      if (my !== request) return;
      list.innerHTML = '';
      found.forEach(function (card) {
        var li = document.createElement('li');
        li.appendChild(card);
        list.appendChild(li);
      });
      result.removeAttribute('aria-busy');
    }, function () {
      if (my !== request) return;
      result.removeAttribute('aria-busy');
    });
  }

  function clear() {
    tags.forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
    render();
  }

  /* Выбор из адреса: при открытии ссылки и при ручной правке # */
  function applyHash() {
    var ids = readHash();
    tags.forEach(function (t) {
      var on = !t.disabled && ids.indexOf(t.getAttribute('data-topic')) >= 0;
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var first = pickedTags()[0];
    if (first) openRubric(first.closest('[data-rubric-panel]').getAttribute('data-rubric-panel'));
    render();
  }

  tags.forEach(function (tag) {
    tag.addEventListener('click', function () {
      tag.setAttribute('aria-pressed', tag.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      render();
    });
  });

  if (reset) reset.addEventListener('click', clear);

  window.addEventListener('hashchange', applyHash);
  if (readHash().length) applyHash();
}());
