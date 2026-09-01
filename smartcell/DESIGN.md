# DESIGN.md — SmartCell Design System

> Source of truth: Figma file `t3K32ifBrrW1kD2BBbp1tA` ("SmartCell — Design System").
> Token architecture is layered (shadcn-style): raw ramps → brand aliases → semantic (modes) → responsive/typography (modes). CSS custom properties below mirror Figma variable code syntax 1:1. Do not invent values outside this file.

## 01 · Overview

Clinical-premium, OneSkin-derived language: white base, cool neutrals, one pale-aqua accent, hairline tables, zero border radius, tight grids, generous section rhythm. Dark sections = same semantics in `inverse` mode (`data-theme="inverse"`), never custom colors.

Two modes drive responsiveness: `desktop` (1920 frame / 1280 content) and `mobile` (440). One breakpoint. All spacing, radii and type scale switch by redefining the custom properties in a media query — components never hardcode px for these roles.

## 02 · Colors

### Raw ramps (do not use directly in components)
- `neutral/50…950`: #FFFFFF, #F4F4F4, #E6E6E6, #D4D4D4, #A3A3A3, #737373, #525252, #404040, #262626, #171717, #0D0D0D
- `teal/50…950` (brand aqua): #F2FAFC, #DFF1F6, #BFE4EE, #99D2E1, #68B4C9, #4699B2, #3A7F94, #2F6577, #254C59, #1A363F, #102227
- `blush/50…400` (reserved, currently unused): #FBF5F1 → #D9B8A8
- `red/500` #C4483E, `red/600` #A93A31, `green/500` #3E8E5A
- `alpha`: white & black(#141311) at 0/5/10/15/20/40/60/80/100%

### Brand aliases
`brand-neutrals/*` → neutral ramp; `brand-shades/*` → teal ramp. Combination 1: brand = shades/500, brand-foreground = white.

### Semantic (use ONLY these in components) — modes: normal | inverse
| token | normal | inverse | CSS |
|---|---|---|---|
| background | neutral/50 (#FFF) | neutral/950 | `--background` |
| foreground | neutral/950 | neutral/50 | `--foreground` |
| primary / primary foreground | neutral/900 / neutral/50 | teal/500 / white | `--primary` |
| secondary (gray band) | neutral/100 | neutral/800 | `--secondary` |
| accent (aqua band/chip) | teal/100 | teal/900 | `--accent` |
| accent foreground | neutral/900 | neutral/100 | `--accent-foreground` |
| muted / muted foreground | neutral/100 / neutral/500 | neutral/800 / neutral/400 | `--muted*` |
| warm | neutral/100 | neutral/800 | `--warm` |
| card / card foreground | white / neutral/950 | neutral/900 / neutral/50 | `--card*` |
| border (hairlines) | neutral/200 (#E6E6E6) | neutral/800 | `--border` |
| input (control outlines) | neutral/900 (dark 1px) | neutral/200 | `--input` |
| ring | teal/500 | teal/500 | `--ring` |
| destructive | red/500 | red/500 | `--destructive` |

Color usage is near-monochrome: caps labels, stars, percentages are `foreground`/`muted`, NOT accent. Aqua appears only in: announcement bar, chips, accent buttons in dark sections, sticky promo bar, portal active state.

## 03 · Typography

Family: **Inter** (var `--font-headings`; Fixel Display/Text pending client swap — change the variable, nothing else). Text styles mirror the `typography` collection; sizes are desktop/mobile mode values.

| style | weight | desktop | mobile | letter-sp | use |
|---|---|---|---|---|---|
| display/default | Regular | 64/72 | 40/46 | −1.5 | hero only |
| display/stat | Regular | 72/76 | 44/48 | −2 | big numbers |
| heading/1 | Regular | 44/52 | 32/40 | −1 | page H1 |
| heading/2 | Regular | 32/40 | 26/34 | −0.5 | section titles |
| heading/3 | Medium | 22/30 | 19/26 | 0 | card titles |
| caption/caps | Medium, UPPERCASE | 12/16 | 12/16 | +1.5 | labels, chips, tags |
| paragraph/large | Regular | 18/28 | 17/26 | 0 | leads |
| paragraph/regular | Regular | 16/26 | 16/25 | 0 | body |
| paragraph/small | Regular | 14/22 | 14/22 | 0 | card body, meta |
| paragraph/mini | Regular | 12/18 | 12/18 | 0 | footnotes, meta |
| ui/button | Medium, UPPERCASE | 13/20 | 13/20 | +0.8 | all buttons |

## 04 · Elevation & effects

Radii: **all semantic radii = 0** (`rounded-none…rounded-full` all resolve to 0). Absolute scale (radius-2…40, radius-infinite) exists in reserve — do not use without a system-level decision.

Shadows (effect styles, from `shadows` collection on black alpha): `shadow/sm` 0 1 3 @5%, `shadow/md` 0 2 8 −2 @10%, `shadow/lg` 0 10 20 −3 @10%, `shadow/xl` 0 20 32 −5 @15%. Used sparingly: glass navbar, sticky bar, promo card. Flat everywhere else.

Glass navbar: `position: fixed`; background white/alpha-60 + `backdrop-filter: blur(24px)`; 1px inside border white/50%; inset 32px; sits over 100vh hero. Scrolled state: raise alpha to 80–90.

## 05 · Layout tokens (responsive collection, desktop → mobile)

Role-based: one frame binds to exactly one role.

- `page/max-width` 1280 → 408 (`--page-max-w`); `page/margin-x` 80 → 20 (`--page-mx`)
- `bar/padding-y` 20 → 12 — header/announcement strips
- `section/padding-y` 120 → 56; `section/padding-y-tight` 64 → 40; `section/gap` 40 → 28 (heading→content)
- `stack/gap-lg` 20 → 14; `gap-md` 14 → 10; `gap-sm` 8 → 6 — text stacks
- `grid/gap` 16 → 12 — card grids, photo pairs, footer columns
- `card/padding` 28 → 20; `card/gap` 10 → 8
- `control/padding-x` 28 → 22; `control/padding-y` 14 → 12; `control/gap` 12 → 10

Rhythm principle (OneSkin): tight grids, generous vertical section padding. Air comes from `section/*`, never from inflating grid gaps.

## 06 · Components (canonical patterns)

- **Button**: square, uppercase (ui/button). Primary = `--primary` fill; Outline = transparent + 1px `--input`; Accent = teal/500 (dark sections only).
- **Hairline table**: wrapper background `--border`, 1px gaps, cells `--card`, outer 1px border. Used for: program contents, features 2×2, reviews, contraindications, services lists.
- **Card (flat)**: photo full-bleed square + caps tag chip (1px border) + heading/3 + meta. No card borders in carousels/feeds.
- **Stat**: display/stat number + paragraph/small muted label; transparent background.
- **Form input**: caps label + field with 1px `--input` border; float-placeholder behavior implemented per virtus theme JS.
- **Portal switcher**: logo + chevron trigger; dropdown lists VIRTUS / SMARTCELL spaces with dot indicators (neutral vs teal), active row `--accent`, footer link "← Повернутись на virtus.ua". Same-tab navigation; aria-expanded; Esc/outside-click closes.
- **Sticky promo bar**: `--accent` background, underlined product link, social proof, close ✕; `position: fixed; bottom: 0`; dismissed state persisted.
- **Tag chip**: caption/caps in 1px `--border` box, white bg.
- **Review flag** (internal): red box "ПРОВЕРИТЬ …" marks unverified medical/price content — must be resolved, never shipped.

## Do's & Don'ts

- DO alternate white / `--secondary` bands; DO use inverse-mode dark sections for stats and CTAs.
- DO keep photos square, edge-to-edge in their cells.
- DON'T add border-radius, gradients on UI, colored text, new hues, or shadows on cards.
- DON'T run Anthropic frontend-design skill together with Impeccable.
- DON'T hardcode spacing px — bind to the role tokens above.
- DON'T ship any "ПРОВЕРИТЬ"-flagged content.
