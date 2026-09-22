/* ============================================================
   ⚠ [VERIFY] Вікові діапазони. У макеті 960:1500 стоїть 25-35 / 35-45 / 50+:
   35 потрапляє в два сценарії одразу, а 46–49 не покриті жодним. Нижню межу
   другого зсунуто на 36 (2026-09-11), розрив 46–49 лишається — його закриває
   клініка: або «36–49», або «50+» стає «46+».

   B04b · Сценарії — переключение состояний
   figma: 469:216 · состояния 476:170 / 476:206 / 476:242

   Переключают стрелки и клик по миниатюре; автопрокрутки нет.
   Меняются лейбл, панель (заголовок, абзац, таблица), активная миниатюра
   и большой кадр — кроссфейдом. Миниатюры размечены как tablist,
   поэтому работают стрелки клавиатуры.
   Без JS видна вторая панель — основной сценарий, как в макете.
   ============================================================ */
(function () {
  'use strict';

  /* Единственный источник путей к картинкам: замена заглушки на настоящий
     кадр — правка одной строки. Тексты панелей живут в разметке, чтобы их
     переводил qTranslate. */
  var SCENARIOS = [
    { id: '1', label: 'Сценарій 1 (25–35)',           image: 'b04b/scenario-1-base' },
    { id: '2', label: 'Сценарій 2 (36–45)',  image: 'b04b/scenario-2-main' },
    { id: '3', label: 'Сценарій 3 (50+)',              image: 'b04b/scenario-3-extended' }
  ];

  var MEDIA_SIZE = 680;

  var sections = document.querySelectorAll('[data-scenarios]');
  if (!sections.length) return;
  if (!window.SC || !window.SC.media) return;

  function build(section) {
    var media = section.querySelector('[data-scenario-media]');
    if (!media || media.children.length) return;

    /* Ленты миниатюр нет (макет v2): строим только кадры, листает переключатель */
    SCENARIOS.forEach(function (item, index) {
      var active = index === 1; /* по умолчанию основной сценарий, как в макете */
      var frame = window.SC.media.picture({
        name: item.image, size: MEDIA_SIZE, alt: '', eager: active
      });
      frame.classList.add('sc-scenarios__media-frame');
      frame.setAttribute('data-scenario-media-item', item.id);
      if (active) frame.setAttribute('data-current', '');
      media.appendChild(frame);
    });

    window.SC.media.preload(SCENARIOS.map(function (i) { return i.image; }));
  }

  function setup(section) {
    build(section);

    var panels = Array.prototype.slice.call(section.querySelectorAll('[data-scenario]'));
    var medias = Array.prototype.slice.call(section.querySelectorAll('[data-scenario-media-item]'));
    var label = section.querySelector('[data-scenario-label]');
    var count = section.querySelector('[data-scenario-count]');
    var prev = section.querySelector('[data-scenario-prev]');
    var next = section.querySelector('[data-scenario-next]');
    if (!panels.length) return;

    var total = SCENARIOS.length;
    var current = 0;
    for (var i = 0; i < medias.length; i++) {
      if (medias[i].hasAttribute('data-current')) current = i;
    }

    function show(index) {
      current = (index + total) % total;
      for (var i = 0; i < total; i++) {
        var on = i === current;
        if (panels[i]) panels[i].hidden = !on;
        if (medias[i]) {
          if (on) medias[i].setAttribute('data-current', '');
          else medias[i].removeAttribute('data-current');
        }
      }
      if (label) label.textContent = SCENARIOS[current].label;
      if (count) count.textContent = (current + 1) + ' / ' + total;
    }

    if (prev) prev.addEventListener('click', function () { show(current - 1); });
    if (next) next.addEventListener('click', function () { show(current + 1); });

    show(current);
  }

  for (var k = 0; k < sections.length; k++) setup(sections[k]);
}());
