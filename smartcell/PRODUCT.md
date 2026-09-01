# PRODUCT.md — SmartCell / Face Control

<!-- impeccable:product-schema 1 -->

> Context file for Impeccable and any AI coding agent working on this project.
> Written from the approved Figma design system and client brief. Locked decisions are marked **[LOCKED]** — do not redesign them; push back only with a written reason.

## Platform

web

## Stack

WordPress — custom theme `virtus`, PHP templates, no page builders. New SmartCell pages are sibling pages on the shared virtus.ua skeleton (same grid, patterns, SEO infrastructure) with their own CSS theme layer. Multilingual via qTranslate-X (`[:ua]…[:ru]…[:]` in one field): never hardcode a second language into templates.

Breakpoint model: desktop 1920 design frame (content max 1280) and mobile 440. One breakpoint, token-driven (see DESIGN.md).

## Product Purpose

**SmartCell** — the cellular-technologies space inside VIRTUS Institute (virtus.ua), a medical clinic in Odesa, Ukraine, with 10+ years of cellular research, its own laboratory and patents.

**Face Control** — the first product: a year-long, medically supervised skin-restoration program (diagnostics → personalized protocol → procedures → year-round monitoring → objective re-assessment). Sold as a whole-year program with on-page payment (LiqPay or monobank acquiring).

**VIRTUS Magazine** — the science-populist blog feeding the space (rubrics: science, cells, cellness, biohacking; series-based articles up to 5000 chars; heavy internal linking to services).

## Users

Primary: women 35–45 (scenario 2 — main revenue segment). Decide online, avoid phone calls, 60%+ mobile traffic. They buy: clinic responsibility and experience, evidence-based medicine (not "beauty fast food"), self-care framing, time/money economy vs a year of creams and injections, controlled safe processes, access to innovations "like foreign celebrities have".

Secondary: 25–35 (prevention scenario) and 50+ (intensive scenario). The landing is tuned to scenario 2 with visible paths to 1 and 3.

Reading mode (Impeccable vocabulary): landing = **Persuade**; magazine = **Read**; future patient cabinet = Operate.

## Positioning

Clinical premium. "Наука, не хайп" — measured results (ultrasound, morphology), not promises. The visual language deliberately references oneskin.co: minimal, airy, monochrome-plus-one-accent, hairline tables, square geometry. Client's words: "мінімалістична, глянцева, клітинна, модна", "ніяких квіточок".

Tone of voice: Ukrainian, calm, precise, honest (there is a dedicated "who this is NOT for" block). Numbers are shown with footnote markers to sources.

## Non-negotiables **[LOCKED]**

1. **Typeface: Fixel Display (headings) / Fixel Text (body)** — client-approved as the replacement for interim Inter. The swap is executed via the font variables (`--font-headings`, and its body counterpart), not per-component. Do not propose other typefaces. _Note: DESIGN.md §03 and the theme's font variables still name Inter as primary — update them to Fixel to match this decision._
2. **Palette: OneSkin-derived cool neutrals + pale aqua accent** (see DESIGN.md). Do not introduce new hues.
3. **Geometry: square. All radii = 0** via tokens. Do not add rounded corners.
4. **Hairline tables** (1px gap, border-color substrate, white cells) are the canonical grid pattern.
5. **Buttons: uppercase, 13px, letter-spacing 0.8, square.** Primary = solid near-black; Outline = 1px dark border; Accent = aqua, used sparingly in dark sections.
6. Dark sections are the same semantic tokens in **inverse mode**, not custom colors.
7. Glass floating navbar (backdrop-blur 24, white/alpha-60, 32px inset) over 100vh hero.
8. Medical claims, contraindication lists, prices and ratings ship only after client/doctor confirmation — red **"ПРОВЕРИТЬ"** flags in mocks mark unverified content and must not reach production silently.

## Operating Context

### Site map (current scope)

- `/kletochnye-tehnologii/` — SmartCell space; portal switcher VIRTUS ↔ SMARTCELL near logo (dropdown, same tab)
- Face Control landing — 17 approved blocks (B01 hero … B17 magazine feed) per "Сторінка Продукту" doc; on-page payment CTA
- `/kletochnye-tehnologii/blog/{category}/{slug}` — VIRTUS Magazine (home + article template built in Figma)
- Architecture reserve: Протоколи → Напрямки (6 medical directions) → Продукти; custom post types + taxonomy designed for ~10 future products

### SEO requirements (carried over from old blog — must not be lost)

Reading time, views counter, author with specialty + avatar, publish AND updated dates, breadcrumbs (full path), related articles, per-article linked services with prices ("від N грн"), doctor card ("Консультує та оперує") with credentials, article rating (aggregate), newsletter signup with consent note, tag clouds (goals/topics) in footer. Schema.org: Article + Physician + AggregateRating; `dateModified` from "оновлено".

## Evidence on Hand

- 10+ years of institute research; own laboratory; patents (list on virtus.ua)
- 3000+ patients from 13 countries **[VERIFY with client]**
- Ultrasound + morphology before/after data; effect sustained up to 12 months
- Clinical percentages used in mocks (100% smoothness, 96% firmness, 90% elasticity, 86% wrinkles, +80% blood flow, 37% moisture) are **placeholders patterned after the reference site [VERIFY — replace with VIRTUS's own study numbers before ship]**
- Real patient before/after photos exist (low-res; publication requires written consent — noted in UI)
- Ambassador: Kateryna Katerynchyk (video/photo to be shot)
- No fabricated testimonials: review texts in mocks are samples **[VERIFY]**

## Product Principles

1. **Evidence over promises.** Every claim carries a source marker or is flagged unverified; measured results (ultrasound, morphology) outrank adjectives.
2. **Decide online, no phone call.** The primary user completes understanding → trust → payment on the page, on mobile, without contacting the clinic.
3. **Honesty is a feature.** A visible "who this is NOT for" block and no fabricated proof are load-bearing, not concessions.
4. **One product, a system built for ten.** Face Control ships first, but architecture (post types, taxonomy, tokens) is designed to carry ~10 future products without rework.
5. **Nothing unverified ships silently.** "ПРОВЕРИТЬ"-flagged medical claims, prices, and ratings must be resolved before production.

## Deadlines

Design approval: September presentation to the professor. Release target: **Sep 15–20, 2026**.

## Reference

- Visual: https://oneskin.co (client-approved)
- Blog structure: https://newzapiens.com/magazine (sticky product bar, author chips, tag-cloud footer)
- Figma source of truth: file `t3K32ifBrrW1kD2BBbp1tA` — "SmartCell — Design System" (pages: Foundations, Components, FC Landing — Desktop, VM Blog — Desktop)
