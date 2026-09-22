/* ============================================================
   Ленивое видео: ролики не участвуют в первой отрисовке.

   Зачем: <video autoplay> качает файл сразу, наравне с постером и стилями,
   а первый кадр видео Chrome считает за LCP. На медленной сети хиро
   «появлялся» через 11 с — когда доезжало видео, хотя постер стоял с
   первой секунды. Поэтому в разметке у <source> стоит data-src, а не src:
   постер рисуется сразу, видео подставляется позже.

   Когда: ролик в первом экране — после события load страницы; остальные —
   когда секция подходит к вьюпорту (за 400px). При «уменьшить движение»
   видео не грузим вовсе: CSS секций и так показывает постер.
   Для темы: те же атрибуты, скрипт переносится как есть.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var videos = Array.prototype.slice.call(document.querySelectorAll('video'))
    .filter(function (v) { return v.querySelector('source[data-src]'); });
  if (!videos.length) return;

  /* Источник под экран: <source data-src="…" data-media="(max-width: 640px)">
     берётся, если запрос совпал; без data-media — общий. Атрибут media у
     <source> внутри <video> браузеры не поддерживают, поэтому выбор здесь.
     Остальные источники убираем, чтобы браузер не переключился на них сам. */
  function pick(video) {
    var sources = Array.prototype.slice.call(video.querySelectorAll('source[data-src]'));
    var chosen = null;
    sources.forEach(function (s) {
      var mq = s.getAttribute('data-media');
      if (!chosen && mq && window.matchMedia && window.matchMedia(mq).matches) chosen = s;
    });
    if (!chosen) sources.forEach(function (s) { if (!chosen && !s.getAttribute('data-media')) chosen = s; });
    sources.forEach(function (s) { if (s !== chosen) s.parentNode.removeChild(s); });
    return chosen;
  }

  /* Источник выбираем сразу, при разборе страницы: если у него свой постер
     (data-poster), он должен встать до первой отрисовки, а не после load */
  videos.forEach(function (v) {
    var source = pick(v);
    if (source && source.getAttribute('data-poster')) v.setAttribute('poster', source.getAttribute('data-poster'));
  });

  function start(video) {
    if (video.getAttribute('data-video-started')) return;
    video.setAttribute('data-video-started', '1');
    var source = video.querySelector('source[data-src]');
    if (!source) return;
    /* Постер, отложенный до старта (полосы ниже первого экрана): не тянуть
       его вместе с обложкой первого экрана */
    if (video.getAttribute('data-poster')) video.setAttribute('poster', video.getAttribute('data-poster'));
    source.setAttribute('src', source.getAttribute('data-src'));
    source.removeAttribute('data-src');
    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* автоплей запрещён — остаётся постер */ });
  }

  function inFirstScreen(video) {
    var r = video.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  var later = [];
  videos.forEach(function (v) {
    if (inFirstScreen(v)) {
      /* первый экран: после load, чтобы не толкаться с постером и стилями */
      if (document.readyState === 'complete') start(v);
      else window.addEventListener('load', function () { start(v); }, { once: true });
    } else {
      later.push(v);
    }
  });

  if (!later.length) return;
  if (!('IntersectionObserver' in window)) { later.forEach(start); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      start(e.target);
    });
  }, { rootMargin: '400px 0px' });
  later.forEach(function (v) { io.observe(v); });

  /* Страховка: если наблюдатель по какой-то причине молчит, ролики ниже
     стартуют на первой прокрутке — к этому моменту первый экран уже отрисован
     и LCP зафиксирован, а до секций ещё далеко. */
  window.addEventListener('scroll', function () {
    later.forEach(function (v) { io.unobserve(v); start(v); });
  }, { once: true, passive: true });
}());
