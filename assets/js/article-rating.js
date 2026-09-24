/* ============================================================
   Рейтинг статьи: звёзды — кнопки, голос по клику после прочтения.

   Данные — в разметке: data-rating-value, data-rating-count, data-rating-endpoint.
   Клик по звезде: локально пересчитываем среднее и счётчик (чтобы ответ был
   мгновенным), запоминаем голос в localStorage по адресу статьи — второй раз с
   этого устройства не считаем, — и отправляем POST на endpoint, если он задан.
   Ответ сервера не ждём и не показываем: при ошибке остаётся локальный расчёт.
   Клавиатура: стрелки внутри radiogroup, Enter/Space — голос.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-article-rating]');
  if (!root) return;

  var stars = Array.prototype.slice.call(root.querySelectorAll('[data-star]'));
  var note = root.querySelector('[data-rating-note]');
  var endpoint = root.getAttribute('data-rating-endpoint');
  var value = parseFloat(root.getAttribute('data-rating-value')) || 0;
  var count = parseInt(root.getAttribute('data-rating-count'), 10) || 0;
  var key = 'sc-rating:' + location.pathname;
  var voted = 0;
  try { voted = parseInt(localStorage.getItem(key), 10) || 0; } catch (e) {}

  function plural(n) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'оцінки';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'оцінки';
    return 'оцінок';
  }

  function paint(shown) {
    stars.forEach(function (b, i) {
      b.classList.toggle('sc-is-on', i < shown);
      b.setAttribute('aria-checked', i + 1 === voted ? 'true' : 'false');
    });
  }

  function render() {
    var v = Math.round(value * 10) / 10;
    paint(Math.round(v));
    if (note) note.textContent = v + ' з 5 на основі ' + count + ' ' + plural(count);
    root.classList.toggle('sc-is-voted', voted > 0);
  }

  function vote(n) {
    if (voted) return;
    voted = n;
    value = (value * count + n) / (count + 1);
    count += 1;
    try { localStorage.setItem(key, String(n)); } catch (e) {}
    render();
    if (endpoint) {
      try {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'action=sc_rate&url=' + encodeURIComponent(location.pathname) + '&value=' + n,
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }
  }

  stars.forEach(function (b, i) {
    b.addEventListener('click', function () { vote(i + 1); });
    b.addEventListener('mouseenter', function () { if (!voted) paint(i + 1); });
    b.addEventListener('keydown', function (e) {
      var j = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = Math.min(4, i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = Math.max(0, i - 1);
      else return;
      e.preventDefault(); stars[j].focus();
    });
  });
  root.addEventListener('mouseleave', render);

  render();
}());
