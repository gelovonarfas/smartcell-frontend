/* ============================================================
   GSAP-слой — пробная анимация появления, только десктоп.

   ОТКАТ: удалить этот файл и три строки <script> в index.html
   (блок помечен комментарием «GSAP-слой»). Стили и разметку слой
   не трогает: без него страница выглядит и работает как раньше.

   Область действия: экраны шире 640 и только при включённой анимации
   в системе (prefers-reduced-motion: no-preference). На телефоне работает
   одно — вход в статью (revealArticleHead), при reduced-motion — ничего.

   Не дублируем свою анимацию: journey.js, счётчики, полосы B12,
   графики УЗД и слайдеры остаются как есть.
   ============================================================ */
(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Шапка статьи: заголовок и лид проявляются из размытия ----------
     Кадр обкладинки уже стоит на месте (переход из ленты), поэтому копия
     не выезжает сбоку, а проступает сверху вниз: сначала чипсы, затем H1,
     затем лид. Блюр снимается вместе с подъёмом — текст будто наводится
     на резкость (решение 2026-09-08).

     Единственный твин слоя, который работает и на телефоне (2026-09-11):
     это вход на страницу, а не скролл-эффект, и он лёгкий. Остальное
     на узком экране по-прежнему не запускается. */
  function revealArticleHead() {
    var articleHead = document.querySelectorAll(
      '.vm-article__chips, .vm-article__title, .vm-article__dek');
    if (!articleHead.length) return;
    gsap.from(articleHead, {
      opacity: 0,
      y: -18,                  /* приходит сверху */
      filter: 'blur(12px)',
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.14,
      clearProps: 'all'
    });
  }

  var mm = gsap.matchMedia();

  /* Телефон: только вход в статью */
  mm.add('(max-width: 640px) and (prefers-reduced-motion: no-preference)', function () {
    revealArticleHead();
    return function () {};
  });

  mm.add('(min-width: 641px) and (prefers-reduced-motion: no-preference)', function () {

    /* ---------- Хиро: заголовок и описание при загрузке ---------- */
    var heroBits = ['.sc-hero__title', '.sc-hero__lead', '.sc-hero__cta', '.sc-hero__facts .sc-hero__fact'];
    gsap.from(heroBits.map(function (s) { return document.querySelectorAll(s); }), {
      opacity: 0,
      y: 28,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.12,
      clearProps: 'all'
    });

    revealArticleHead();

    /* ---------- Тело статьи: одно сдержанное проявление на все блоки ----------
       Правило простое: каждый самостоятельный блок один раз проступает
       на своём триггере — 16 пикселей подъёма и полсекунды с небольшим.
       Параметры у всех одинаковые и намеренно скромные: длинная страница
       чтения не должна превращаться в витрину эффектов (решение 2026-09-08).

       Проза не анимируется: текст, который проявляется под курсором чтения,
       мешает читать. Двигаются только заголовки разделов, врезки и карточки. */
    var articleBlocks = [
      '.vm-article__summary', '.vm-article__h2', '.vm-article__answer',
      '.vm-article__checklist', '.vm-article__figure', '.vm-article__promo',
      '.vm-article__series', '.vm-article__faq-item', '.vm-article__subscribe',
      '.vm-article__author', '.vm-article__sources',
      '.vm-article__toc', '.vm-article__services',
      '.sc-editorial__item'
    ];

    articleBlocks.forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        gsap.from(el, {
          opacity: 0,
          y: 16,
          duration: 0.6,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });
    });

    /* ---------- Медленный скролл кадра (B15a, B11) ----------
       Рамка ниже кадра на величину запаса сверху и снизу (см. CSS блока):
       этот запас и проезжает, пока секция идёт через экран. scrub привязывает
       движение к скроллу, поэтому кадр отстаёт от страницы, а не живёт сам.
       Величину берём из той же CSS-переменной — правится в одном месте. */
    [
      ['.sc-neo__image', '.sc-neo__frame', '--neo-parallax'],
      ['.sc-consult__image', '.sc-consult', '--consult-parallax']
    ].forEach(function (pair) {
      var img = document.querySelector(pair[0]);
      var frame = document.querySelector(pair[1]);
      if (!img || !frame) return;
      var shift = parseFloat(getComputedStyle(img).getPropertyValue(pair[2])) || 80;
      gsap.fromTo(img,
        { y: -shift },
        {
          y: shift,
          ease: 'none',
          scrollTrigger: {
            trigger: frame,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
    });

    /* ---------- Появление секций: заголовок, затем содержимое ----------
       Пары «секция → что поднимать». Третьим элементом — правки к общему
       твину, если блоку нужен свой темп. Journey и хиро не трогаем. */
    var reveals = [
      ['.sc-difference', '.sc-difference__title, .sc-difference__tags, .sc-difference__lead, .sc-difference__cta'],
      ['.sc-program', '.sc-program__title, .sc-program__card'],
      ['.sc-includes', '.sc-includes__head, .sc-includes__card'],
      ['.sc-vectors', '.sc-vectors__title, .sc-vectors__item'],
      ['.sc-cdata', '.sc-cdata__caption, .sc-cdata__stat, .sc-cdata__qual, .sc-cdata__source'],
      ['.sc-clinical', '.sc-clinical__kicker, .sc-clinical__stat'],
      ['.sc-scenarios', '.sc-scenarios__title, .sc-scenarios__switcher, .sc-scenarios__media, .sc-scenarios__panels, .sc-scenarios__cta, .sc-scenarios__thumbs'],
      ['.sc-ambassador', '.sc-ambassador__frame'],
      ['.sc-cases', '.sc-cases__title, .sc-cases__media, .sc-cases__col, .sc-cases__thumbs'],
      ['.sc-kit', '.sc-kit__copy > *, .sc-kit__media'],
      ['.sc-science', '.sc-science__copy, .sc-science__facts, .sc-science__proof'],
      ['.sc-reviews', '.sc-reviews__head, .sc-reviews__item, .sc-reviews__controls'],
      ['.sc-saving', '.sc-saving__copy > *, .sc-saving__table'],
      ['.sc-consult', '.sc-consult__copy > *, .sc-consult__form'],
      ['.sc-impact', '.sc-impact__title, .sc-impact__media, .sc-impact__rows, .sc-impact__note'],
      ['.sc-bonus', '.sc-bonus__frame'],
      ['.sc-notfit', '.sc-notfit__title, .sc-notfit__copy, .sc-notfit__grid'],
      ['.sc-neo', '.sc-neo__frame'],
      ['.sc-usg', '.sc-usg__title, .sc-usg__col, .sc-usg__chart'],
      ['.sc-faq', '.sc-faq__col > *, .sc-faq__item'],
      /* Плитки журнала приземляются по очереди: шаг заметнее общего,
         чтобы читался порядок, а не один общий взлёт ленты.
         Поднимаем карточку целиком: .sc-mag__title — это заголовок ВНУТРИ
         карточки, и в списке он давал второй, запоздалый твин (правка 2026-09-13).
         Заголовок секции — .sc-mag__title-main. */
      ['.sc-mag', '.sc-mag__title-main, .sc-mag__card', { stagger: 0.14, y: 40 }],
      ['.sc-footer', '.sc-footer__final-copy']
    ];

    reveals.forEach(function (pair) {
      var section = document.querySelector(pair[0]);
      if (!section) return;
      var items = section.querySelectorAll(pair[1]);
      if (!items.length) return;
      var tween = {
        opacity: 0,
        y: 32,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.08,
        clearProps: 'all' /* после прогона инлайн-стилей не остаётся */
      };
      var custom = pair[2];
      if (custom) { for (var key in custom) { tween[key] = custom[key]; } }
      tween.scrollTrigger = {
        trigger: section,
        start: 'top 72%',
        once: true
      };
      gsap.from(items, tween);
    });

    /* при уходе с брейкпоинта GSAP сам снимает все свои твины */
    return function () {};
  });
}());
