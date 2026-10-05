/* ============================================================
   VM · Editorial list — парящее превью строки
   figma: node-id=52:11

   Квадратная картинка следует за курсором с задержкой (lerp) и лёгким
   наклоном по направлению движения — приём, привычный по Webflow-сайтам.
   Запускается только при точном указателе и без prefers-reduced-motion:
   на тачах и при просьбе убрать анимацию превью не показывается вовсе.
   ============================================================ */
(function () {
  'use strict';

  var EASE = 0.15;      /* доля пути к курсору за кадр */
  var TILT_MAX = 8;     /* градусы наклона на быстром движении */
  var MIN_WIDTH = 641;  /* уже мобильного брейкпоинта квадрат закрывает пол-экрана */

  var sections = document.querySelectorAll('[data-editorial]');
  if (!sections.length) return;

  if (!window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function setup(section) {
    var preview = section.querySelector('[data-editorial-preview]');
    /* картинку ищем по месту, а не по классу: тот же скрипт ведёт превью
       плиток «Види послуги» на странице напрямку (2026-10-04) */
    var img = preview && preview.querySelector('img');
    var rows = section.querySelectorAll('[data-editorial-row]');
    if (!preview || !img || !rows.length) return;

    /* Превью существует только когда скрипт жив — см. :not(.sc-is-ready) в CSS */
    preview.classList.add('sc-is-ready');

    var targetX = 0, targetY = 0, x = 0, y = 0, prevX = 0, tilt = 0;
    var active = false, raf = null, placed = false;
    var offset = parseFloat(getComputedStyle(preview).getPropertyValue('--preview-offset')) || 0;

    /* предзагрузка, чтобы картинка не мигала на первом наведении */
    for (var i = 0; i < rows.length; i++) {
      var src = rows[i].getAttribute('data-preview');
      if (src) { var pre = new Image(); pre.src = src; }
    }

    function render() {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;

      var dx = x - prevX;
      prevX = x;
      var wanted = Math.max(-TILT_MAX, Math.min(TILT_MAX, dx * 0.6));
      tilt += (wanted - tilt) * 0.1;

      /* Квадрат держится чуть справа от курсора, а не под ним (2026-10-05):
         левая кромка — на --preview-offset правее; у правого края окна
         прижимается к нему, а не уезжает за экран.
         Было: центр квадрата на курсоре — translate(-50%,-50%). */
      var w = preview.offsetWidth;
      var tx = Math.min(x + offset, window.innerWidth - w - offset);
      preview.style.transform =
        'translate3d(' + tx.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)' +
        ' translateY(-50%) rotate(' + tilt.toFixed(2) + 'deg)';

      if (active || Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1) {
        raf = requestAnimationFrame(render);
      } else {
        raf = null;
      }
    }

    function start() {
      if (raf === null) raf = requestAnimationFrame(render);
    }

    section.addEventListener('mousemove', function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!placed) { x = targetX; y = targetY; prevX = x; placed = true; }
      if (active) start();
    });

    function show(row) {
      /* проверяем на каждом показе, а не один раз при старте: окно могли
         сузить или повернуть устройство уже после загрузки */
      if (window.innerWidth < MIN_WIDTH) return;
      var src = row.getAttribute('data-preview');
      if (!src) return;
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      active = true;
      preview.classList.add('sc-is-visible');
      start();
    }

    function hide() {
      active = false;
      preview.classList.remove('sc-is-visible');
    }

    for (var j = 0; j < rows.length; j++) {
      rows[j].addEventListener('mouseenter', function () { show(this); });
      rows[j].addEventListener('mouseleave', hide);
    }

    section.addEventListener('mouseleave', hide);
    window.addEventListener('resize', function () {
      if (window.innerWidth < MIN_WIDTH) hide();
    });
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
