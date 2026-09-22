/* ============================================================
   VM/Featured · слайдер головних матеріалів
   figma: node-id=343:145

   Одна и та же механика, что у ленты отзывов и фактов B08: стрелки
   листают вручную, полоса под ними отсчитывает интервал и по концу
   переключает материал. Наведение на курсорных устройствах и фокус
   ставят отсчёт на паузу.

   Материалы приходят из ACF-репитера: кодер выводит N слайдов
   в [data-vm-featured-slide] и столько же фото в [data-vm-featured-media];
   здесь только переключение видимости по общему индексу, чтобы каждая
   строка оставалась цельным текстовым узлом.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-vm-featured]');
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-vm-featured-slide]'));
  var medias = Array.prototype.slice.call(root.querySelectorAll('[data-vm-featured-media]'));
  var read = root.querySelector('[data-vm-featured-read]');
  var prev = root.querySelector('[data-vm-featured-prev]');
  var next = root.querySelector('[data-vm-featured-next]');
  var counter = root.querySelector('[data-vm-featured-counter]');
  var bar = root.querySelector('[data-vm-featured-progress]');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var auto = !(reduced && reduced.matches);

  /* пока слайд один, листать нечего: стрелки гасим, полосу не крутим */
  /* пока слайды не выведены, счётчик берёт число из data-атрибута макета */
  var total = slides.length || parseInt(root.getAttribute('data-vm-featured-total'), 10) || 1;
  var interval = parseFloat(getComputedStyle(root).getPropertyValue('--vm-featured-interval')) || 6000;

  var index = 0;
  var timer = null;
  var paused = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function render() {
    /* копия и фото — два списка с одним индексом: стрелка «читати» ведёт туда же */
    for (var i = 0; i < slides.length; i++) slides[i].hidden = i !== index;
    for (var m = 0; m < medias.length; m++) medias[m].hidden = m !== index;
    /* Стрелка ведёт туда же, куда заголовок. Если у слайда ссылки нет
       (материал ещё не сверстан), стрелку убираем — жать не на что. */
    if (read) {
      var link = slides[index] && slides[index].querySelector('a');
      if (link) {
        read.href = link.getAttribute('href');
        read.hidden = false;
      } else {
        read.removeAttribute('href');
        read.hidden = true;
      }
    }
    if (counter) counter.textContent = pad(index + 1) + ' / ' + pad(total);
    if (prev) prev.disabled = total < 2;
    if (next) next.disabled = total < 2;
  }

  function armBar() {
    if (!bar) return;
    root.classList.remove('sc-is-running');
    root.style.setProperty('--vm-featured-fill', 0);
    if (!auto || paused || total < 2) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('sc-is-running');
        root.style.setProperty('--vm-featured-fill', 1);
      });
    });
  }

  /* Следующий кадр греем заранее: скрытые кадры ленивые, и без прогрева
     переключение на медленной сети рисовало картинку через 4 с после смены —
     Lighthouse считал её LCP на 18-й секунде (замер 2026-09-22). */
  function warm(i, done) {
    var img = medias.length ? medias[(i + total) % total].querySelector('img') : null;
    if (!img || img.complete && img.naturalWidth) { if (done) done(); return; }
    var pre = new Image();
    if (img.getAttribute('sizes')) pre.sizes = img.getAttribute('sizes');
    if (img.getAttribute('srcset')) pre.srcset = img.getAttribute('srcset');
    pre.src = img.getAttribute('src');
    var fin = function () { if (done) { var d = done; done = null; d(); } };
    pre.onload = fin; pre.onerror = fin;
    if (pre.decode) pre.decode().then(fin, fin);
  }

  function schedule() {
    clearTimeout(timer);
    if (!auto || paused || total < 2) return;
    timer = setTimeout(function () {
      /* переключаемся только с готовым кадром */
      warm(index + 1, function () { if (!paused) go(index + 1); });
    }, interval);
  }

  function go(i) {
    index = (i + total) % total;
    render();
    armBar();
    schedule();
  }

  if (prev) prev.addEventListener('click', function () { go(index - 1); });
  if (next) next.addEventListener('click', function () { go(index + 1); });

  /* ---------- Переход в статью ----------
     Стрелка «читати» не просто ведёт по ссылке: обкладинка съезжает ровно
     в ту рамку, где она стоит в шапке статьи (квадрат 582 в правой части
     полосы, см. vm-article.css), и уже там открывается статья — тем же кадром.
     Полотна на весь экран нет (решение 2026-09-08). Геометрия рамки та же,
     что в CSS статьи; ширина полосы — как --sc-band в base.css.
     На узком экране и при reduced-motion уходим по ссылке сразу. */
  /* Куда летит кадр: рамка обкладинки на странице статьи — повторяет
     .vm-article__hero-media из vm-article.css. Меняешь там — поменяй здесь:
     измерить ту страницу отсюда нельзя. */
  var ARTICLE_PHOTO = { side: 582, top: 145, right: 74, pageWidth: 1440 };

  function articlePhotoRect() {
    var band = Math.max(0, Math.round((document.documentElement.clientWidth - ARTICLE_PHOTO.pageWidth) / 2));
    return {
      x: document.documentElement.clientWidth - band - ARTICLE_PHOTO.right - ARTICLE_PHOTO.side,
      y: ARTICLE_PHOTO.top,
      w: ARTICLE_PHOTO.side,
      h: ARTICLE_PHOTO.side
    };
  }

  function leave(href) {
    var img = medias.length ? medias[index].querySelector('img') : null;
    var narrow = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    if (!img || !auto || narrow) { window.location.href = href; return; }

    var box = img.getBoundingClientRect();
    var to = articlePhotoRect();

    var flyer = img.cloneNode(false);
    flyer.className = 'vm-featured__flyer';
    flyer.alt = '';
    flyer.style.setProperty('--flyer-x', Math.round(box.left) + 'px');
    flyer.style.setProperty('--flyer-y', Math.round(box.top) + 'px');
    flyer.style.setProperty('--flyer-w', Math.round(box.width) + 'px');
    flyer.style.setProperty('--flyer-h', Math.round(box.height) + 'px');
    document.body.appendChild(flyer);
    /* Своё фото прячем: летит клон, и без этого в слоте остаётся дубль */
    medias[index].classList.add('sc-is-handoff');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        flyer.style.setProperty('--flyer-x', to.x + 'px');
        flyer.style.setProperty('--flyer-y', to.y + 'px');
        flyer.style.setProperty('--flyer-w', to.w + 'px');
        flyer.style.setProperty('--flyer-h', to.h + 'px');
      });
    });

    /* Статье передаём кадр и рамку: она откроется ровно там же. */
    try {
      sessionStorage.setItem('sc-cover-handoff', JSON.stringify({
        src: img.currentSrc || img.src, x: to.x, y: to.y, w: to.w, h: to.h
      }));
    } catch (e) { /* приватный режим — переход просто будет без подхвата */ }

    var dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sc-dur-slow')) || 600;
    setTimeout(function () { window.location.href = href; }, dur);
  }

  /* Стрелка и заголовок ведут в один материал, поэтому и уходят одинаково:
     обкладинка съезжает в рамку статьи (решение 2026-09-08). */
  function onLeaveClick(e) {
    var href = this.getAttribute('href');
    if (!href) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; /* открыть в новой вкладке */
    e.preventDefault();
    clearTimeout(timer);
    leave(href);
  }

  if (read) read.addEventListener('click', onLeaveClick);

  var titleLinks = root.querySelectorAll('.vm-featured__title-link');
  for (var t = 0; t < titleLinks.length; t++) {
    titleLinks[t].addEventListener('click', onLeaveClick);
  }

  function pause() {
    paused = true;
    clearTimeout(timer);
    if (!bar) return;
    var fill = bar.getBoundingClientRect().width / bar.parentNode.getBoundingClientRect().width;
    root.classList.remove('sc-is-running');
    root.style.setProperty('--vm-featured-fill', Math.min(1, Math.max(0, fill)).toFixed(3));
  }

  function resume() {
    if (!paused) return;
    paused = false;
    armBar();
    schedule();
  }

  /* Пауза по наведению — только на самих стрелках. Раньше отсчёт вставал,
     стоило курсору попасть в полосу целиком: при чтении заголовка или по
     дороге к фильтрам лента замирала сама собой и казалась сломанной
     (правка 2026-09-14). На стрелках пауза уместна — читатель листает сам. */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
  if (fine && fine.matches) {
    [prev, next].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('mouseenter', pause);
      btn.addEventListener('mouseleave', resume);
    });
  }

  /* Пауза по фокусу — только клавиатурному. Клик мышью по стрелке тоже
     ставит фокус, и раньше это замораживало отсчёт: полоса вставала, слайды
     не менялись, пока курсор не уйдёт (правка 2026-09-13). Фокус от указателя
     узнаём по pointerdown перед ним — надёжнее, чем :focus-visible, у которого
     эвристика своя в каждом браузере. */
  var pointerFocus = false;
  root.addEventListener('pointerdown', function () {
    pointerFocus = true;
    setTimeout(function () { pointerFocus = false; }, 0);
  });
  root.addEventListener('focusin', function () {
    if (!pointerFocus) pause();
  });
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) resume();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(timer); root.classList.remove('sc-is-running'); }
    else if (!paused) { armBar(); schedule(); }
  });

  /* Возврат кнопкой «назад» из статьи: страница восстанавливается из bfcache
     в состоянии ухода — клон обкладинки висит в рамке статьи, своё фото скрыто,
     таймер снят. Возвращаем всё в строй (правка 2026-09-13). */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var flyers = document.querySelectorAll('.vm-featured__flyer');
    for (var f = 0; f < flyers.length; f++) flyers[f].parentNode.removeChild(flyers[f]);
    for (var m = 0; m < medias.length; m++) medias[m].classList.remove('sc-is-handoff');
    paused = false;
    render();
    armBar();
    schedule();
  });

  render();
  /* Отсчёт стартует после полной загрузки страницы: до этого первый кадр и
     стили важнее, а следующий кадр прогреваем в фоне */
  var kick = function () { warm(index + 1); armBar(); schedule(); };
  if (document.readyState === 'complete') kick();
  else window.addEventListener('load', kick, { once: true });
}());
