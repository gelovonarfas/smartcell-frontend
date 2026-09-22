/* ============================================================
   VM/Rubrics · поиск по журналу
   figma: node-id=49:25

   В полосе поиск живёт свёрнутым — иконка и слово «Пошук». По клику
   поле разъезжается влево на всю свободную ширину, вкладки уступают
   место, курсор встаёт в поле и мигает. Пустое поле сворачивается,
   как только фокус ушёл; с введённым запросом остаётся раскрытым.

   Ширину ведёт CSS (переход по max-inline-size), здесь только класс
   состояния — чтобы кодеру не пришлось повторять анимацию в теме.
   ============================================================ */
(function () {
  'use strict';

  var form = document.querySelector('[data-vm-search]');
  if (!form) return;

  var root = form.closest('.vm-rubrics');
  var input = form.querySelector('[data-vm-search-input]');
  if (!input) return;

  function open() {
    form.classList.add('sc-is-open');
    if (root) root.classList.add('sc-is-searching');
  }

  function close() {
    if (input.value) return;   /* запрос набран — полосу не схлопываем */
    form.classList.remove('sc-is-open');
    if (root) root.classList.remove('sc-is-searching');
  }

  /* клик по иконке и по любому месту свёрнутой плашки ведёт в поле */
  form.addEventListener('mousedown', function (e) {
    if (e.target !== input) { e.preventDefault(); input.focus(); }
  });

  input.addEventListener('focus', open);
  input.addEventListener('blur', close);
}());
