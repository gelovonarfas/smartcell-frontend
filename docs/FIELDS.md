# Карта полів шаблонів SmartCell — для Миколи

Коротко, щоб не шукати по розмітці. Повний контекст кожного блоку — у коментарі
`ACF:` над секцією в HTML.

**Головне.** Назви полів — пропозиція, не вимога. Якщо у темі `virtus` вже є поле з тим самим
змістом — беріть його, нам важлива лише розмітка. У таблицях колонка «Де взяти» — наше
припущення, звідки це вже є на virtus; **«нове»** — чого там точно не було і треба завести.

**Контент не ділимо.** На virtus опис напрямку/послуги/хаба зберігається одним полем — текст,
списки й відео впереміш. Його **не треба розбирати на наші блоки**: виводьте wysiwyg як є в контейнер
опису (`.sc-dprose__body`; у темній статті хаба — `.sc-story__part`). Кожен тег усередині
(`p`, `h2`–`h4`, `ul`/`ol`, `blockquote`, `strong`, `a`, `iframe`/oEmbed, `figure`) стилізований
у CSS — як у тілі статті журналу. YouTube у тексті достатньо лишити iframe'ом (або oEmbed WordPress) —
він стане 16:9 на всю міру рядка. Окремі поля нижче (цитата, факти, FAQ) — **опційні**: є — виводимо
блок, нема — його просто немає.

---

## Спільні блоки (на всіх шаблонах розділу)

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Мегаменю «Клітинні технології» · Протоколи | `menu_protocol` | 1 запис (Face Control 365) | options page / захардкодити |
| Мегаменю · Терапія | — | запит по напрямках | уже є: напрямки |
| Мегаменю · Препарати | `menu_products` | 4 верхні продукти | з `products` сторінки препаратів |
| Мегаменю · анонс журналу | `menu_article` | 1 запис журналу | останній пост |
| Смуга «Консультація» | `consult_kicker`, `consult_title`, `consult_text`, `consult_cta_label` | text ×4 | **нове** або options page (тексти однакові на всіх сторінках) |
| «Напрямок представлений у філіях» | `branches` | relationship → філії | уже є: філії (фото, назва, адреса, графік, посилання) |
| Дорожка Smart Age Journal | `direction_articles` | relationship, 4 | пусто → WP-запит за тегом напрямку |
| Хлібні крихти | — | — | тема (Yoast / Rank Math) |
| Попап запису | — | форма | та сама, що на Face Control |

---

## Напрямок (`direction-plastic.html`) · рівні 2–3

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `direction_title` | textarea (перенос → `<br>`) | title запису |
| | `direction_lead` | textarea | excerpt |
| | `direction_branches` | relationship → філії | уже є |
| | `direction_cta_label` | text | **нове** / константа |
| | `direction_image` | image 1:1 | featured image |
| Вкладка «Опис» · текст | `description` | **один wysiwyg як на virtus** (текст, списки, відео) | content запису |
| Вкладка «Опис» · цитата | `quote_kicker`, `quote_text` | text, textarea | опційно; нема — блоку нема |
| Вкладка «Опис» · види послуги (плитки) | `services` | діти напрямку | уже є: ієрархія послуг |
| Мітка «Virtus» на плитці/чипі | `service_external` | bool у послуги | **нове** — послуга не клітинна, веде на virtus.ua |
| Вкладка «Консультанти» | — | запит: лікарі з позначкою SmartCell | уже є: лікарі |
| Вкладка «Відгуки» · стрічка | — | запит по напрямку | уже є: відгуки |
| Відгук · тип | `review_type` | text/video/guestbook | **нове** (на virtus це три різні блоки) |
| Відгук · відео | `youtube_url`, `poster` (16:9) | url, image | з feedback-video |
| Відгук · гостьова книга | `scans` | gallery | з feedback-guestbook |
| Флеш-відгук у слайдері | `flash` | text ≤120 знаків | **нове** — заповнений = пін, ліміт 9 на напрямок |
| Слайдер «Відгуки про лікарів напрямку» | `reviews_title` | text | **нове** / константа |

## Послуга (`service-omolodzhennya.html`) · рівень 4

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `service_title`, `service_lead`, `service_branches`, `service_image` | як у напрямку | title / excerpt / філії / featured |
| Опис | `description` | **один wysiwyg як на virtus** | content |
| Цитата | `quote_kicker`, `quote_text` | text, textarea | опційно |
| Вкладка «Рекомендації» | `recommendations` | wysiwyg (другий контент-блок, якщо на virtus він є окремо) | уже є / опційно |
| «До і Після» (острівець) | `ba_link`, `ba_image` | url, image 1:1 | **нове**; за замовчуванням virtus.ua/do-i-posle |
| Лікарі | `doctors` | relationship | уже є |
| Відгуки, консультація, філії, журнал | — | як у напрямку | — |

