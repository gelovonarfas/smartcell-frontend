/* ============================================================
   Сборка <picture> из имени файла.

   Единственное место, где живёт базовый путь к ассетам: при переносе
   в тему virtus меняется здесь, а не в десяти разметках.

   Ожидаемая раскладка файлов (см. assets/README.md):
     assets/<name>.jpg      @1x        assets/<name>@2x.jpg

   WebP-вариантов больше нет: экспорт из Figma даёт JPEG, а держать
   в ките половину кадров в webp и половину без — источник битых <source>.
   Если кодер соберёт webp на стороне темы, <source> возвращается сюда.
   ============================================================ */
(function () {
  'use strict';

  var BASE = 'assets/';

  function picture(opts) {
    var size = opts.size;
    var sizes = opts.sizes || '(max-width: 640px) 100vw, ' + size + 'px';

    var box = document.createElement('picture');
    box.className = 'sc-media--square' + (opts.className ? ' ' + opts.className : '');

    var img = document.createElement('img');
    img.src = BASE + opts.name + '.jpg';
    img.srcset = BASE + opts.name + '.jpg ' + size + 'w, ' +
                 BASE + opts.name + '@2x.jpg ' + (size * 2) + 'w';
    img.sizes = sizes;
    /* размеры обязательны: без них лейаут прыгает на загрузке */
    img.width = size;
    img.height = size;
    img.alt = opts.alt || '';
    img.decoding = 'async';
    if (opts.eager) { img.loading = 'eager'; img.setAttribute('fetchpriority', 'high'); }
    else { img.loading = 'lazy'; }

    box.appendChild(img);
    return box;
  }

  /* Кадры состояний тянем один раз, чтобы переключение шло без белого кадра */
  function preload(names) {
    for (var i = 0; i < names.length; i++) {
      if (!names[i]) continue;
      var img = new Image();
      img.src = BASE + names[i] + '@2x.jpg';
    }
  }

  window.SC = window.SC || {};
  window.SC.media = { base: BASE, picture: picture, preload: preload };
}());
