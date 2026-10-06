# Legacy design specification (Equreka v1, Nuxt 2 + Bootstrap 5.2.2)

Faithful, implementable description of the original Equreka interface (2021-2022) so the Astro web app can carry the same design language. This is a visual port: content and behavior of the v2 app do not change.

## 0. Provenance and method

| Tag | Meaning |
| --- | --- |
| **C** / COMPILED | Read from the resolved CSS produced by compiling `assets/scss/style.scss` with the exact locked toolchain (dart-sass 1.39.2, bootstrap 5.2.2, bootstrap-icons 1.9.1). |
| **T** / TEMPLATE | Read from a legacy `.vue`, `.js` or `nuxt.config.js` file. |
| **O** / OBSERVED | Seen in the reference screenshots under `docs/design/reference/`. |

- Source: `C:\Archivos de proyecto\GitHub\DerianAndre\Equreka\Equreka` (read-only, untouched). All execution happened in a scratch copy.
- The SCSS was compiled with the lockfile versions, so every value below is the value the 2022 build shipped. Sass 1.39 converts literal HSL colors outside custom properties to hex or RGBA; values inside custom properties stay as authored HSL. The spec quotes whichever form the compiled CSS contains.
- **The legacy app was run.** `npm ci --legacy-peer-deps` from the 2022 lockfile, `nuxt dev` on port 3100 with `NODE_OPTIONS=--openssl-legacy-provider` (SPA, `ssr: false`), captured with playwright-core driving the locally installed Chromium 1243. 48 JPEG screenshots (quality 48, 1,441,956 bytes total): 12 views x light/dark x desktop (1280 x 800, desktop user agent) / mobile (390 x 844, Android user agent, touch). File pattern: `reference/{desktop|mobile}-{light|dark}-{view}.jpg`, views `home-categories`, `home-types`, `unit` (metre), `equation` (mass-energy equivalence, first term hovered), `constant` (speed of light), `category` (physics), `type-list` (units), `search-open` (query "ene"), `calculator` (E = 2 J solved), `favorites-edit` (seeded, edit mode on desktop), `favorites-empty`, `settings` (theme dropdown open).
- The mobile shell is chosen by user-agent sniffing, not width (see section 9), so the mobile captures use a mobile UA.

## 1. Brand

### 1.1 Logo mark

- Geometry [T]: seven circles on a `0 0 820 500` viewBox, one per letter of "Equreka":

| id | cx | cy | r |
| --- | --- | --- | --- |
| E | 570 | 250 | 250 |
| q | 150 | 350 | 150 |
| u | 92.5 | 92.5 | 92.5 |
| r | 250 | 50 | 50 |
| e | 270 | 155 | 30 |
| k | 212.5 | 172.5 | 12.5 |
| a | 212.5 | 137.5 | 12.5 |

- Variants [T]: `logo.svg` (full-color, used everywhere through `Logo.vue`), `logo-black.svg` / `logo-white.svg` (single compound path, solid fill), `logo-circles.svg` (seven `<circle>` elements, no fill), `logo.png` (82 x 50 raster). The black, white, circles and PNG files already live in `docs/brand/`.
- Full-color treatment [T, O]: `logo.svg` is a 1730 x 1064 PNG mesh gradient embedded as base64 and clipped by the compound path. The gradient reads, left to right: green and yellow in the top-left (small circles u, r, e, a, k), cyan to blue to violet on the left edge (circle q), orange flowing into red and magenta across the large circle E. The file weighs 621,118 bytes for a mark displayed at 42 to 72 px wide.
- Hover [C]: `.equreka-logo { transition: all 0.35s ease, filter 1s ease-out }` and `:hover { filter: hue-rotate(1turn) }`, so the gradient cycles through the full hue wheel once per hover.
- Footer mark [T]: inline `logo-black` path with `fill="var(--footer-color)"`, max-width 22px, opacity 0.5, shown only below `lg` [C].

### 1.2 Wordmark

- There is no typeset wordmark in the shells [T, O]: the header shows the mark only. "Equreka" appears as plain `<small>` text in the desktop footer (left column) [T] and in the `<title>` [T].
- Dark theme [C]: `.theme-dark .header .equreka { opacity: 0.75 }` (dims the header brand element).

### 1.3 Favicon and app icon

- `static/favicon.ico` (15,086 bytes), `static/icon.png` (147,333 bytes, PWA icon, `purpose: maskable`), `static/icon-transparent.png` (132,044 bytes) [T].
- PWA `theme_color` and `background_color` equal the light body background, `hsl(220, 10%, 90%)` [T, C].

### 1.4 Loader

- Markup [T]: `Loader.vue` renders the seven-circle SVG, each circle filled with the neutral hue 220 at 10% saturation, 50% lightness and 0.35 alpha (inline `fill` attribute), centered in an absolutely positioned flex box, with a visually hidden "Loading" label.
- Size [C]: `width: clamp(32px, 10vw, 128px)`.
- Animation [C]: `@keyframes loader-loading { 50% { opacity: 0.35 } }`, `animation: loader-loading 2s linear infinite`, staggered `animation-delay` of 0.25s, 0.5s, 0.75s, 1s, 1.25s, 1.5s, 1.75s for circles 1 to 7 (E, q, u, r, e, k, a). `loader-complete` (scale to 0, fade out) is defined but unused.
- Route progress bar [C]: `.nuxt-progress` 6px tall, `top: 2px`, inset 1rem left and right, `border-radius: 3px`, `background: linear-gradient(90deg, #0661e0, #8c1ff9, #5b13ec, #e2367e, #dd3c3c, #ee7c2b, #fed401, #1fad1f, #0fbda0, #0f91bd)` with `background-attachment: fixed` (the rainbow is revealed as the bar grows). This rainbow is the only multi-hue brand gradient expressed in CSS.

## 2. Color system

### 2.1 Theme mechanism

- `@nuxtjs/color-mode` puts `theme-light` or `theme-dark` on `<html>`; preference `light`, `dark` or `system` (fallback light) [T].
- The SCSS mixins `theme-light()` and `theme-dark()` emit every token as a custom property on `.theme-light` / `.theme-dark`, plus per-category blocks nested as `.theme-light .physics { ... }` [C].
- Dark derivation formula [T]: for every palette, theme and category color, `darken(desaturate($value, 20%), 10%)`, that is saturation minus 20 points and lightness minus 10 points (absolute). The neutrals are hand-authored, not derived.

### 2.2 Neutral tokens (all hue 220, saturation 10%) [C]

| Token | Light | Dark |
| --- | --- | --- |
| `--body-bg` | `hsl(220, 10%, 90%)` | `hsl(220, 10%, 03%)` |
| `--body-bg-alpha` | `hsla(220, 10%, 90%, 0.97)` | `hsla(220, 10%, 03%, 0.97)` |
| `--body-bg-high` | `hsl(220, 10%, 94%)` | `hsl(220, 10%, 06%)` |
| `--body-color-muted` | `hsl(220, 10%, 65%)` | `hsl(220, 10%, 35%)` |
| `--body-color` | `hsl(220, 10%, 45%)` | `hsl(220, 10%, 60%)` |
| `--body-color-highlight` | `hsl(220, 10%, 35%)` | `hsl(220, 10%, 80%)` |
| `--header-color` | `hsl(220, 10%, 65%)` | `hsl(220, 10%, 35%)` |
| `--footer-color` | `hsl(220, 10%, 62.5%)` | `hsl(220, 10%, 32.5%)` |
| `--eqk-color` (default accent, overridden per category) | `hsl(220, 10%, 25%)` | `hsl(220, 10%, 85%)` |
| `--separator-color` | `hsl(220, 10%, 85%)` | `hsl(220, 10%, 8%)` |
| `--separator` | `1px solid var(--separator-color)` | same |
| `--selection-bg` | `hsla(0, 0%, 05%, 0.15)` | `hsla(0, 0%, 90%, 0.125)` |
| `--acrylic-bg` (opaque fallback surface) | `hsla(220, 10%, 97%, 0.97)` | `hsla(220, 10%, 12%, 0.97)` |
| `--acrylic-backdrop-bg` (surface when `backdrop-filter` is supported) | `hsla(220, 10%, 97%, 0.65)` | `hsla(220, 10%, 12%, 0.65)` |
| `--acrylic-backdrop` | `blur(10px) saturate(2)` | `blur(30px) saturate(1.35)` |
| `--input-bg` | `hsl(220, 10%, 96%)` | `hsl(220, 10%, 09%)` |
| `--input-color` | `hsl(220, 10%, 15%)` | `hsl(220, 10%, 55%)` |
| `--input-border-color` | `hsl(220, 10%, 85%)` | `hsl(220, 10%, 15%)` |
| `--input-focus-bg` | `hsl(220, 10%, 99%)` | `hsl(220, 10%, 10%)` |
| `--input-focus-color` | `hsl(220, 10%, 10%)` | `hsl(220, 10%, 60%)` |
| `--input-focus-border-color` | `var(--bs-primary)` | `var(--bs-primary)` |
| `--theme-lightness` | `98%` | `07%` |
| `--theme-inverted-lightness` | `05%` | `90%` |
| `--alpha-normal` / `--alpha-active` / `--alpha-hover` | 0.75 / 0.85 / 0.65 | 0.55 / 0.65 / 0.45 |
| `--alpha-acrylic` | 0.97 | 0.15 |
| `--alpha-acrylic-border` | 0 | 0 |
| `--alpha-acrylic-backdrop` | 0.75 | 0.75 |
| `--alpha-acrylic-shadow` | 0.15 | 0.15 |
| `--theme-icon` | `"\f497"` (bi-moon) | `"\f5a2"` (bi-sun) |

