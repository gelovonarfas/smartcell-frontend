/* Підказки до термінів «Клітинної абетки» в тексті статті.
   Розмітка: <a class="sc-term" aria-describedby="ID"> + <span id="ID" class="sc-term-tip" role="tooltip" hidden>.
   Миша: наведення показує, відведення ховає (з паузою, щоб встигнути перейти на підказку).
   Клавіатура: фокус показує, Esc ховає.
   Дотик: перший тап показує підказку, другий тап по тому ж терміну відкриває абетку,
   тап деінде закриває. Без JS — звичайне посилання на абетку. */
(function () {
  var terms = document.querySelectorAll('a.sc-term[aria-describedby]');
  if (!terms.length) return;

  var GAP = 8, EDGE = 16, SHOW = 120, HIDE = 200;
  var current = null, tip = null, tShow = 0, tHide = 0, lastPointer = 'mouse';

  function tipFor(a) { return document.getElementById(a.getAttribute('aria-describedby')); }

  function place(a, t) {
    // підказка живе в body, щоб її не обрізали контейнери статті
    if (t.parentNode !== document.body) document.body.appendChild(t);
    var r = a.getClientRects()[0] || a.getBoundingClientRect(); // перший рядок, якщо термін переноситься
    var w = t.offsetWidth, h = t.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var left = Math.min(Math.max(EDGE, r.left), vw - w - EDGE);
    var below = r.bottom + GAP + h < window.innerHeight || r.top - GAP - h < 0;
    var top = below ? r.bottom + GAP : r.top - GAP - h;
    t.style.left = (left + window.scrollX) + 'px';
    t.style.top = (top + window.scrollY) + 'px';
  }

  function open(a) {
    clearTimeout(tHide);
    if (current === a) return;
    close(true);
    var t = tipFor(a);
    if (!t) return;
    current = a; tip = t;
    t.hidden = false;
    place(a, t);
    a.classList.add('sc-is-active');
    requestAnimationFrame(function () { t.classList.add('sc-is-open'); });
  }

  function close(now) {
    clearTimeout(tShow);
    if (!current) return;
    var t = tip, a = current;
    current = null; tip = null;
    a.classList.remove('sc-is-active');
    t.classList.remove('sc-is-open');
    if (now) t.hidden = true;
    else setTimeout(function () { if (tip !== t) t.hidden = true; }, 160);
  }

  function later(fn, ms) { return setTimeout(fn, ms); }

  Array.prototype.forEach.call(terms, function (a) {
    var t = tipFor(a);
    a.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType; });
    a.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(tHide);
      tShow = later(function () { open(a); }, SHOW);
    });
    a.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(tShow);
      tHide = later(function () { close(); }, HIDE);
    });
    a.addEventListener('focus', function () { if (lastPointer === 'mouse') open(a); });
    a.addEventListener('blur', function () { tHide = later(function () { close(); }, HIDE); });
    a.addEventListener('click', function (e) {
      if (lastPointer === 'mouse') return;
      // дотик: перший тап — підказка, другий — перехід
      if (current !== a) { e.preventDefault(); open(a); }
      lastPointer = 'mouse';
    });
    if (t) {
      t.addEventListener('pointerenter', function () { clearTimeout(tHide); });
      t.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') tHide = later(function () { close(); }, HIDE);
      });
    }
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('pointerdown', function (e) {
    if (!current) return;
    if (current.contains(e.target) || (tip && tip.contains(e.target))) return;
    close();
  });
  window.addEventListener('resize', function () { if (current) place(current, tip); });
})();
