/* ============================================================
   Колонки подвала — аккордеон на планшете и телефоне.

   Разметка приходит раскрытой (<details open>): без JS список ссылок
   остаётся доступным. Скрипт только сворачивает колонки ниже 1024
   и разворачивает обратно на десктопе.
   ============================================================ */

(function () {
  var cols = document.querySelectorAll('.sc-footer__col');
  if (!cols.length || !window.matchMedia) return;

  var narrow = window.matchMedia('(max-width: 1024px)');
  var touched = false; /* пользователь сам открывал колонку — не мешаем */

  function sync() {
    for (var i = 0; i < cols.length; i++) cols[i].open = !narrow.matches;
  }

  for (var i = 0; i < cols.length; i++) {
    var head = cols[i].querySelector('summary');
    if (head) head.addEventListener('click', function () {
      if (narrow.matches) touched = true;
    });
  }

  function onChange() {
    touched = false;
    sync();
  }

  if (narrow.addEventListener) narrow.addEventListener('change', onChange);
  else narrow.addListener(onChange); /* Safari < 14 */

  if (!touched) sync();
})();