Roles [C, O]: `--body-color` is running text; `--body-color-highlight` is titles, card titles, table links on hover, search items; `--body-color-muted` is table headers, placeholders, symbol-badge borders; `--header-color` is the header icon buttons; `--footer-color` is the footer. `--theme-lightness` and `--theme-inverted-lightness` feed translucent tints such as `hsla(220, 100%, var(--theme-inverted-lightness), 0.075)` (hover wash in light: near-black at 7.5%; in dark: near-white at 7.5%).

Root-level values [C]: `:root { --bs-gutter-x: 1rem; --dropdown-backdrop: blur(10px) saturate(1.35) }`, `--bs-gutter-x: 1.25rem` from 576px. Bootstrap's `body` is overridden to `background: var(--body-bg); color: var(--body-color); transition: all 0.35s ease`.

### 2.3 Base palette (`--bs-{name}`) [C]

| Name | Authored | Light | Dark |
| --- | --- | --- | --- |
| blue | hsl 215, 95%, 45% | `#0661e0` | `#164e9c` (215deg, 75%, 35%) |
| indigo | hsl 270, 95%, 55% | `#8c1ff9` | `#731dc9` (270deg, 75%, 45%) |
| purple | hsl 260, 85%, 50% | `#5b13ec` | `#5024a8` (260deg, 65%, 40%) |
| pink | hsl 335, 75%, 55% | `#e2367e` | `#b23468` (335deg, 55%, 45%) |
| red | hsl 0, 70%, 55% | `#dd3c3c` | `#ac3939` (0deg, 50%, 45%) |
| orange | hsl 25, 85%, 55% | `#ee7c2b` | `#bd6628` (25deg, 65%, 45%) |
| yellow | hsl 50, 99%, 50% | `#fed401` | `#b79c15` (50deg, 79%, 40%) |
| green | hsl 120, 70%, 40% | `#1fad1f` | `#267326` (120deg, 50%, 30%) |
| teal | hsl 170, 85%, 40% | `#0fbda0` | `#1b7e6e` (170deg, 65%, 30%) |
| cyan | hsl 195, 85%, 40% | `#0f91bd` | `#1b657e` (195deg, 65%, 30%) |
| white | hsl 0, 100%, 100% | `white` | `#fad1d1` (derivation bug, see section 9) |
| gray | hsl 220, 10%, 40% | `#5c6370` | `#4d4d4d` |

Olive (hsl 75, 75%, 40%) and magenta (hsl 285, 85%, 50%) exist only in the category map: light `#8cb31a` / dark `#627722` and light `#b613ec` / dark `#8724a8`.

Each palette entry also ships an `-hsl` triplet (`--bs-blue-hsl: 215deg, 95%, 45%` in light), consumed as the first three arguments of an HSLA color with a separate alpha (for example `hsla(var(--eqk-color-hsl), 0.25)`).

### 2.4 Semantic colors (Bootstrap theme) [C]

| Role | `:root` / light | Dark custom property only |
| --- | --- | --- |
| primary | `#0d6efd` | `#175bc0` |
| secondary | `#6c757d` | `#5b5b5b` |
| success | `#198754` | `#1c5138` |
| info | `#0dcaf0` | `#1f94ab` |
| warning | `#ffc107` | `#be9415` |
| danger | `#dc3545` | `#a73742` |
| light | `#f8f9fa` | `#e0e0e0` |
| dark | `#212529` | `#0c0c0c` |

Bootstrap components compile literal hex (`.btn-primary { --bs-btn-bg: #0d6efd }`), so buttons, focus rings and dropdown active items keep the light values in dark theme [C, O]. Only CSS that reads `var(--bs-*)` (the mobile menu dots, the empty-state illustrations, the input focus border) darkens.

Button states [C]:

| Variant | bg | hover bg | active bg | text |
| --- | --- | --- | --- | --- |
| `btn-primary` | `#0d6efd` | `#0b5ed7` | `#0a58ca` | `#fff` |
| `btn-dark` | `#212529` | `#424649` | `#4d5154` | `#fff` |
| `btn-success` | `#198754` | `#157347` | `#146c43` | `#fff` |
| `btn-danger` | `#dc3545` | `#bb2d3b` | `#b02a37` | `#fff` |
| `btn-warning` | `#ffc107` | `#ffca2c` | `#ffcd39` | `#000` |
| `btn-pink` | `#e2367e` | `#e65491` | `#e85e98` | `#000` |

Focus ring [C]: `--bs-btn-focus-box-shadow: 0 0 0 0.25rem rgba(var(--bs-btn-focus-shadow-rgb), .5)`; form controls `box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25)`.

### 2.5 Category palette [C]

Applied by putting the slug as a class on any ancestor; it sets `--eqk-color`, `--eqk-color-hsl`, `--eqk-color-h`, `--eqk-color-s`, `--eqk-color-l`.

| Category | Light `--eqk-color` | Dark `--eqk-color` | Light HSL triplet |
| --- | --- | --- | --- |
| universal | `#ee7c2b` (orange) | `#bd6628` | 25deg, 85%, 55% |
| mathematics | `#dd3c3c` (red) | `#ac3939` | 0deg, 70%, 55% |
| physics | `#0661e0` (blue) | `#164e9c` | 215deg, 95%, 45% |
| chemistry | `#8c1ff9` (indigo) | `#731dc9` | 270deg, 95%, 55% |

The v2 tokens (`packages/tokens/src/index.ts`) currently assign different hues (universal violet, mathematics blue, physics orange, chemistry green). The port replaces them with the table above.

### 2.6 Collection-type colors [C]

Same mechanism, same class-on-ancestor convention:

| Type | Light | Dark |
| --- | --- | --- |
| equations | `#8cb31a` (olive) | `#627722` |
| formulas | `#1fad1f` (green) | `#267326` |
| constants | `#0fbda0` (teal) | `#1b7e6e` |
| magnitudes | `#0f91bd` (cyan) | `#1b657e` |
| variables | `#0661e0` (blue, same as physics) | `#164e9c` |
| units | `#5b13ec` (purple) | `#5024a8` |
| prefixes | `#b613ec` (magenta) | `#8724a8` |

Mobile menu accents [C, T]: `home` blue, `search` indigo, `calculator` pink (item commented out of the menu), `favorites` red, `settings` yellow, read as `var(--bs-{color})`, so they darken.

### 2.7 Term-kind colors (equation cross-highlighting) [C]

| Kind | `--term-color` (literal, both themes) | `--term-color-hsl` |
| --- | --- | --- |
| magnitude | `#ee7c2b` | `var(--bs-orange-hsl)` |
| variable | `#dd3c3c` | `var(--bs-red-hsl)` |
| constant | `#0661e0` | `var(--bs-blue-hsl)` |

Text uses the literal light hex in both themes; row tints use the `-hsl` var, which darkens. Hover color rule: `.equreka-term:hover, .equreka-term.equreka-term-hover { color: var(--term-color, var(--body-color-highlight)) !important }` with `transition: color 0.35s 0s ease`. Observed: the hovered `E` in the display equation and the matching table row turn orange together in both themes [O].

### 2.8 Badge and on-accent colors [C]

- Category and type badges: `background: var(--eqk-color) !important; color: hsl(var(--eqk-color-h), 100%, 90%) !important`.
- Symbol badge: transparent, `border: 1px solid var(--body-color-muted)`, inherits text color; hover `color: var(--body-bg); background: var(--body-color-highlight)`.
- Search count badge: transparent, `border: 1px solid var(--body-color)`, `color: var(--body-color)`.
- On-accent text in page headers: label `hsl(var(--eqk-color-h), var(--eqk-color-s), 80%)`, title `hsl(var(--eqk-color-h), 100%, 95%)`, action icons `hsl(var(--eqk-color-h), 100%, 85%)`, hovered action `hsl(var(--eqk-color-h), 100%, 95%)` on `hsl(var(--eqk-color-h), var(--eqk-color-s), calc(var(--eqk-color-l) + 5%))`.
- Math values [C]: exponent sign plus `#1fad1f`, minus `#dd3c3c`; values `var(--body-color-highlight)`; operators `var(--body-color-muted)`; unit symbols `var(--eqk-color)`.
- Links [C]: Bootstrap `--bs-link-color: #8c9ba7` (underlined); `.link-category` `#8c9ba7` turning `var(--eqk-color, #0d6efd)` on hover. `--bs-link-hover-color` stayed `#0a58ca` (computed from the default primary before the override).
- Calculator error alert [C]: acrylic surface with `box-shadow: 0 1rem 1rem -1rem rgba(221, 60, 73, 0.85), inset 0 0 0 2px rgba(221, 60, 73, 0.25)`.
- Scrollbars [C]: global `::-webkit-scrollbar { width: 5px; background: #fff }` (authored `$white`, compiled `white`), thumb `#888`; math cards and responsive tables use a transparent track with thumb `hsla(var(--eqk-color-hsl, 220, 20%, 40), 0.35)` (0.65 while active), 3px wide, 10px from `lg`.

## 3. Typography

### 3.1 Families and weights

