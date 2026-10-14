/* ============================================================
   Проверка полей перед отправкой.

   Обслуживает формы с атрибутом data-form: сейчас это B11, модалка и подписка в футере.
   Отправка не подключена — валидный сабмит уходит нативно,
   кодер подставляет action или AJAX.
   ============================================================ */
(function () {
  'use strict';

  var forms = document.querySelectorAll('[data-form]');
  if (!forms.length) return;

  function mark(input, bad) {
    var box = document.getElementById(input.id + '-error');
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (!box) return;
    box.hidden = !bad;
    if (bad) input.setAttribute('aria-describedby', box.id);
    else input.removeAttribute('aria-describedby');
  }

  function setup(form) {
    form.addEventListener('submit', function (e) {
      var fields = form.querySelectorAll('input[required]');
      var firstBad = null;

      for (var i = 0; i < fields.length; i++) {
        var input = fields[i];
        var value = input.value.trim();
        var bad;
        if (input.type === 'tel') {
          bad = input.value.replace(/\D/g, '').length < 9;  /* минимум цифр, без навязывания формата */
        } else if (input.type === 'email') {
          bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        } else {
          bad = !value;
        }
        mark(input, bad);
        if (bad && !firstBad) firstBad = input;
      }

      if (firstBad) { e.preventDefault(); firstBad.focus(); return; }
      form.setAttribute('data-state', 'loading');

      /* Підписка в статті: стани на блоці [data-subscribe] (2026-10-14) */
      var box = form.closest && form.closest('[data-subscribe]');
      if (box) { e.preventDefault(); sendSubscribe(box, form); }

      /* Підписка у футері і смуга розсилки журналу: тост у куті (data-form-toast, 2026-10-14) */
      if (form.hasAttribute('data-form-toast')) { e.preventDefault(); sendFooter(form); }
    });

    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') mark(e.target, false);
    });
  }

  /* ---------- Підписка: idle → sending → done ----------
     Висота блоку не стрибає: перед перемиканням колонка отримує min-height поточної.
     Надсилання тут — імітація (таймер --vm-a-send-dur × 2): кодер замінює
     fakeSend() на реальний запит і викликає done() у відповіді, fail() — у помилці. */
  function sendSubscribe(box, form) {
    var copy = box.querySelector('.vm-article__subscribe-copy');
    var progress = box.querySelector('.vm-article__subscribe-progress');
    var doneBox = box.querySelector('.vm-article__subscribe-done');
    var emailOut = box.querySelector('[data-subscribe-email]');
    var email = form.querySelector('input[type="email"]');
    if (copy && !copy.style.minBlockSize) copy.style.minBlockSize = copy.offsetHeight + 'px';

    box.setAttribute('data-state', 'sending');
    if (progress) progress.hidden = false;

    function done() {
      if (progress) progress.hidden = true;
      if (emailOut && email) emailOut.textContent = email.value.trim();
      if (doneBox) doneBox.hidden = false;
      box.setAttribute('data-state', 'done');
      form.removeAttribute('data-state');
      var status = doneBox && doneBox.querySelector('.vm-article__subscribe-status');
      if (status) { status.setAttribute('tabindex', '-1'); status.focus(); }
    }

    function fakeSend() { window.setTimeout(done, 1600); }
    fakeSend();
  }

  /* ---------- Футер: тост «надсилаємо → лист надіслано» ----------
     Тост лежить у розмітці футера ([data-footer-toast]); скрипт лише показує його,
     перемикає стан і підставляє e-mail. Імітація надсилання — таймер, як у статті:
     кодер замінює fakeSend() на запит і викликає done(). Ховається через 8 с або хрестиком. */
  var toast = document.querySelector('[data-footer-toast]');
  var toastTimer = null;

  function toastHide() {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.classList.remove('sc-is-in');
    toast.addEventListener('transitionend', function onEnd() {
      toast.removeEventListener('transitionend', onEnd);
      if (!toast.classList.contains('sc-is-in')) { toast.hidden = true; toast.setAttribute('data-state', 'hidden'); }
    });
    /* без переходу (reduced motion) — сховати одразу */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { toast.hidden = true; toast.setAttribute('data-state', 'hidden'); }
  }

  function sendFooter(form) {
    if (!toast) return;
    var email = form.querySelector('input[type="email"]');
    var doneBox = toast.querySelector('[data-toast-done]');
    var emailOut = toast.querySelector('[data-subscribe-email]');
    window.clearTimeout(toastTimer);
    if (doneBox) doneBox.hidden = true;
    toast.setAttribute('data-state', 'sending');
    toast.hidden = false;
    /* примусовий reflow після зняття display: none — інакше переходу в'їзду не буде */
    void toast.offsetHeight;
    toast.classList.add('sc-is-in');

    function done() {
      if (emailOut && email) emailOut.textContent = email.value.trim();
      if (doneBox) doneBox.hidden = false;
      toast.setAttribute('data-state', 'done');
      form.removeAttribute('data-state');
      form.reset();
      toastTimer = window.setTimeout(toastHide, 8000);
    }
    function fakeSend() { window.setTimeout(done, 1600); }
    fakeSend();
  }

  if (toast) {
    var closeBtn = toast.querySelector('[data-toast-close]');
    if (closeBtn) closeBtn.addEventListener('click', toastHide);
  }

  var subs = document.querySelectorAll('[data-subscribe]');
  for (var s = 0; s < subs.length; s++) (function (box) {
    var again = box.querySelector('[data-subscribe-again]');
    var form = box.querySelector('form');
    if (!again || !form) return;
    again.addEventListener('click', function () {
      /* «Надіслати ще раз»: той самий цикл, success ховається на час надсилання */
      var doneBox = box.querySelector('.vm-article__subscribe-done');
      if (doneBox) doneBox.hidden = true;
      sendSubscribe(box, form);
    });
  }(subs[s]));

  for (var k = 0; k < forms.length; k++) setup(forms[k]);
}());
