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
    });

    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') mark(e.target, false);
    });
  }

  for (var k = 0; k < forms.length; k++) setup(forms[k]);
}());