- Body [C]: Bootstrap stack `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`, 1rem, weight 400, line-height 1.5. Observed as Segoe UI on Windows [O].
- Headings and UI chrome [C]: `"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, ...`. Loaded from Google Fonts with `wght@500;600` only [T].
- Math [C]: `.math { font-family: serif }` for HTML-rendered values; MathJax CHTML (TeX fonts) for TeX [T].

Poppins usage rules [C]:

| Weight | Where |
| --- | --- |
| 500 | All `h1`-`h6` (default `$headings-font-weight`), every `.btn`, list-card item names |
| 600 | `.card-title`, collapse-card titles, header icon buttons, search group titles, page-header label and title (base), calculator error type |
| 700 | Category and type badges, page-header title from `lg`, page-header label from `sm`, `.btn-collapse`, `details > summary`, table headers (`bold`) |
| 800 | `.dropdown-header`, page-header label from `lg` |

Only 500 and 600 were downloaded, so every 700 and 800 declaration renders as browser-synthesized bold of 600 [T, O]. Letter-spacing [C]: `.btn` 0.5px; badges, page-header label and title, dropdown header 1px; badges, page-header label, dropdown header and table headers are `text-transform: uppercase`.

### 3.2 Scale [C]

Headings: `margin-top: 0; margin-bottom: 0.5rem; line-height: 1.2`.

| Element | Size below 1200px | From 1200px |
| --- | --- | --- |
| h1 | `calc(1.375rem + 1.5vw)` | 2.5rem |
| h2 | `calc(1.325rem + 0.9vw)` | 2rem |
| h3 | `calc(1.3rem + 0.6vw)` | 1.75rem |
| h4 | `calc(1.275rem + 0.3vw)` | 1.5rem |
| h5 | 1.25rem | 1.25rem |
| h6 | 1rem | 1rem |

Fluid sizes use the `rs($property, $min, $scale, $max)` mixin, which emits a linear `calc()` fallback, then `min(max())`, then `clamp($min, $scale, $max)` [T, C]. Effective values:

| Element | Value |
| --- | --- |
| `p` | `clamp(0.9rem, 1.5vw, 1rem)` |
| `p.lead` | `clamp(1rem, 1.5vw, 1.15rem)`, weight 400 |
| `.card .card-title` | `clamp(1.1rem, 2vw, 1.25rem)`, weight 600, color `--body-color-highlight`, margin-bottom `clamp(0.5rem, 2vw, 0.85rem)` |
| Collapse-card title | `clamp(1.15rem, 2vw, 1.35rem)`, weight 600 |
| Home category card title | `clamp(1.25rem, 2vw, 1.75rem)`; lead `clamp(1rem, 2vw, 1.1rem)`, 3-line clamp |
| Page-header label | `clamp(0.75rem, 2vw, 1rem)` |
| Page-header title | `clamp(1.35rem, 3vw, 2rem)` |
| Display math (`.card-mathjax`, `.card-calculator`) | `clamp(1.25rem, 3vw, 2.5rem)` |
| Calculator background TeX | `clamp(5.5em, 8vw, 10em)` |
| Calculator message | `clamp(1.15rem, 1.5vw, 1.75rem)` |
| List-card links | `clamp(0.95rem, 2vw, 1rem)` |
| "View all" pill | `clamp(0.75rem, 1vw, 0.95rem)` |
| Data pages body | `clamp(0.9rem, 2vw, 1rem)` |
| Footer | `clamp(0.85rem, 2vw, 1rem)`; social icons `clamp(0.85rem, 2vw, 1.15rem)` |
| Table headers | 80%, uppercase, bold Poppins, `--body-color-muted` |
| Dropdown header | 0.8rem, 800, uppercase, 1px tracking, `--body-color-highlight` |

### 3.3 Math display

- `.card-mathjax .card-body` [C]: flex row, `gap: 0.25em`, centered by `::before { margin-left: auto }` / `::after { margin-right: auto }` spacers (min 1rem) so overflowing math scrolls instead of clipping; padding-top/bottom `clamp(1.5rem, 4vw, 3rem)`, padding-x 1rem; color `--body-color-highlight`; `overflow: auto` with the thin accent scrollbar.
- Reveal [C]: the body starts at `height: 0; transform: scaleY(0)` and runs `animation: mathjax 0.35s 0.35s ease forwards` (0% hidden, 20% at 0.2 scale, 100% full).
- MathJax focus [C]: `mjx-container:focus::after` draws a `hsla(0, 0%, var(--theme-inverted-lightness), 0.15)` wash, 0.25rem outset, radius 0.5rem.
- Constant display [T, O]: `symbol = value x 10^exp unit`, value in highlight color, exponent sign green or red.
- Unit/magnitude display [T, O]: `\text{Name} - symbol` (for example "Metre - m").
- HTML math [C]: symbols oblique, values upright normal weight; in data tables, symbols weight 600 highlight color, unit symbols 105%, values 110%.

## 4. Layout

### 4.1 Breakpoints and containers [C]

| Name | Min width | `.container` max-width |
| --- | --- | --- |
| xs | 0 | 100% |
| sm | 576px | 540px |
| md | 768px | 720px |
| lg | 992px | 960px |
| xl | 1200px | 1140px |
| xxl | 1400px | 1320px |

- `.container` declares its own `--bs-gutter-x: 1.5rem`, so horizontal padding is 0.75rem per side at every width; the `:root` gutter override never reaches it [C]. Confirmed: content starts at x = 82 px on the 1280 px capture ((1280 - 1140) / 2 + 12) and at x = 12 px on the 390 px capture [O].
- `$navbar-expand: lg` (header layout and page chrome switch at 992px), `$abbr-expand: md` (abbreviations expand at 768px) [T].
- `.layout { min-height: 100vh; display: flex; flex-direction: column }`; the footer uses `margin-top: auto` [C].

### 4.2 Desktop shell ("web" layout)

Header [C, T, O]:

- `<header class="header">`, `padding: 1.5rem 0`, `color: var(--header-color)`, no background (sits on `--body-bg`).
- Inside `.container`: three flex zones `.left` (logo, `flex: 1`), `.center` (search, `flex: 1 1 auto`, centered), `.right` (icon menu, `flex: 1`, `justify-content: flex-end`, `margin-right: -0.5rem`). Below `lg` the center zone wraps to a full-width second row (`order: 2; flex: 1 0 100%`, search `margin-top: 1rem`).
- Logo `.equreka-logo`: 42px wide below 375px, 62px from 375px, 72px from 425px. Focus ring: a `::before` wash `hsla(220, 100%, var(--theme-inverted-lightness), 0.075)` inset -20% / -12.5%, radius 1em.
- Icon menu: four `NuxtLink.btn` (home `bi-house`, search `bi-search`, favorites `bi-heart`, settings `bi-gear`), visually hidden labels plus `title`. `.btn`: Poppins 600, padding 0.75rem, radius 0.75rem, `transition: all 0.35s ease`, color `--header-color`; hover, focus and `aria-expanded` color `--body-color-highlight` with background `hsla(220, 100%, var(--theme-inverted-lightness), 0.075)`. Icon size 18px, 20px from 375px, 26px from 425px.
- Search sits centered (544 px wide at 1280 px viewport) [O].

Footer [C, T, O]:

- `<footer>`: `padding: 1rem 0`, `color: var(--footer-color)`, one row of three columns from `lg`: "Equreka" small text (left), social icons centered (`bi-github`, `bi-facebook`, `bi-twitter`, `bi-discord`), text links right-aligned (About us, Contact us, Donate; underline on hover).
- Below `lg`: links row first (full width, centered), social row, then the 22px logo mark at 50% opacity.
- `.nav-link` padding 0.5rem (0.65rem from md); hover and focus color `--body-color`; focus background `hsla(0, 0%, var(--theme-inverted-lightness), 0.075)`, radius 0.25rem.
- Social hover colors (light): github `#666666`, facebook `#4051b5`, twitter `#02a6f2`, discord `#7288da`. Dark theme defines darkened `--github: #4d4d4d`, `--facebook: #464e7c`, `--twitter: #157dac`, `--discord: #6174b8` that nothing reads.

### 4.3 Mobile shell ("app" layout)

- Chosen when `$device.isMobile` (user agent) is true [T].
- `.app-header` [C]: `margin: 1rem 0`, `max-height: 70px`, logo centered, 62px wide. No search, no icons.
- Home places the search bar in-page above the toggle [T, O].
- Bottom navigation `.app-menu` [C, O]: `position: fixed; bottom: 0; left: 0; right: 0; margin: 1rem; max-height: 70px; border-radius: 1rem; z-index: 999`, acrylic surface. Four equal links (`flex: 1 1`), each `height: 17.5vw; max-height: 70px`, icon 1.5rem, color `--body-color`.
- Active link [C]: color `var(--app-nav-color)`, icon `transform: rotate(360deg)` (0.35s), plus an 8 x 8 px dot (`border-radius: 999rem`) at `bottom: 5px`, centered, that fades in and slides from `translate(-50%, 50%)` to `translate(-50%, 0%)`. Home only counts as active on exact match.
- Body spacing [C]: `.layout.app { padding-bottom: calc(17.5vw + 2rem) }`; a fixed `::after` fade 100px tall, `linear-gradient(transparent, var(--body-bg) 95%)`, `z-index: 998`, under the menu.
- Page-header actions show only calculator and favorite below md (download and report are `d-none d-md-flex`) [T, O].
- Settings in the app shell appends the footer's text links and social icons under the card [T, O].

