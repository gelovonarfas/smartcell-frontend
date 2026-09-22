/* ============================================================
   Модалки — открытие, закрытие, фокус
   figma: Modal/Booking 437:21

   Один модуль на все модалки страницы. Модалка объявляется как
   [data-modal="имя"], открывается из [data-modal-open="имя"],
   закрывается кнопкой [data-modal-close], Esc или кликом по оверлею —
   как в описании компонента.

   Видео подключается лениво: адрес лежит в data-src, в src он попадает
   при открытии и стирается при закрытии, иначе ролик грузится вместе
   со страницей и продолжает играть после закрытия.

   Отправка формы не подключена: валидный сабмит уходит нативно,
   кодер подставляет action / AJAX.
   ============================================================ */
(function () {
  'use strict';

  var modals = document.querySelectorAll('[data-modal]');
  if (!modals.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  var openModal = null;      /* сейчас открыта только одна */
  var lastTrigger = null;
  var hiddenByUs = [];

  function focusable(dialog) {
    return Array.prototype.filter.call(
      dialog.querySelectorAll(FOCUSABLE),
      function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; }
    );
  }

  /* Прячем остальную страницу от скринридера и от Tab */
  function isolate(modal, on) {
    if (on) {
      hiddenByUs = [];
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === modal || el.tagName === 'SCRIPT') return;
        if ('inert' in HTMLElement.prototype) { el.inert = true; }
        else { el.setAttribute('aria-hidden', 'true'); }
        hiddenByUs.push(el);
      });
    } else {
      hiddenByUs.forEach(function (el) {
        if ('inert' in HTMLElement.prototype) { el.inert = false; }
        else { el.removeAttribute('aria-hidden'); }
      });
      hiddenByUs = [];
    }
  }

  function loadMedia(modal, on) {
    var frame = modal.querySelector('[data-src]');
    if (!frame) return;
    if (on) frame.src = frame.getAttribute('data-src');
    else frame.removeAttribute('src'); /* снимаем src — ролик останавливается */
  }

  function open(modal, trigger) {
    if (!modal.hidden) return;
    lastTrigger = trigger || document.activeElement;
    openModal = modal;

    /* компенсируем полосу прокрутки, чтобы страница не дёргалась */
    var gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    document.body.classList.add('sc-has-modal');

    modal.hidden = false;
    loadMedia(modal, true);
    isolate(modal, true);

    if (reduced && reduced.matches) {
      modal.classList.add('sc-is-open');
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { modal.classList.add('sc-is-open'); });
      });
    }

    /* в форме удобнее сразу поле, а не кнопка закрытия */
    var dialog = modal.querySelector('.sc-modal__dialog');
    var items = focusable(dialog);
    var field = dialog.querySelector('.sc-modal__input');
    var target = (field && items.indexOf(field) !== -1) ? field : items[0];
    if (target) target.focus();
  }

  function finishClose(modal) {
    modal.hidden = true;
    modal.classList.remove('sc-is-closing');
    loadMedia(modal, false);
    isolate(modal, false);
    document.body.classList.remove('sc-has-modal');
    document.body.style.paddingRight = '';
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
    openModal = null;
  }

  function close(modal) {
    if (!modal || modal.hidden) return;
    var dialog = modal.querySelector('.sc-modal__dialog');
    modal.classList.remove('sc-is-open');
    modal.classList.add('sc-is-closing'); /* диалог уходит в угол стрелки */

    if (reduced && reduced.matches) { finishClose(modal); return; }

    var done = false;
    var onEnd = function (e) {
      if (e.target !== dialog || done) return;
      done = true;
      dialog.removeEventListener('transitionend', onEnd);
      finishClose(modal);
    };
    dialog.addEventListener('transitionend', onEnd);
    /* страховка, если transitionend не придёт */
    setTimeout(function () { if (!done) { done = true; finishClose(modal); } }, 400);
  }

  /* ---------- Триггеры ---------- */

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    var opener = e.target.closest('[data-modal-open]');
    if (opener) {
      var name = opener.getAttribute('data-modal-open');
      var target = document.querySelector('[data-modal="' + name + '"]');
      if (target) { e.preventDefault(); open(target, opener); return; }
    }

    /* исторические CTA секций ведут на запись */
    var booking = e.target.closest('a[href="#consultation"]');
    if (booking) {
      var bm = document.querySelector('[data-modal="booking"]');
      if (bm) { e.preventDefault(); open(bm, booking); return; }
    }

    if (openModal && e.target.closest('[data-modal-close]')) {
      e.preventDefault();
      close(openModal);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!openModal) return;

    if (e.key === 'Escape') { e.preventDefault(); close(openModal); return; }

    if (e.key === 'Tab') {
      var items = focusable(openModal.querySelector('.sc-modal__dialog'));
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Валидация формы записи ---------- */

  var form = document.querySelector('.sc-modal__form');
  if (!form) return;

  function fieldError(input, on) {
    var box = document.getElementById(input.id + '-error');
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
    if (box) {
      box.hidden = !on;
      if (on) input.setAttribute('aria-describedby', box.id);
      else input.removeAttribute('aria-describedby');
    }
  }

  form.addEventListener('submit', function (e) {
    var name = form.querySelector('#booking-name');
    var phone = form.querySelector('#booking-phone');

    var nameBad = !name.value.trim();
    /* не меньше 9 цифр — минимальная проверка, без навязывания формата */
    var phoneBad = (phone.value.replace(/\D/g, '').length < 9);

    fieldError(name, nameBad);
    fieldError(phone, phoneBad);

    if (nameBad || phoneBad) {
      e.preventDefault();
      (nameBad ? name : phone).focus();
      return;
    }

    /* Валидно: показываем загрузку и отдаём отправку кодеру */
    form.setAttribute('data-state', 'loading');
  });

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') fieldError(e.target, false);
  });
}());