## Хаб розділу (`cell-technologies.html`) · рівень 1

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `hub_title`, `hub_lead`, `hub_branches`, `hub_cta_label`, `hub_image` | як у напрямку | title / excerpt / філії / featured |
| Напрямки (конфігуратор) | `hub_directions` | relationship → напрямки; у кожного — послуги | уже є: ієрархія |
| «Також у розділі» | — | 3 посилання: банк, препарати, консультанти | константи |
| Стаття розділу (темна) | `hub_story` | **один wysiwyg як на virtus** → `.sc-story__part` (відео — iframe у тексті) | content запису |
| FAQ хаба | `faq` | repeater: q, a | опційно; якщо на virtus FAQ у тексті — лишити в wysiwyg |
| Відгуки, консультація, філії, журнал | — | як у напрямку | — |

## Банк клітин (`bank.html`)

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `direction_*` | як у напрямку | — |
| «Що зберігаємо» | `bank_storage` | repeater: title, text | **нове** |
| Опис | `description` | один wysiwyg | content |
| Цитата | `quote_kicker`, `quote_text` | — | опційно |
| Показання | `indications_title`, `indications` | text; repeater: label, link (опц.) | **нове** |
| Відео | `video_url`, `video_poster`, `video_caption` | url, image, text | **нове** |

## Консультанти (`consultants.html`)

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `direction_*` | як у напрямку | — |
| Сітка лікарів | — | запит: лікарі з позначкою SmartCell | уже є (фото, ПІБ, посада, рейтинг, к-ть відгуків) |

## Лікар / консультант (`doctor-tsepkolenko-hanna.html`, `consultant-vyshnevska-hanna.html`)

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `doctor_name`, `doctor_position`, `doctor_experience`, `doctor_branches`, `doctor_photo` | title, textarea, number, relationship, image | уже є: картка лікаря |
| Рейтинг і к-ть відгуків | — | з відгуків лікаря | уже є |
| Послуги лікаря (конфігуратор) | `services` | таксономія: категорія → підгрупа → послуга | уже є |
| Клітинні технології лікаря | `doctor_smartcell` | repeater: послуга | **нове** (або фільтр послуг по розділу) |
| Відеовізитка | `doctor_video`, `doctor_video_poster` | url, image | **нове** |
| Біографія | `doctor_bio` | repeater: label, text (Освіта, Стажування, Членство, Наукова робота) | уже є на virtus — як там зберігається? |
| Відгуки про лікаря | — | запит + «Показати ще» (пагінація) | уже є |

## Препарати (`preparations.html`)

| Блок | Поле | Тип | Де взяти |
|---|---|---|---|
| Hero | `prep_title`, `prep_lead`, `prep_cta_label`, `prep_image` | — | title / excerpt / featured |
| Вступ | — | wysiwyg | content |
| Ролик Марії | — | url + постер | з відгуку (review_type = video) |
| Продукти | `products` | repeater: group (cosmetics / medical), photo 1:1, name, effects (repeater), details (wysiwyg), text | уже є на virtus — як там зберігаються? |
| Кошик «Додати в замовлення» | — | JS, `prep-order.js`; у формі приховане `product` (назви через кому) | як на virtus |
| Плита «Замовлення» | `order_title`, `order_text`, `order_cta_label`, `order_image` | text, textarea, text, image | **нове** / константи з форми virtus |
| Попап замовлення | — | ПІБ, телефон, склад замовлення | форма virtus (js-form12) |

## Без власних полів

- **Автор журналу** (`vm-author.html`) — автор WP + його пости.
- **Пошук / порожній пошук** (`vm-search.html`, `vm-search-empty.html`) — стандартний пошук WP.
- **404** (`404.html`) — статика.

---

## Разом: чого точно не було на virtus

`flash`, `review_type` (+ `youtube_url`, `poster`, `scans`), `service_external`, `ba_link`/`ba_image`,
`bank_storage`, `indications`, `doctor_smartcell`, `doctor_video`, `consult_*`, `order_*`.
Опційні (можна не заводити): `quote_kicker`/`quote_text`, `faq`.

Усе інше — заголовок, контент, featured image, філії, лікарі, послуги, відгуки — штатні сутності.
Якщо десь «не дуже лягає» — напишіть, який блок: підженемо розмітку під ваші поля, це швидше, ніж заводити нові.
