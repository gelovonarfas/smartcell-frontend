/* ============================================================
   B00b · Header — меню «Напрямки» (ПРОБА 2026-10-04)
   Кнопка «Напрямки» открывает полку разделов под шапкой.
   Закрытие: повторный клик, Esc (фокус возвращается на кнопку),
   клик мимо полки, переход по ссылке, открытие портала логотипа.
   Закрытая полка — inert: фокус и скринридер внутрь не попадают.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-directions]');
  if (!root) return;

  var trigger = root.querySelector('[data-directions-trigger]');
  var panel = root.querySelector('[data-directions-panel]');
  var header = root.closest('[data-header]');
  if (!trigger || !panel) return;

  function isOpen() { return trigger.getAttribute('aria-expanded') === 'true'; }

  function set(open) {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('sc-is-open', open);
    if (header) header.classList.toggle('sc-hdir-open', open);
    panel.inert = !open;
  }

  trigger.addEventListener('click', function () { set(!isOpen()); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { set(false); trigger.focus(); }
  });

  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (root.contains(e.target)) {
      if (e.target.closest('a')) set(false);   /* ушли по ссылке */
      return;
    }
    set(false);                                /* клик мимо полки */
  });

  /* портал логотипа и меню «Напрямки» не открыты одновременно */
  var portal = document.querySelector('[data-portal-trigger]');
  if (portal) portal.addEventListener('click', function () { if (isOpen()) set(false); });

  set(false);
}());