### 4.4 Spacing

- Bootstrap spacers [C]: 0 / 0.25rem / 0.5rem / 1rem / 1.5rem / 3rem (`*-0` to `*-5`); templates mainly use `mb-3`, `mb-4`, `gap-2`, `gap-3`, `my-3`.
- Fluid spacing [C]: card margin-bottom `clamp(0.75rem, 2vw, 1.15rem)`; card body padding y 1.25rem, x `clamp(0.95rem, 2vw, 1.25rem)`; page header padding y and margin-bottom `clamp(0.75rem, 2vw, 1.35rem)`.
- Table cells [C]: `padding: 0.5rem 0.5rem`, no borders, `white-space: nowrap`.

### 4.5 Acrylic surfaces [C]

The `acrylic-bg` mixin is the single surface recipe (cards, search input, search results, dropdowns, bottom menu, calculator alert, MathJax menus):

```css
background: var(--acrylic-bg);
box-shadow: 0 0.5rem 1rem -0.5rem hsla(0, 0%, 0%, var(--alpha-acrylic-shadow)), inset 0 0 0 1px hsl(220, 10%, var(--theme-lightness), var(--alpha-acrylic-border));
@supports (backdrop-filter: blur(5px)) {
	background: var(--acrylic-backdrop-bg);
	backdrop-filter: var(--acrylic-backdrop);
}
```

- Light: `blur(10px) saturate(2)` over 65% white-ish; dark: `blur(30px) saturate(1.35)` over 65% near-black. The inset ring has alpha 0 in both themes (invisible).
- Dark theme removes the drop shadow from all cards: `.theme-dark .card { box-shadow: none !important }`.
- Observed effect: the blurred empty-state illustration shows through the search results panel [O].

### 4.6 Radii [C]

| Element | Radius |
| --- | --- |
| `.card` | `clamp(0.5rem, 1.5vw, 1rem)` |
| Home category/type card | `clamp(1rem, 1.5vw, 1.15rem)` |
| Bottom menu, search results | 1rem |
| Header icon button, dropdown menu | 0.75rem |
| `.btn` (`$btn-border-radius`), list-card links, table rows, MathJax focus | 0.5rem |
| Badges, inputs, selects | 0.375rem |
| Search input, search button, page-header actions, toggles (`rounded-pill`) | 99rem / 50rem |
| Progress bar | 3px |

### 4.7 Shadows [C]

| Element | Shadow |
| --- | --- |
| Acrylic surface | `0 0.5rem 1rem -0.5rem hsla(0, 0%, 0%, var(--alpha-acrylic-shadow))` |
| Home category card | `0 0.75rem 1.25rem -1rem var(--eqk-color)`; hover `0 1rem 1.75rem -1rem var(--eqk-color)` |
| List cards on category and type pages (`.card-category`, `.card-type`) | `0 0.5rem 1.25rem -1rem var(--eqk-color)` (light only) |
| Page header | `0 0.5rem 2rem -1rem var(--eqk-color)` |
| Search input focus | `0 0.5rem 1rem -0.5rem hsla(0, 0%, 0%, var(--alpha-acrylic-shadow)), inset 0 0 0 2px rgba(83, 121, 198, 0.5)` |
| Category button focus | `0 0 0 0.25rem hsla(var(--eqk-color-hsl), 0.25)` |

### 4.8 Borders and separators [C]

- Cards have no border (`$card-border-width: 0`); separation comes from the acrylic surface against `--body-bg`.
- `--separator` (`1px solid var(--separator-color)`) is used for dropdown borders and MathJax info panels; `hr` in settings at opacity 0.1.
- Inputs: `1px solid var(--input-border-color)`; focus border `var(--bs-primary)`.

### 4.9 Transitions and animations [C]

| Name | Definition | Used for |
| --- | --- | --- |
| Global ease | `transition: all 0.35s ease` | body, cards, buttons, badges, header, menu, list links, search items |
| Theme switch | `body { transition: all 0.35s ease }` plus `.theme-transition` on `<html>` for 350 ms, which runs `theme-change 0.35s ease forwards` (scale 0 to 1, opacity 0 to 1) on `.theme-icon` [T, C] | Light/dark change from settings |
| Page transition | `.page-enter-active, .page-leave-active, .layout-enter-active, .layout-leave-active { transition: opacity .25s }`, enter/leave at opacity 0 | Route changes |
| `toggle` | `transition: all 0.5s ease, opacity 0.75s ease`; enter from `height: 0; opacity: 0; transform: translateY(-5%) scale(1.025)` | Home categories/types switch |
| `fade` | `transition: opacity 0.5s ease` | Calculator result and message |
| `dropdown` keyframes | 0.5s ease, from `opacity: 0; margin-top: -1rem` | `.dropdown-menu.show` |
| `fade-in` | 0.75s (panel), 0.35s (groups) | Search results |
| `mathjax` keyframes | 0.35s, 0.35s delay | Display equation reveal |
| `fade` keyframes to `--fade-final: 0.1` | 1s, 0.5s delay | Calculator background TeX |
| Collapse | `.collapsing { height: 0; transition: height 0.35s ease }`; chevron `transform: rotate(90deg)` over 0.35s | Collapse cards |
| Logo hover | `filter: hue-rotate(1turn)` over 1s ease-out | Header logo |
| Loader pulse | `loader-loading 2s linear infinite`, staggered 0.25s | Loader |
| `details` keyframes | 0.35s linear, from `translateY(-50%)`, opacity 0 | `<details>` sections |

Hover, focus and active states [C]:

- Home category card: `transform: scale(1.025)`, larger shadow, text to `hsl(var(--eqk-color-h), 100%, 97%)`.
- List-card link: `background: rgba(102, 119, 153, 0.2)`, text `--body-color-highlight`, its symbol badge inverts.
- Table row hover (or term hover): cells `background: hsla(var(--term-color-hsl, var(--eqk-color-hsl)), 0.15)`, links `hsla(var(--term-color-hsl, var(--eqk-color-hsl)), 1)`; first and last cells rounded 0.5rem so the row reads as a pill.
- Search result item hover and focus: `hsla(var(--eqk-color-h), 85%, 50%, 0.2)`; active `hsla(var(--eqk-color-h), 85%, 50%, 0.5)`.
- Header and search buttons: `hsla(220, 100%, var(--theme-inverted-lightness), 0.075)` wash.
- Links, header buttons, search items and menu links set `outline: 0` with no replacement ring (see section 9).

## 5. Components

### 5.1 Card (`.card`) [C, T]

Acrylic surface, no border, fluid radius and margin (sections 4.5 to 4.7), `.card-body` padding 1.25rem / `clamp(0.95rem, 2vw, 1.25rem)`, `.card-title` highlight color 600. Last paragraph has no bottom margin. `.card-information p { white-space: pre-line }`.

### 5.2 Collapse card (`CardCollapse.vue`) [T, C, O]

- Structure: `.card.card-collapse.card-{slug}` > `.card-body` > `.collapse-header` (flex, space-between) holding a full-width `.btn.btn-text.btn-collapse` whose child is `h2.card-title`, plus an optional link slot; then `.collapse.show` content.
- Chevron: `.btn-collapse::before` is bi-chevron-right (`\f285`) on the left, rotated 90deg when expanded. On entry pages (`main.data`) it moves to the right: glyph bi-chevron-left (`\f284`), `order: 1`, rotated -90deg when expanded (reads as a down chevron) [C, O].
- `.btn-text`: no horizontal padding, color `--body-color`, hover `--body-color-highlight`.

### 5.3 List card (`CardList.vue`) [T, C, O]

- A collapse card whose link slot holds a "View all" pill: `.btn.btn-sm.btn-go.rounded-pill`, background `rgba(102, 119, 153, 0.2)`, color `--body-color`, label plus `bi-arrow-right`. From `lg` the label is always visible; below `lg` the label is collapsed (`width: 0; transform: scaleX(0)`) and expands on hover.
- Body `.list`: wrapping flex of links, each `padding: 0.5rem 0.75rem; border-radius: 0.5rem`, symbol badge (if the item has a symbol) then name (weight 500). Hover per 4.9.
- Shadow tint comes from the page's accent (the type or category of the page), not from each group [T, O].

### 5.4 Badges [C, T, O]

| Badge | Construction |
| --- | --- |
| Category / type (`.badge.badge-category`, `.badge-type`) | Bootstrap badge (padding 0.35em 0.65em, 0.75em, line-height 1, radius 0.375rem) + uppercase Poppins 700, 1px tracking, `var(--eqk-color)` fill, `hsl(var(--eqk-color-h), 100%, 90%)` text. Content is an `Abbr`: full word from md ("PHYSICS"), three-letter abbreviation below md ("PHY") [O]. |
| Symbol (`.badge.badge-symbol`) | `inline-flex`, `padding: 0.35rem`, 1px `--body-color-muted` border, text inherits, `font-size: 100%`, holds inline math; hover inverts to `--body-bg` on `--body-color-highlight`. |
| Search group count | Outline, 1px `--body-color`, padding 0.45rem 0.35rem. |
| "Unit of" / "Base unit" chips | `.badge.badge-type` with the target's type class (for example `magnitudes`), so "LENGTH" renders cyan [T, O]. |

