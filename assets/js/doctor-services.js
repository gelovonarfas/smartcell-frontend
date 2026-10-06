/* ============================================================
   SC/Doctor · Послуги лікаря — плитка раскрывает полочку с услугами
   Та же механика, что тематики журнала (assets/js/vm-topics.js), без
   фильтра и адреса: клик по плитке раскрывает под её рядом подгруппы
   и чипы услуг, повторный клик или другая плитка — сворачивает / меняет.
   Полочка — пункт того же списка, что и плитки: скрипт ставит её сразу за
   последней плиткой ряда, где живёт нажатая (ряды — по offsetTop, сетка сама
   решает, сколько плиток в ряду). Закрытая полочка — inert.
   Тексты не собираются в JS.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-doctor-services]');
  if (!root) return;

  function all(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  var tiles = all(root, '[data-service]');
  var panel = root.querySelector('.sc-dsvc__panel');
  var panes = all(root, '[data-service-panel]');
  if (!tiles.length || !panel) return;

  /* порядковый номер для волны появления: подпись подгруппы, затем её чипы */
  panes.forEach(function (pane) {
    var i = 0;
    all(pane, '.sc-dsvc__subtitle, .sc-dindications__list > li').forEach(function (el) {
      el.style.setProperty('--i', i++);
    });
  });

  var openId = null;

  function rowEnd(li) {
    var last = li;
    tiles.forEach(function (b) {
      if (b.parentNode.offsetTop === li.offsetTop) last = b.parentNode;
    });
    return last;
  }

  function placePanel(id, keepOpen) {
    var end = rowEnd(root.querySelector('[data-service="' + id + '"]').parentNode);
    if (end.nextElementSibling === panel) return;
    panel.classList.add('sc-is-moving');
    if (!keepOpen) panel.classList.remove('sc-is-open');
    end.parentNode.insertBefore(panel, end.nextElementSibling);
    void panel.offsetHeight; /* зафиксировать закрытое состояние до раскрытия */
    panel.classList.remove('sc-is-moving');
  }

  function open(id) {
    openId = id;
    tiles.forEach(function (b) { b.setAttribute('aria-expanded', b.getAttribute('data-service') === id ? 'true' : 'false'); });
    if (id) {
      placePanel(id, false);
      panes.forEach(function (p) { p.hidden = p.getAttribute('data-service-panel') !== id; });
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

  tiles.forEach(function (b) {
    b.addEventListener('click', function () {
      open(b.getAttribute('aria-expanded') === 'true' ? null : b.getAttribute('data-service'));
    });
  });
}());
