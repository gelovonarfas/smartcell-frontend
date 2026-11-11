/* ============================================================
   B00b · Header — портал между пространствами и стекло при прокрутке
   figma: node-id=4:288

   Портал: aria-expanded на триггере, закрытие по Esc (с возвратом фокуса)
   и по клику вне — как требует описание компонента Portal/Trigger в Figma.
   ============================================================ */
(function () {
  'use strict';

  var header = document.querySelector('[data-header]');
  if (!header) return;

  /* ---------- Портал ---------- */

  var trigger = header.querySelector('[data-portal-trigger]');
  var menu = header.querySelector('[data-portal-menu]');

  if (trigger && menu) {
    var portal = header.querySelector('.sc-header__portal');
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var hideTimer = null;

    var open = function () {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');

      /* класс — кадром позже, иначе переход не с чего начинать */
      if (reduced && reduced.matches) {
        portal.classList.add('sc-is-open');
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { portal.classList.add('sc-is-open'); });
        });
      }
    };

    var close = function (returnFocus) {
      trigger.setAttribute('aria-expanded', 'false');
      portal.classList.remove('sc-is-open');
      if (returnFocus) trigger.focus();

      if (reduced && reduced.matches) { menu.hidden = true; return; }

      /* прячем только когда панель доехала обратно */
      var done = false;
      var onEnd = function (e) {
        if (e.target !== menu || done) return;
        done = true;
        menu.removeEventListener('transitionend', onEnd);
        menu.hidden = true;
      };
      menu.addEventListener('transitionend', onEnd);
      hideTimer = setTimeout(function () {
        if (done) return;
        done = true;
        menu.removeEventListener('transitionend', onEnd);
        menu.hidden = true;
      }, 500);
    };

    trigger.addEventListener('click', function () {
      if (trigger.getAttribute('aria-expanded') === 'true') close(false);
      else open();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') close(true);
    });

    document.addEventListener('click', function (e) {
      if (trigger.getAttribute('aria-expanded') !== 'true') return;
      if (trigger.contains(e.target) || menu.contains(e.target)) return;
      close(false);
    });
  }

  /* Планку и анонс меряем не один раз: до загрузки Onest строка ложится
     запасным шрифтом и высота другая. Если запомнить её в этот момент,
     блоки отодвинутся не на ту величину — на блоге между шапкой и
     обкладинкой оставалась щель (правка 2026-09-20). Поэтому следим за
     самим элементом и пересчитываем, когда шрифты доехали. */
  var observers = [];   /* ссылку держим: несвязанный ResizeObserver соберёт сборщик мусора */
  var watch = function (el, fn) {
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(fn);
      ro.observe(el);
      observers.push(ro);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn);
    /* Подстраховка для браузеров без ResizeObserver или Font Loading API */
    window.addEventListener('load', fn);
  };

  /* ---------- Анонс-бар ----------
     Высота зависит от того, в сколько строк лёг текст, поэтому меряем,
     а не зашиваем: на эту величину опущена фиксированная шапка. */

  var announce = document.querySelector('.sc-announce');

  if (announce) {
    var syncAnnounce = function () {
      document.documentElement.style.setProperty('--announce-h', announce.offsetHeight + 'px');
    };
    syncAnnounce();
    window.addEventListener('resize', syncAnnounce);
    watch(announce, syncAnnounce);
  }

  /* Высота самой планки: по ней страницы отодвигают контент из-под
     фиксированной шапки и к ней липнет полоса прочитанного на статье. */
  var syncHeader = function () {
    /* Открытое меню растягивает шапку на весь экран — это не высота планки. Раньше страница
       под меню отъезжала вниз на экран; на планшете её видно сквозь скрим (правка 2026-11-09). */
    if (header.classList.contains('sc-header--nav-open')) return;
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  };
  syncHeader();
  window.addEventListener('resize', syncHeader);
  watch(header, syncHeader);

  /* ---------- Мобильное меню ---------- */

  var burger = header.querySelector('[data-nav-toggle]');

  if (burger) {
    var setNav = function (on) {
      header.classList.toggle('sc-header--nav-open', on); /* префикс обязателен: CSS ждёт sc- */
      document.body.classList.toggle('sc-nav-lock', on); /* меню на весь екран — сторінка під ним стоїть (2026-11-03) */
      /* Тёмна шапка (FC365, data-theme="inverse"): відкрита шторка світла, як на решті сторінок —
         на час відкриття тема знімається і повертається при закритті (2026-11-03) */
      /* На планшете (641–1279) шапка не перекрашивается: светлую тему получают только
         шторка и крестик, логотип остаётся как был (2026-11-10). На телефоне меню
         на весь экран — светлой становится вся шапка, как раньше. */
      var wide = window.matchMedia && window.matchMedia('(min-width: 641px)').matches;
      var drawer = header.querySelector('.sc-header__drawer');
      if (on && header.getAttribute('data-theme') === 'inverse') {
        if (wide) {
          if (drawer) drawer.setAttribute('data-theme', 'normal');
          burger.setAttribute('data-theme', 'normal');
        } else {
          header.setAttribute('data-theme-rest', 'inverse');
          header.setAttribute('data-theme', 'normal');
        }
      } else if (!on) {
        if (header.getAttribute('data-theme-rest')) {
          header.setAttribute('data-theme', header.getAttribute('data-theme-rest'));
          header.removeAttribute('data-theme-rest');
        }
        if (drawer) drawer.removeAttribute('data-theme');
        burger.removeAttribute('data-theme');
      }
      burger.setAttribute('aria-expanded', on ? 'true' : 'false');
    };

    var navIsOpen = function () { return burger.getAttribute('aria-expanded') === 'true'; };

    /* бургера нет на десктопе — там панель и так раскрыта раскладкой */
    var burgerVisible = function () { return getComputedStyle(burger).display !== 'none'; };

    burger.addEventListener('click', function () { setNav(!navIsOpen()); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navIsOpen()) { setNav(false); burger.focus(); }
    });

    /* Планшет (641–1279): шторка — панель справа, остальная часть растянутой шапки — скрим
       страницы. Скрим — это сама шапка и её сетка, поэтому клик по нему приходит внутрь шапки.
       Ширину панели берём из CSS (фон панели — .sc-header__inner::after); на телефоне
       псевдоэлемента нет, ширина не читается, и клик ничего не закрывает (правка 2026-11-09). */
    var navInner = header.querySelector('.sc-header__inner');
    var navDrawer = header.querySelector('.sc-header__drawer');
    var onScrim = function (e) {
      if (!navInner || !navDrawer) return false;
      if (e.target !== header && e.target !== navInner) return false;
      var panelW = parseFloat(getComputedStyle(navInner, '::after').width);
      if (!panelW) return false;
      return e.clientY > navDrawer.getBoundingClientRect().top &&
             e.clientX < header.getBoundingClientRect().right - panelW;
    };

    document.addEventListener('click', function (e) {
      if (!navIsOpen()) return;
      if (header.contains(e.target) && !onScrim(e)) return;
      setNav(false);
    });

    /* переход на десктоп не должен оставлять залипшее состояние */
    window.addEventListener('resize', function () {
      if (navIsOpen() && !burgerVisible()) setNav(false);
    });
  }

  /* ---------- Стекло при прокрутке ----------
     Сентинел в начале документа вместо обработчика скролла. */

  if (!('IntersectionObserver' in window)) return;

  var sentinel = document.createElement('span');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
  document.body.insertBefore(sentinel, document.body.firstChild);

  new IntersectionObserver(function (entries) {
    header.classList.toggle('sc-is-scrolled', !entries[0].isIntersecting);
  }).observe(sentinel);
}());