### 5.5 Tables (`Table*.vue`, `.table-data`) [C, T]

Shared: `.table-responsive` wrapper (thin accent scrollbar), `.table.table-data`, no borders, cells nowrap, `vertical-align: baseline`, headers 80% uppercase bold Poppins muted, rows highlight per 4.9. Header labels use `Abbr` (for example "Symbol" becomes "SYM" below md) [O].

| Variant | Columns |
| --- | --- |
| `table-constants` | symbol, name (link), value (HTML scientific), unit symbol, unit name (link). Rows carry `equreka-term equreka-constant equreka-{symbol}`. |
| `table-variables` (also magnitudes) | symbol, name, unit symbol, unit name. Rows carry `equreka-term equreka-{variable or magnitude} equreka-{symbol}`. |
| `table-values` | value (full precision when exact), unit symbol, unit name; split into "Approximate values" and "Exact values" cards side by side from lg. |
| `table-units` | name, symbol. |
| `table-conversions` | name, conversion `(1 {unit})` right-aligned with `≈` operator when inexact, symbol, formula (TeX). |
| `table-prefixes` | name, symbol, exponent (`10^n`), full number; two tables (positive, negative) in a two-column card. |
| `table-favorites` | category badge, name (`.link-category`), actions; `width: auto; table-layout: fixed; font-size: 0.95rem`; cells padding 0.35rem y; name column 100%; header visually hidden. |

### 5.6 Action buttons (`Actions/*.vue`, `PageActions.vue`) [T, C, O]

- Icon mode (default): icon only, label in `.visually-hidden`, plus `title`. Expanded mode: label shown from the `expand` breakpoint (default md) with icon margin `me-md-3`.
- Page-header actions: `.btn.btn-link`, round (`border-radius: 99rem`), padding `clamp(0.5rem, 1vw, 0.75rem)`, icon `clamp(1.15rem, 2vw, 1.35rem)`, colors per 2.8.
- Order: calculator (`bi-plus-square`, or `bi-info-square` when already on the calculator; hidden for constants, variables, magnitudes and unsupported equations), favorite (`bi-heart`, `bi-heart-fill` when saved or hovered), download JSON (`bi-cloud-download`, md+), report (`bi-flag`, md+).
- Copy (`bi-clipboard`): `btn-dark` in the code card input group (expanded) and round `btn-dark p-3` in the calculator.

### 5.7 Search bar and results (`SearchBar.vue`, `SearchResults.vue`) [T, C, O]

- Input `.search-bar-input`: pill, `padding: 0.65rem 3rem 0.65rem 1.5rem`, no border, acrylic surface; focus adds the 2px inset ring `rgba(83, 121, 198, 0.5)`. Large variant `.lg`: 115% text, padding 0.75rem y. Placeholder "Constants, variables, units, equations or formulas..." in `--body-color-muted`.
- Submit button: absolute, right 0.25rem, 2.5rem circle (2.75rem in `.lg`), `bi-search` 1rem, color `--header-color`, hover wash.
- Results panel `.search-bar-results`: acrylic, radius 1rem, `margin-top: 1rem` (0.5rem and absolutely positioned under the header search and on home), `animation: fade-in 0.75s`. Max height 500px in the header, 60vh on home. Inner padding 1rem 0.
- Group (`.items`): title row (Poppins 600, 1rem, highlight, flex) with the type name and an outline count badge pushed right; items `padding: 0.25rem 1rem`, name left and category badge right, highlight color. On the search page groups and items get padding 0.5rem 1.25rem, titles 1.35rem, items 1.15rem.
- Groups order: equations, formulas, constants, magnitudes, variables, units [T]. Empty states [T]: `search.try-for` ("Try searching your favorite equation!") when focused with an empty query, `search.no-results` otherwise, both rendered as a group title.
- The header search is hidden on the search page [C].

### 5.8 Inputs and selects [C, T, O]

- `.form-control` / `.form-select`: padding 0.375rem 0.75rem, radius 0.375rem, `--input-bg`, `--input-border-color`, text `--body-color`; focus `--input-focus-bg`, border primary, ring `rgba(13, 110, 253, 0.25)`. Disabled: `hsla(0, 0%, var(--theme-inverted-lightness), 0.1)` background, `cursor: not-allowed`.
- Calculator, converter and contact forms use `.form-floating` (control height `calc(3.5rem + 2px)`, label padding 1rem 0.75rem). Labels are "Name (unit symbol)" [T, O].

### 5.9 Calculator [T, C, O]

1. Page header (entry color, actions start with `bi-info-square` back to the entry).
2. Result card `.card-calculator`: min-height `clamp(100px, 15vw, 155px)`; behind it the expression rendered as outlined TeX (`-webkit-text-fill-color: transparent; -webkit-text-stroke: 1px var(--body-color-muted)`, bold, `translateY(-7.5%)`, fading to opacity 0.1); in front the centered serif result `symbol = value unit` with `gap: 0.35em`. Errors replace the result with a centered message (type in Poppins 600, muted).
3. Inputs card, centered, `col-lg-6`: floating inputs (one per magnitude or variable, `col-md-auto`, min-width 150px); for unit conversions, input, a `bi-chevron-right` muted separator (sm+), and a floating select "Convert to". Actions row: round `btn-danger p-3` reset (`bi-arrow-clockwise`), `btn-success` pill "Calculate" (`px-sm-5`, fills the middle), round `btn-dark p-3` copy (`bi-clipboard`).
4. Variables and magnitudes tables in plain cards, `col-lg-6`.

### 5.10 Favorites list and edit mode [T, C, O]

- Header: `h2` "Favorites" with a square `.btn` on the right: `btn-warning` + `bi-pencil` (view) or `btn-success` + `bi-check2` (editing); lead below.
- One collapse card per type (title "Equations", "Constants", ...), each with `table-favorites`: category badge, underlined `.link-category` name, actions: square `btn-primary` + `bi-plus` (opens calculator, only for calculable entries) and, in edit mode, round `btn-danger` + `bi-x` (remove). Action buttons are `p-0`, icon `fs-5` (1.25rem).
- Empty: a card with `h4` "You don't have any favorites!" (with emoji) over the heart illustration [O].

### 5.11 Alerts and messages [C, T]

- Calculator alert: acrylic plus red shadow (2.8), absolutely positioned across the top of the calculator.
- Calculator message: centered column inside the result card, muted text.
- Copy feedback uses `window.alert` [T].

### 5.12 Empty-state illustrations [T, C, O]

- `SVGSearchEmpty`: document-and-magnifier illustration (viewBox `0 0 500 466`), fills from CSS variables: accent `var(--bs-purple)`, `var(--body-bg)`, `var(--body-color)`, `var(--body-color-highlight)`.
- `SVGFavoritesEmpty`: heart (viewBox `0 0 800 460`), accent `var(--bs-red)` with two 15%-opacity shading paths.
- `.page-svg` [C]: absolute, centered (`translate(-50%, -50%)`), `opacity: 0.25`, no pointer events; width 50% max 300px on search, 80% max 500px on favorites. They retint with the theme because every fill is a variable.

### 5.13 Dropdowns and menus [C, T, O]

- `.dropdown-menu`: no border, radius 0.75rem, min-width 200px, acrylic, text `--body-color`, opens with the `dropdown` keyframes. Items padding 0.5rem 1rem; hover background `hsla(220, 10%, var(--theme-inverted-lightness), 0.15)`, active `#0d6efd` with `#fff`. Header per 3.2.
- Settings theme menu items: `bi-sun` Light, `bi-moon` Dark, `bi-gear-wide` "System's theme" [T, O].

## 6. Pages

All pages: shell (4.2 or 4.3), `main` with a page class, content in `.container`.

### 6.1 Home (`pages/index.vue`) [T, O]

1. (Mobile shell only) search bar, `mb-3`.
2. Toggle: `.hstack.gap-2` of two pill buttons "Categories" and "Types", each `col` (equal width; max 300px total from md). Active `btn-primary`, inactive `btn-dark`, `justify-content: center`.
3. Grid (one column, full container width): category view lists universal, mathematics, physics, chemistry (content order); types view lists equations, formulas, constants, magnitudes, variables, units, prefixes. Each card is `.card.card-category.{slug}`: `background: linear-gradient(5deg, var(--eqk-color), transparent 250%)` (saturated at the bottom-left, lighter toward the top-right), text `hsl(var(--eqk-color-h), 100%, 95%)`, title then 3-line-clamped description, stretched link over the card. Switching runs the `toggle` transition.

### 6.2 Entry page (`pages/_type/_slug.vue`) [T, O]

Card order, top to bottom:

1. Page header in the entry's type color: uppercase type label linking to the type list, title, actions (5.6). Background `linear-gradient(0, var(--eqk-color), transparent 250%)`, shadow per 4.7.
2. Expression card (`.card-mathjax`, full width): equation, constant equality, or "Name - symbol".
3. Term tables in one row, equal columns from lg: Magnitudes, Constants, Variables.
4. Values: "Approximate values" and "Exact values" side by side (constants).
5. Information (collapse card): "Unit of" chips or "Base unit" chip, then the markdown description with inline math (terms highlightable).
6. Units table (variables, magnitudes, units).
7. Conversions table (units).
8. Relations (title only, when present).
9. Code card: "Code" title, input group with the TeX source and a Copy button.
10. References: bulleted links.

