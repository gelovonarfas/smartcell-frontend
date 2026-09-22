/* ============================================================
   A/Hero · подхват перехода из ленты журнала

   Стрелка «читати» в VM/Featured съезжает обкладинкой прямо в рамку
   обложки статьи (assets/js/vm-featured.js). Статья открывается тем же
   кадром в тех же координатах: снимок стоит поверх своего фото, пока то
   не разложится, и растворяется. Для читателя это одно движение, а не
   две разные страницы (решение 2026-09-08). Полотна на весь экран нет.

   Геометрия приходит в sessionStorage под ключом sc-cover-handoff; ключ
   одноразовый, поэтому обновление страницы или переход по прямой ссылке
   открывают статью обычным образом. При prefers-reduced-motion подхвата нет.

   Кодеру: скрипт ничего не выводит и не меняет разметку — если его убрать,
   статья работает как обычно.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'sc-cover-handoff';
  var raw = null;

  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);   /* ключ одноразовый */
  } catch (e) { return; }

  if (!raw) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced && reduced.matches) return;

  var media = document.querySelector('.vm-article__hero-media');
  var cover = media && media.querySelector('img');
  if (!cover) return;

  var from;
  try { from = JSON.parse(raw); } catch (e) { return; }
  if (!from || !from.w) return;

  /* Летящий кадр — снимок обкладинки из ленты, не сама вёрстка статьи */
  var flyer = document.createElement('img');
  flyer.className = 'vm-article__flyer';
  flyer.alt = '';
  flyer.src = from.src;
  flyer.style.setProperty('--flyer-x', from.x + 'px');
  flyer.style.setProperty('--flyer-y', from.y + 'px');
  flyer.style.setProperty('--flyer-w', from.w + 'px');
  flyer.style.setProperty('--flyer-h', from.h + 'px');

  document.body.appendChild(flyer);
  media.classList.add('sc-is-handoff');   /* своё фото прячем, пока летит кадр */

  function land() {
    var box = media.getBoundingClientRect();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        flyer.classList.add('sc-is-landing');
        flyer.style.setProperty('--flyer-x', Math.round(box.left) + 'px');
        flyer.style.setProperty('--flyer-y', Math.round(box.top) + 'px');
        flyer.style.setProperty('--flyer-w', Math.round(box.width) + 'px');
        flyer.style.setProperty('--flyer-h', Math.round(box.height) + 'px');
      });
    });

    var cs = getComputedStyle(document.documentElement);
    var dur = parseFloat(cs.getPropertyValue('--sc-dur-slow')) || 600;
    var fade = parseFloat(cs.getPropertyValue('--sc-dur-fast')) || 160;

    /* Своё фото открываем ровно к началу растворения снимка: если обкладинка
       та же, подмены не видно совсем; если статья ещё с другим кадром —
       это мягкий переход, а не скачок. */
    setTimeout(function () {
      media.classList.remove('sc-is-handoff');
    }, Math.max(0, dur - fade));

    setTimeout(function () {
      if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
    }, dur);
  }

  /* Ждём, пока кадр статьи разложится: иначе прилетим по старым координатам */
  if (document.readyState === 'complete') land();
  else window.addEventListener('load', land);
}());