Equation cross-highlighting: hovering a term in the display equation, a table row or the description colors every element carrying the same `equreka-{symbol}` class with its kind color; on touch, a tap anywhere else clears it; pointer-leave clears only from 768px [T, O].

### 6.3 Category page (`pages/categories/_slug.vue`) [T, O]

Page header ("CATEGORY" label, category name, category color, no actions), then one list card per type with content in that category, each with "View all" to the type list.

### 6.4 Type list page (`pages/_type/index.vue`) [T, O]

Page header ("TYPE" label, type name, type color), then one list card per category (Universal, Mathematics, Physics, Chemistry) holding that category's entries as symbol-badge links, each with "View all" to the category. Every card's shadow uses the type color.

### 6.5 Prefixes (`pages/prefixes.vue`) [T]

Page header in magenta, then one card with two prefix tables side by side from md.

### 6.6 Calculator index and calculator entry [T, O]

Index: desktop-only `main-header` (`h2` title + lead, hidden below lg), then list cards per type linking to `/calculator/...`. Entry: section 5.9.

### 6.7 Search (`pages/search.vue`) [T, O]

Desktop-only `h2` "Search", full-width search bar (results in flow, not absolute), empty-state illustration behind.

### 6.8 Favorites (`pages/favorites.vue`) [T, O]

Section 5.10. The `main-header` (with the edit toggle) is hidden below lg, so the mobile shell cannot enter edit mode (section 9).

### 6.9 Settings (`pages/settings.vue`) [T, O]

One card: `h2` "Settings" + `small` "v1.0.0" (75%, left margin 0.5rem); `h6` "Language" + `btn-primary px-4 dropdown-toggle` with `bi-translate`; `h6` "Theme" + same button with the current theme icon; `h6` "Favorites" + two stacked `btn-primary px-4` buttons, export (`bi-box-arrow-up`) and import (`bi-box-arrow-in-down`). Mobile shell adds centered footer links and social icons below.

### 6.10 Secondary pages [T]

About, contact, donate, report: a single card with `h2`, `.lead`, body. About has an acrylic `blockquote` (padding 1.5rem 1.25rem, radius 0.5rem, Poppins quote `clamp(1rem, 1.5vw, 1.75rem)`). Donate uses `btn-dark btn-icon` (`bi-github`) and `btn-primary btn-icon` (`bi-paypal`); `.btn-icon .bi { margin-right: 0.75rem }`. Error page: centered column, 100px logo, `h1.fs-4`, `h2.fs-1`, muted lead, `btn-primary btn-sm rounded-pill` home link.

## 7. Icons (bootstrap-icons 1.9.1)

| Icon | Where |
| --- | --- |
| `bi-house` | Header menu and bottom nav: home |
| `bi-search` | Header menu, bottom nav, search submit button |
| `bi-heart` / `bi-heart-fill` | Menus (favorites); page-header favorite toggle (fill = saved, or hover preview) |
| `bi-gear` | Header menu and bottom nav: settings |
| `bi-plus-square` | Page header: open in calculator |
| `bi-info-square` | Page header on calculator: back to entry |
| `bi-cloud-download` | Page header: download JSON (md+) |
| `bi-flag` | Page header: report (md+) |
| `bi-clipboard` | Copy (code card, calculator) |
| `bi-arrow-right` | List card "View all" |
| `bi-chevron-right` | Calculator conversion separator; collapse chevron (`\f285` via CSS); MathJax submenu arrow |
| `bi-chevron-left` | Entry-page collapse chevron (`\f284` via CSS, rotated) |
| `bi-arrow-clockwise` | Calculator reset |
| `bi-plus` | Favorites row: open in calculator |
| `bi-x` | Favorites row: remove; MathJax menu close (`\f62a`) |
| `bi-check2` | Favorites: finish editing; MathJax checkmark (`\f272`) |
| `bi-pencil` | Favorites: start editing |
| `bi-translate` | Settings: language |
| `bi-sun` (`\f5a2`) / `bi-moon` (`\f497`) / `bi-gear-wide` (`\f3e4`) | Settings theme options (aliased as `.bi-light`, `.bi-dark`, `.bi-system`); `.theme-icon` shows the moon in light and the sun in dark |
| `bi-box-arrow-up` / `bi-box-arrow-in-down` | Settings: export / import favorites |
| `bi-github`, `bi-facebook`, `bi-twitter`, `bi-discord` | Footer and app-shell settings social row |
| `bi-paypal` | Donate |

Icons were rendered with the bootstrap-icons web font (woff2 112,440 bytes, woff 150,592 bytes) bundled by webpack, so they were self-hosted [T].

## 8. Port mapping and extension rules

### 8.1 Legacy element to v2 file

| Legacy element | v2 file that carries it |
| --- | --- |
| `_root.scss` theme mixins, palette, categories, types, terms | `packages/tokens/src/index.ts` (values) and `packages/tokens/scripts/build-theme.ts` (emits `:root`, `:root[data-theme='dark']`, `prefers-color-scheme` blocks plus per-slug `.cat-{slug}` classes that set `--eq-accent-*`) |
| Body, selection, headings, `p` scale, links, acrylic recipe, card, badge, table, term-hover, collapse, transitions | `apps/web/src/styles/global.css` (`@layer base` for element styles, `@layer components` for `.eq-card`, `.eq-acrylic`, `.eq-badge-*`, `.eq-table-data`, term hover) |
| `default.vue` + `WebHeader` + `WebFooter` + `AppHeader` + `AppMenu` | `apps/web/src/layouts/base-layout.astro` (both shells in markup, switched by CSS media query, see 8.2) |
| `Logo.vue`, footer mark, loader | New `apps/web/src/components/logo.astro` (inline SVG, seven circles, gradient defs) and `apps/web/public/icons/icon.svg` |
| `SearchBar.vue` + `SearchResults.vue` | `apps/web/src/islands/search-box.tsx` (`variant="header"` and page variant) |
| Home toggle and category/type cards | `apps/web/src/pages-shared/home-page.astro` |
| `PageHeader.vue` + `PageActions.vue` | New `apps/web/src/components/page-header.astro`, used by every entry, list, category and branch page; favorite action stays `apps/web/src/islands/favorite-toggle.tsx` |
| `CardCollapse.vue` | New `apps/web/src/components/collapse-card.astro` built on `<details open>` + `<summary>` (zero-JS) |
| `CardList.vue` | New `apps/web/src/components/list-card.astro` |
| Entry page (`_type/_slug.vue`) | `apps/web/src/pages-shared/{unit,magnitude,constant,equation}-page.astro` |
| `TableConversions` | `apps/web/src/components/unit-conversion-table.astro` |
| `TableConstants`, `TableVariables`, `TableValues`, `TableUnits` | Tables inside the entry pages above, styled with `.eq-table-data` |
| Type list pages | `apps/web/src/pages-shared/{units,magnitudes,constants,equations}-page.astro` |
| `TablePrefixes` + prefixes page | `apps/web/src/pages-shared/prefixes-page.astro` |
| Category page | `apps/web/src/pages-shared/category-page.astro` |
| Calculator index and entry | `apps/web/src/pages-shared/calculator-index-page.astro`, `calculator-page.astro`, `apps/web/src/islands/calculator-island.tsx` |
| Favorites page and table | `apps/web/src/pages-shared/favorites-page.astro`, `apps/web/src/islands/favorites-list.tsx` |
| Settings card | `apps/web/src/pages-shared/settings-page.astro`, `apps/web/src/islands/settings-panel.tsx`, export/import in `apps/web/src/islands/favorites-transfer.tsx` |
| Search page + empty illustration | `apps/web/src/pages-shared/search-page.astro` (illustration as an inline SVG component reading theme variables) |
| Favorites empty illustration | `apps/web/src/islands/favorites-list.tsx` empty branch |
| Category/type badge class maps | `apps/web/src/lib/category-styles.ts` (and a sibling map for collection types) |
| Term-kind colors | `apps/web/src/styles/global.css` `.term-hl` rules (replace the current mathematics/universal/chemistry mapping with magnitude/variable/constant colors from 2.7) |
| KaTeX display (replaces MathJax CHTML) | `.katex-display` rules in `global.css`, wrapped in the display-math card |
| Theme toggle glyphs (currently text characters) | `base-layout.astro`, using `bi-moon` / `bi-sun` SVGs |
| Update toast (inline styles today) | `apps/web/public/pwa-register.js` (move styles to a class in `global.css`) |

### 8.2 Implementation rules

1. **Tokens first.** Add the legacy neutrals (2.2), palette (2.3), category (2.5), collection-type (2.6) and term (2.7) colors to `@equreka/tokens` with both theme values; web consumes the generated `theme.css`, mobile consumes the object. Keep the dark derivation as data, not as a runtime function: the dark values above are already resolved.
2. **Accent via class.** Keep the legacy cascade: a slug class (`cat-physics`, `type-units`) on a container sets `--eq-accent`, `--eq-accent-h`, `--eq-accent-s`, `--eq-accent-l`; components read only `--eq-accent*`. Tailwind needs these as literal class names, so extend the maps in `lib/category-styles.ts` rather than interpolating.
3. **Shell switch by CSS, not user agent.** Render both shells; below 768px show the app header + bottom navigation, from 768px the desktop header + footer. 768px is the threshold the legacy JS already used for touch versus pointer (`window.innerWidth >= 768` in `initTermHover`) and where abbreviations expand. Between 768px and 991px the desktop header wraps the search to a second row exactly as legacy did.
4. **Acrylic with a floor.** Emit the opaque `--acrylic-bg` first and the translucent surface plus `backdrop-filter` inside `@supports`, including the `-webkit-backdrop-filter` prefix (Safari 15 only supports the prefixed form).
5. **Zero-JS parity.** Collapse cards use `<details open>`; the home Categories/Types toggle uses two radio inputs styled as the pill buttons with `input:checked ~ .panel` sibling selectors (no `:has()`); both lists stay in the HTML. No `@starting-style`, `field-sizing`, `text-wrap: balance` or `mask-*`.
6. **Fonts self-hosted.** Ship Poppins as local woff2 files (latin subset) for weights 500, 600 and 700, preloaded and precached (roughly 8 KB each, inside the 6144 KiB budget). Map the legacy 800 declarations to 700 so nothing is synthesized. Body stays on the system stack.
7. **Icons as inline SVG.** Use the bootstrap-icons SVG paths (MIT) for the 25 icons in section 7 through one `icon.astro` component; no icon font, no CDN. If the package is added, it goes through the pnpm catalog with a comment, and `node scripts/quality/catalog-drift.mjs` must stay green.
8. **Logo.** Rebuild the full-color mark as inline SVG: the seven circles filled by a few overlapping radial gradients approximating the mesh (green-yellow top-left, cyan-blue-violet left, orange-red-magenta right), or as a single optimized raster at 2x display size. Target a few KB, not 621 KB.
9. **Motion.** Keep the 0.35s ease vocabulary but transition only `color`, `background-color`, `border-color`, `box-shadow`, `transform`, `opacity`, never `all`. Wrap the toggle, reveal, hue-rotate and rotate animations in `@media (prefers-reduced-motion: no-preference)`.
10. **Strings.** Every label the legacy design adds that v2 lacks ("View all", the "Category" and "Type" header labels, "Types" toggle label, "Approximate values", "Exact values", "Code", "Copy") must be added to `packages/core/src/i18n/en.ts` and `es.ts` with targeted edits.

### 8.3 Extending the design language to v2-only surfaces

| Surface | Rule |
| --- | --- |
| Accent text contrast | Legacy fills were too light for text (section 9). Text set on an accent fill (badges, page headers, home cards) uses the dark-theme variant as the fill in both themes with `#fff` text (4.93:1 for constants up to 9.73:1 for units; the legacy 90%-lightness tint reaches only 4.34:1 on mathematics), except universal, which keeps the `#ee7c2b` fill with `#212529` text (5.55:1; `#fff` on `#bd6628` is 4.12:1). The header and card gradients keep their shape: fill at the bottom, fading toward the top. Accent used as text on cards uses the dark variant in light theme (4.61:1 to 9.08:1, universal 3.85:1 so universal text stays `--body-color-highlight` with an accent underline) and the light variant in dark theme where it passes (universal, equations, formulas, constants, magnitudes), otherwise `hsl(var(--eqk-color-h), 100%, 85%)`. |
| Equation cross-highlighting (kept) | Keep the hover-plus-click-lock behavior of `base-layout.astro`; restyle `.term-hl` to the legacy look: rows get the `0.15` kind tint across rounded cells, symbols and links take the kind color (magnitude orange, variable red, constant blue) under the accent text rule above. Avoid `color-mix()` (not in Safari 15); pass the `-hsl` triplet to an HSLA color with an alpha, as legacy did (`hsla(var(--term-color-hsl, var(--eqk-color-hsl)), 0.15)`). |
| Converter | Reuse the calculator unit-conversion layout: floating number input, `bi-chevron-right` separator (hidden below sm), floating select; result in the display-math card with the units (purple) accent; reset/convert/copy action row. |
| Paths list | Collapse or list cards per level; level badge uses the `badge-type` construction. Path accent: pink (`#e2367e` / `#b23468`), the legacy calculator/menu color not taken by any collection. |
| Path page, context bar, progress | Page header in the path accent; steps as list-card links with a symbol-style numbered badge; completed steps take the inverted symbol-badge state. Progress bar: 6px, radius 3px, track `rgba(102, 119, 153, 0.2)`, fill `var(--eq-accent)`; reserve the rainbow gradient (1.4) for completion. Context bar: acrylic strip, radius 1rem, sticky under the header. |
| Branches | Branch page inherits the parent category class (header gradient, shadows). Branch badges use the category badge construction in the parent category color. |
| Generated prefixed units | Same unit page and units accent; a small outline symbol-badge chip "generated" plus a prefixes-colored (`#b613ec` / `#8724a8`) badge naming the prefix. |
| Draft badge | `btn-warning` palette: `#ffc107` fill, `#000` text, badge construction. |
| Untranslated badge | Outline symbol-badge construction (1px `--body-color-muted` border, inherited text). |
| Entry identifiers (Wikidata, QUDT) | Inside the Information card as chips with the search-count outline construction. |
| Offline reader | Plain cards with collapse-card headers per collection; list-card link rows; empty state reuses the search illustration. |
| Update toast | Acrylic surface, radius 0.75rem, fixed bottom center; above the bottom nav on mobile (`bottom: calc(17.5vw + 2rem)` capped like the menu); action as `btn-primary` pill. |
| Settings | Keep the single card; section labels as `h6` (Poppins 500); controls styled as `btn-primary` dropdown-style buttons or the home pill toggle for the three theme options; version as `small` beside the title. |
| Favorites transfer | Two stacked `btn-primary px-4` buttons with `bi-box-arrow-up` and `bi-box-arrow-in-down`, exactly as legacy. |
| Calculator index | Desktop page title + lead, then list cards per collection. |

## 9. Legacy flaws not to reproduce

| Flaw | Evidence | Port decision |
| --- | --- | --- |
| Muted and chrome text fail WCAG 1.4.3. Light: `--body-color-muted` on `--body-bg` 2.01:1, on cards 2.37:1; `--header-color` 2.01:1; `--footer-color` 2.17:1; `--body-color` on bare background 4.00:1. Dark: muted 2.74:1 on background, 2.28:1 on cards; footer 2.49:1. | C (computed from resolved values) | Light muted text and header/footer icons use `#5c6370` (4.78:1 on background, 5.65:1 on cards); body text on bare background uses `--body-color-highlight`. Dark muted text uses `hsl(220, 10%, 55%)` (5.67:1 on background, 4.73:1 on cards). |
| On-accent text too light. Badge text `hsl(var(--eqk-color-h), 100%, 90%)` on light fills: universal 2.24:1, equations 2.33:1, constants 2.18:1, formulas 2.66:1, magnitudes 3.06:1. Page-header label at 80% lightness: 1.78:1 to 3.49:1. `.link-category` `#8c9ba7` on light cards 2.66:1. | C | Accent text rule in 8.3. Links use `--body-color-highlight` with underline. |
| Layout chosen by user-agent sniffing (`$device.isMobile`): narrow desktop windows get the desktop shell, tablets and iPadOS get the desktop shell, and the choice cannot follow a resize. | T | CSS media query at 768px (8.2 rule 3). |
| Favorites edit toggle and calculator index title live in `.main-header`, which is `display: none` below lg, so mobile users cannot edit favorites. | C, O (`mobile-*-favorites-edit.jpg` shows no toggle) | Every control renders at every width. |
| Focus indicators removed (`outline: 0`) on links, header buttons, menu links, search items, footer links, with no replacement except a few background washes. | C | Visible `:focus-visible` ring (2px `var(--eq-accent)`, offset 2px) on every interactive element. |
| Bootstrap components ignore the dark palette (buttons, focus rings, dropdown active stay at light values); `--bs-white` darkens to `#fad1d1` (pink) because desaturate/darken runs on white; social dark vars are defined and unused. | C, O | Resolve semantic button colors per theme in tokens; do not run the derivation on neutrals. |
| `body { transition: all 0.35s ease }` animates every property on every element change, including layout. | C | Transition explicit properties only, respect reduced motion. |
| Unoptimized logo: 621,118-byte SVG wrapping a 1730 x 1064 base64 PNG for a 72px mark, loaded on every page. | T | Inline SVG gradient mark or small raster (8.2 rule 8). |
| Google Fonts CDN (`fonts.googleapis.com`, `fonts.gstatic.com`) blocks offline use and leaks requests; only weights 500/600 fetched, so 700/800 are synthesized. | T, O | Self-hosted Poppins 500/600/700 (8.2 rule 6). |
| `polyfill.io` script injected in `<head>` (`polyfill.min.js?features=es6`): third-party code execution; the domain changed owners in 2024 and served malicious payloads. | T | No third-party scripts. |
| MathJax could load from jsDelivr when `source` was not `local`; local copy shipped the full MathJax tree. | T | KaTeX, self-hosted, already in v2. |
| Inline TeX in tables printed raw (for example `$J$`, `$\frac{m}{s}$`) when tables rendered after the typeset pass. | O (`desktop-dark-equation.jpg`, `*-calculator.jpg`) | Render math at build time (v2 already does). |
| Global scrollbar forced to a white 5px track (`background: white`) in both themes. | C | Native scrollbars; keep only the thin accent scrollbar on overflow areas, with `scrollbar-width: thin` and `scrollbar-color`. |
| `--alpha-dropdown` referenced in `$dropdown-bg` but never defined (declaration invalid, masked by the acrylic mixin); `:root --bs-gutter-x` override never reaches `.container`; `hsla(var(--eqk-color-hsl, 220, 20%, 40), 0.35)` fallback lacks a `%`. | C | Drop dead declarations; define every variable a rule reads. |
| Copy feedback through `window.alert`. | T | Inline status text (`role="status"`). |
| Category badges show three-letter `<abbr>` codes below md ("PHY") that screen readers and many users cannot parse. | T, O | Full names; truncate visually if needed. |

## 10. Contrast deviations (implemented)

`scripts/quality/contrast-check.mjs` checks every text and accent token against every background it can sit on (`bg`, `bgHigh`, opaque `surface`; inputs against their own fills; labels against their solid fills and button states) in both themes: 4.5:1 for text, 3:1 for the header icon buttons (UI components). It runs in the root `quality` script and after `@equreka/tokens` build, and fails on any violation. Where a legacy value failed, the token moved the minimal HSL lightness (hue and saturation kept) until it passed against all of its backgrounds; `node scripts/quality/contrast-check.mjs --suggest` reproduces each fix. Ratios are the minimum across the three neutral backgrounds.

| Theme | Token | Legacy | Port | Legacy min | Port min |
| --- | --- | --- | --- | --- | --- |
| light | inkBody (`--body-color`) | `#676f7e` | `#606775` | 4.01:1 | 4.50:1 |
| light | inkMuted (`--body-color-muted`) | `#9da3af` | `#606775` | 2.01:1 | 4.50:1 |
| light | footer (`--footer-color`) | `#969ca9` | `#606775` | 2.18:1 | 4.50:1 |
| light | header icons (`--header-color`, UI 3:1) | `#9da3af` | `#7b8393` | 2.01:1 | 3.02:1 |
| light | danger text (`$danger`) | `#dc3545` | `#c62232` | 3.59:1 | 4.53:1 |
| light | orange text (universal, magnitude terms) | `#bd6628` | `#9b5421` | 3.27:1 | 4.52:1 |
| light | yellow text | `#b79c15` | `#77650e` | 2.14:1 | 4.56:1 |
| light | teal text (constants type) | `#1b7e6e` | `#197264` | 3.91:1 | 4.58:1 |
| light | olive text (equations type) | `#627722` | `#5b6e1f` | 3.98:1 | 4.50:1 |
| dark | inkMuted (`--body-color-muted`) | `#505662` | `#7e8595` | 2.26:1 | 4.51:1 |
| dark | footer (`--footer-color`) | `#4b505b` | `#7e8595` | 2.06:1 | 4.51:1 |
| dark | header icons (`--header-color`, UI 3:1) | `#505662` | `#626978` | 2.26:1 | 3.03:1 |
| dark | accent / primary text (`$primary`) | `#0d6efd` | `#2d81fd` | 3.71:1 | 4.51:1 |
| dark | danger text (`$danger`) | `#dc3545` | `#e15562` | 3.69:1 | 4.51:1 |
| dark | blue text (physics, variables, constant terms) | `#0661e0` | `#2c82f9` | 3.02:1 | 4.50:1 |
| dark | red text (mathematics, variable terms) | `#dd3c3c` | `#e25656` | 3.80:1 | 4.53:1 |
| dark | indigo text (chemistry) | `#8c1ff9` | `#ac5dfb` | 2.92:1 | 4.54:1 |
| dark | purple text (units type) | `#5b13ec` | `#986af3` | 2.19:1 | 4.52:1 |
| dark | pink text (paths) | `#e2367e` | `#e54a8b` | 4.02:1 | 4.52:1 |
| dark | magenta text (prefixes type) | `#b613ec` | `#c74af0` | 3.41:1 | 4.50:1 |
| dark | gray text | `#5c6370` | `#7e8695` | 2.76:1 | 4.56:1 |

- Text accents start from the variant rule in 8.3 (dark variant in light theme, light variant in dark theme), so the "Legacy" column for those rows is that starting variant. Variants that already passed (light: blue, indigo, purple, pink, red, green, cyan, magenta; dark: orange, yellow, green, teal, cyan, olive) are unchanged.
- In light theme `--body-color` and `--body-color-muted` converge on `#606775`: no lightness between the 35% highlight and the AA floor on `hsl(220, 10%, 90%)` leaves room for three distinct levels. Hierarchy comes from size, weight and case instead.
- Decorative fills (`fill`: gradients, glows, `hsla()` tints, logo) keep the exact legacy values; text never sits on them. Solid fills under text use the dark variant with `#fff`, except orange and yellow, which keep their light fill with `#212529`. Semantic buttons resolve per theme (legacy dark custom properties, Bootstrap shade/tint states); all pass.
- Fonts ship Poppins 500 and 600 only (the legacy download); the 600 face declares `font-weight: 600 800` so legacy 700/800 declarations render the real 600 face instead of synthesized bold.
- Tailwind's Lightning CSS pass drops `-webkit-backdrop-filter` and rewrites `min-width` queries to range syntax for its Safari 16.4 target. Acrylic therefore degrades to the opaque `--acrylic-bg` surface before Safari 18, and engines without range media queries get the mobile shell; both stay legible, which is the ADR 0002 floor. Background, text color and font family are unlayered so engines without cascade layers keep them.

## 11. Foundation API (implemented)

Tokens: `packages/tokens/src/index.ts` generates `theme.css`. Utilities follow the roles: `bg-bg`, `bg-bg-high`, `bg-surface`, `text-ink` (highlight), `text-ink-body`, `text-ink-muted`, `text-accent`, `bg-accent-solid text-accent-on-solid`, `text-physics` and the other categories, `shadow-page-header` / `shadow-accent-card` / `shadow-home-card(-hover)`, `rounded-card` / `rounded-home-card` / `rounded-pill`, `text-h1`...`text-h6`, `text-lead`, `text-card-title`, `text-page-title`, `text-display-math`, `font-display`, `font-math`, `tracking-label`. Breakpoints are the legacy ones (`sm` 576, `md` 768, `lg` 992, `xl` 1200, `2xl` 1400).

Accent: put `cat-{category}`, `type-{collection}` (`equations`, `formulas`, `constants`, `magnitudes`, `variables`, `units`, `prefixes`, `paths`) or `sw-{swatch}` on a container; it sets `--eq-accent` (AA text), `--eq-accent-fill` (legacy decorative), `--eq-accent-solid` / `--eq-accent-on-solid` (fill under text and its label), `--eq-accent-h|s|l` and `--eq-accent-hsl` (for `hsla(var(--eq-accent-hsl), a)`). Term kinds resolve from `data-term` / `eq-{kind}` to `--eq-term` and `--eq-term-hsl`.

| Class | Use |
| --- | --- |
| `eq-container`, `eq-stack` | Legacy container widths and gutter; vertical card stack with the fluid card gap |
| `eq-acrylic`, `eq-card`, `eq-card-body`, `eq-card-title`, `eq-card-accent` | Acrylic surface, card (no shadow in dark), padding, title, accent-tinted shadow |
| `eq-accent-panel`, `eq-page-header`, `eq-page-header-label`, `eq-page-header-title` | Solid accent band with top highlight (page header, home cards); header spacing and type |
| `eq-label`, `eq-lead`, `eq-text-body`, `eq-display`, `eq-link`, `eq-accent-text` | Uppercase Poppins label, lead, fluid body text, Poppins, underlined link, accent text |
| `eq-badge` + `eq-badge-accent` / `-warning` / `-outline`; `eq-badge-symbol` (`eq-is-done` inverts) | Category/type, draft, identifier/count, symbol badges |
| `eq-list`, `eq-list-link` | List-card links with tint hover and symbol inversion |
| `details.eq-collapse` > `summary` (`eq-collapse-title`, `eq-collapse-chevron`), `eq-collapse-content` | Zero-JS collapse card; chevron is an `Icon name="chevron-right"` rotated when open |
| `eq-table-wrap`, `eq-table-data` | Thin accent scrollbar; legacy data table with pill row hover and term tint |
| `eq-btn` + `eq-btn-primary|dark|success|danger|warning|pink|tint|text|icon`, `eq-btn-sm|lg|pill|round` | Buttons resolved per theme |
| `eq-input`, `eq-select`, `eq-field-label` | Form controls with accent focus ring |
| `eq-alert` (+ `eq-alert-danger`, `eq-alert-title`) | Acrylic alert, red glow variant |
| `eq-display-math`, `eq-scrollbar-thin`, `eq-progress` / `eq-progress-fill`, `eq-rainbow`, `progress.path-progress` | Display-math card body, thin scrollbar, 6px progress, completion gradient |
| `eq-search-*` | Search pill, floating/in-flow results, groups, items (used by `search-box.tsx`) |
| `eq-context-bar`, `eq-toast` | Acrylic context strip; update toast (above the bottom nav on mobile) |

Layout slots in `base-layout.astro`: default (inside `eq-container`), `hero` (full-bleed, before the container: page headers), `context` (sticky wrapper above the content). Icons: `import Icon from '../components/icon.astro'` with `name`; in islands `import { Icon } from '../components/react-icon'` with `icon={searchIcon}` from `lib/icons.ts`. Decorative unless `label` is passed. Pages own `pages-content.css` and `pages-interactive.css`; rules there in plain `@layer components` override the foundation (which sits in `components.foundation`) without specificity games.
