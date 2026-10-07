# @equreka/design-parity

Measures how close `apps/web` is to the original Equreka app (Nuxt 2, 2021-2022). The goal is measured 1:1 visual parity. When the original and an earlier choice in the port disagree, the original wins. `docs/design/legacy-design-spec.md` describes the original; this tool checks the port against the running original.

## Run

```sh
pnpm --filter web build                 # production output, no dev toolbar in screenshots
LEGACY_DIR=/path/to/scratch/legacy-copy pnpm design:parity
```

| App | Default URL | Served by |
| --- | --- | --- |
| original | `http://127.0.0.1:3100` | `nuxt dev` inside `LEGACY_DIR` with `NODE_OPTIONS=--openssl-legacy-provider` (an `ssr: false` SPA). If a server already answers on the port, the harness reuses it, since booting takes minutes |
| current | `http://127.0.0.1:43210` | Always started by the run: `apps/web/dist` is copied to `$PARITY_OUT/dist-snapshot` and served with `apps/web/scripts/serve-dist.mjs <port> <dir>`. The port must be free |

The snapshot means a rebuild of `apps/web/dist` during a run cannot mix two builds into one report. The report names the snapshot by a build id: a hash of `index.html` and the hashed `_astro` asset names. The harness stops only the servers it started.

### Preparing the original

The original repository is read-only. Nuxt writes `.nuxt/` into its working directory, so the harness refuses to start the server inside it. Use a scratch copy:

```sh
cp -r ../Equreka /tmp/legacy-copy && cd /tmp/legacy-copy && npm ci --legacy-peer-deps
```

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `LEGACY_DIR` | unset | Installed scratch copy of the original. Needed only when nothing is answering on `LEGACY_PORT` |
| `LEGACY_PORT` | `3100` | Port of the original |
| `CURRENT_PORT` | `43210` | Port of the built web app |
| `PARITY_OUT` | `<os tmp>/equreka-design-parity` | Output directory |
| `PARITY_CHROMIUM` | first of `chromium-1243`, `chromium-1208` in the `ms-playwright` cache (`PLAYWRIGHT_BROWSERS_PATH` or `%LOCALAPPDATA%\ms-playwright`) | Browser executable. `playwright-core` never downloads one |

### Flags

`--only=home-categories,settings` (view ids), `--area=chrome|content|interactive`, `--shell=desktop|mobile`, `--theme=light|dark`, `--no-probes`, `--skip-capture` (re-diff the PNGs already on disk; probes, unless `--no-probes`, run against the previous run's dist snapshot so the build matches the captures), `--runs=N` (the determinism check: capture and diff N times, report every metric per run, and compare every PNG byte for byte with run 1; see [Determinism](#determinism)). Any filter marks the run `partial`, and a partial run never reports `pass: true`.

## What is compared

- **Scenarios** (`scenarios.json`): 12 views x {light, dark} x {desktop 1280x800, mobile 390x844} = 48 captures per app. The original picks its shell by user agent, so the mobile shell sends an Android user agent with touch enabled. Each view lists, for each app, its route, setup steps (`click`, `hover`, `type`, `waitFor`, optionally limited to some `shells`) and masks. A step that times out (10 s) is an error. An `optional` step of the original that finds no element is a note: that is how a scenario records a control the original lacks. The port is the side under test, so a current-side step that does not complete, `optional` or not, makes the scenario an error in `report.json` (status `error`, with the step and the reason) and a probe page a probe error: a state the harness never reached cannot pass (`src/failures.ts`). Every mask is a `{ selector, kind, reason }` entry. `kind` is `data` (content that legitimately differs: conversion rows, the version string), `math-engine` (TeX typeset by MathJax in the original and KaTeX in the port) or `new-feature` (a port element with no counterpart in the original, such as the Relations card of branch badges). Copy and layout are never masked. A mask selector that matches no element is an error, so a stale selector cannot silently stop masking.
- **Metrics**, each a pixelmatch percentage (threshold 0.1, anti-aliasing ignored; images of different sizes are padded with two different colors, so missing area always counts as different):
  - `chromeDiffPct`: the chrome regions (header, footer, bottom nav, selectors per app and shell), shot one by one. A region that exists in one app only counts as entirely different.
  - `aboveFoldPct`: the content band from the top of `main` down `aboveFold.heightPx` (900) CSS pixels at full viewport width, with the chrome regions made invisible. The browser does not paint these masks. The harness records the box of every masked element in both apps and paints the union of both sets the same gray in both crops. A mask that is wider in one app therefore does not count as a difference, and masked pixels leave the denominator (`aboveFoldMaskedPct` reports their share).
  - `fullDiffPct`: the whole page, with the masks painted by the browser.
- **Gates**: views with `contentIdentical: true` (favorites-empty, favorites-edit, settings) are gated by the full page. The other views are gated by chrome plus `aboveFold`, unless their `aboveFold` entry sets `gate: false`, which needs a reason. The content of such a view is checked only by the probes, and the verdict line names it. Numbers that do not gate are still reported, for information.
- **Probes** (`probes.json`): computed styles of matching elements in the two apps (header, page title, container, card, card title, badges, tables, term highlight, calculator table symbols, buttons, inputs, select, dropdown, footer, hover colors, body). A probe targets the same entry in both apps: each app ranks its own search results, so the category badge probes select the result by slug (`/magnitudes/energy` for the query `ene`, `/constants/planck-constant` for `planck`) instead of taking the first row. Probes run without the freeze CSS and with reduced motion off, so transitions report their authored values. Values must match exactly. The exception is the properties listed in `probeTolerantProperties`, which match within `probeLengthTolerancePx` (1px) when both sides are single px lengths. A missing element is always a mismatch.
- **Waivers** (`waivers.json`), each with a reason, all listed in `report.md`:
  - `hide`: v2 features that never existed in the original (draft badge, identifiers row, path context bar, per-term unit pickers, generated-unit line, result-format setting), set to `display: none` in the named app before capture, so the rest of the page is measured as if the feature were absent.
  - `legacy-flaw`: a region of one scenario where the original shows a flaw that `docs/design/legacy-design-spec.md` lists as not to be reproduced. It names the region in both apps and the spec section (`spec`); both regions are masked like a mask, and the rest of the scenario stays gated. The term-table cards of `equation` and `calculator` carry one: the original prints unit symbols as raw TeX (`$J# @equreka/design-parity

Measures how close `apps/web` is to the original Equreka app (Nuxt 2, 2021-2022). The goal is measured 1:1 visual parity. When the original and an earlier choice in the port disagree, the original wins. `docs/design/legacy-design-spec.md` describes the original; this tool checks the port against the running original.

## Run

```sh
pnpm --filter web build                 # production output, no dev toolbar in screenshots
LEGACY_DIR=/path/to/scratch/legacy-copy pnpm design:parity
```

| App | Default URL | Served by |
| --- | --- | --- |
| original | `http://127.0.0.1:3100` | `nuxt dev` inside `LEGACY_DIR` with `NODE_OPTIONS=--openssl-legacy-provider` (an `ssr: false` SPA). If a server already answers on the port, the harness reuses it, since booting takes minutes |
| current | `http://127.0.0.1:43210` | Always started by the run: `apps/web/dist` is copied to `$PARITY_OUT/dist-snapshot` and served with `apps/web/scripts/serve-dist.mjs <port> <dir>`. The port must be free |

The snapshot means a rebuild of `apps/web/dist` during a run cannot mix two builds into one report. The report names the snapshot by a build id: a hash of `index.html` and the hashed `_astro` asset names. The harness stops only the servers it started.

### Preparing the original

The original repository is read-only. Nuxt writes `.nuxt/` into its working directory, so the harness refuses to start the server inside it. Use a scratch copy:

```sh
cp -r ../Equreka /tmp/legacy-copy && cd /tmp/legacy-copy && npm ci --legacy-peer-deps
```

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `LEGACY_DIR` | unset | Installed scratch copy of the original. Needed only when nothing is answering on `LEGACY_PORT` |
| `LEGACY_PORT` | `3100` | Port of the original |
| `CURRENT_PORT` | `43210` | Port of the built web app |
| `PARITY_OUT` | `<os tmp>/equreka-design-parity` | Output directory |
| `PARITY_CHROMIUM` | first of `chromium-1243`, `chromium-1208` in the `ms-playwright` cache (`PLAYWRIGHT_BROWSERS_PATH` or `%LOCALAPPDATA%\ms-playwright`) | Browser executable. `playwright-core` never downloads one |

### Flags

`--only=home-categories,settings` (view ids), `--area=chrome|content|interactive`, `--shell=desktop|mobile`, `--theme=light|dark`, `--no-probes`, `--skip-capture` (re-diff the PNGs already on disk; probes, unless `--no-probes`, run against the previous run's dist snapshot so the build matches the captures), `--runs=N` (the determinism check: capture and diff N times, report every metric per run, and compare every PNG byte for byte with run 1; see [Determinism](#determinism)). Any filter marks the run `partial`, and a partial run never reports `pass: true`.

## What is compared

- **Scenarios** (`scenarios.json`): 12 views x {light, dark} x {desktop 1280x800, mobile 390x844} = 48 captures per app. The original picks its shell by user agent, so the mobile shell sends an Android user agent with touch enabled. Each view lists, for each app, its route, setup steps (`click`, `hover`, `type`, `waitFor`, optionally limited to some `shells`) and masks. A step that times out (10 s) is an error. An `optional` step of the original that finds no element is a note: that is how a scenario records a control the original lacks. The port is the side under test, so a current-side step that does not complete, `optional` or not, makes the scenario an error in `report.json` (status `error`, with the step and the reason) and a probe page a probe error: a state the harness never reached cannot pass (`src/failures.ts`). Every mask is a `{ selector, kind, reason }` entry. `kind` is `data` (content that legitimately differs: conversion rows, the version string), `math-engine` (TeX typeset by MathJax in the original and KaTeX in the port) or `new-feature` (a port element with no counterpart in the original, such as the Relations card of branch badges). Copy and layout are never masked. A mask selector that matches no element is an error, so a stale selector cannot silently stop masking.
- **Metrics**, each a pixelmatch percentage (threshold 0.1, anti-aliasing ignored; images of different sizes are padded with two different colors, so missing area always counts as different):
  - `chromeDiffPct`: the chrome regions (header, footer, bottom nav, selectors per app and shell), shot one by one. A region that exists in one app only counts as entirely different.
  - `aboveFoldPct`: the content band from the top of `main` down `aboveFold.heightPx` (900) CSS pixels at full viewport width, with the chrome regions made invisible. The browser does not paint these masks. The harness records the box of every masked element in both apps and paints the union of both sets the same gray in both crops. A mask that is wider in one app therefore does not count as a difference, and masked pixels leave the denominator (`aboveFoldMaskedPct` reports their share).
  - `fullDiffPct`: the whole page, with the masks painted by the browser.
- **Gates**: views with `contentIdentical: true` (favorites-empty, favorites-edit, settings) are gated by the full page. The other views are gated by chrome plus `aboveFold`, unless their `aboveFold` entry sets `gate: false`, which needs a reason. The content of such a view is checked only by the probes, and the verdict line names it. Numbers that do not gate are still reported, for information.
- **Probes** (`probes.json`): computed styles of matching elements in the two apps (header, page title, container, card, card title, badges, tables, buttons, inputs, select, dropdown, footer, hover colors, body). Probes run without the freeze CSS and with reduced motion off, so transitions report their authored values. Values must match exactly. The exception is the properties listed in `probeTolerantProperties`, which match within `probeLengthTolerancePx` (1px) when both sides are single px lengths. A missing element is always a mismatch.
, section 9), which reflows every column. Their colors stay gated by probes.
  - `probe`: accepts one probe or property.
- **Summary**: the CLI line and `report.md` state how many waivers (per kind) and masks (per kind) the run applied, so a pass never hides what was excluded to reach it.
- **Pass** means every scenario passes every gate, every metric is identical across `--runs`, probes ran without errors, and no probe mismatch is left unwaived.

## Thresholds and their evidence

| Gate | Threshold | Why this value |
| --- | --- | --- |
| chrome, full page | `scenarioMaxDiffPct` 1.5% | Unchanged. Run-to-run noise is 0.000 (see Determinism), so this is a tolerance for real chrome differences, not for noise. It is the loose gate of the three and covers only the shell and the three pages whose content is the same in both apps |
| aboveFold | `aboveFoldMaxDiffPct` 0.1% | The run-to-run noise floor is 0.000 in every scenario: the percentage is identical to three decimals across 10 runs and across invocations (see Determinism). Content that is the same in both apps diffs at 0.000 to 0.004 between them (favorites-empty above the fold, dark theme, both shells), so cross-app rendering adds no floor either: both apps run in the same Chromium with the same Poppins files. A single 1px line across the band is 0.111% of it in both shells (1,280 of 1,152,000 pixels; 390 of 351,000), so the gate catches a one-pixel shift of a full-width edge or a wrong full-width border color. Anything above 0.1% is a visible difference |

Latest full run (dist snapshot `71aba3de1682`, 2026-10-06): 48/48 scenarios pass every gate, chrome 36/36, aboveFold 24/24, full page 12/12, 0 errored, 0 unwaived probe mismatches across 478 probed values, deterministic. It applied 7 waivers (hide 5, probe 0, legacy-flaw 2) and 12 masks (data 4, math-engine 6, new-feature 2). The gated metric per view, as the range over light and dark (aboveFold, or full page where the full page gates; ungated numbers in italics):

| View | Gated by | Desktop % | Mobile % | Status | Residual difference |
| --- | --- | ---: | ---: | --- | --- |
| home-categories | chrome + aboveFold | 0.000 | 0.007 to 0.008 | pass | None measurable |
| home-types | chrome + aboveFold | 0.000 | 0.006 to 0.007 | pass | None measurable |
| unit | chrome + aboveFold | 0.026 to 0.034 | 0.010 to 0.011 | pass | Text after inline math shifts by a sub-pixel (MathJax and KaTeX box widths) |
| equation | chrome + aboveFold | 0.051 to 0.068 | 0.011 | pass | Text after inline math in the Information text shifts by a sub-pixel (MathJax and KaTeX box widths) |
| constant | chrome + aboveFold | 0.056 to 0.065 | 0.000 to 0.001 | pass | Text after inline math in the Information text shifts by a sub-pixel. Chrome is 0.916 to 0.921, the highest of any view: the footer region diffs 2.066% because the footer's top lands on a different sub-pixel offset in each app (the footer link labels differ by design, ADR 0008) |
| category | chrome | *1.664 to 1.810* | *0.436 to 0.502* | pass | Not gated: chip lists are data |
| units-list | chrome | *4.701 to 6.116* | *4.483 to 5.033* | pass | Not gated: chip lists are data |
| search-open | chrome | *24.040 to 24.054* | *19.191 to 19.400* | pass | Not gated: the result list is data; the badges of the same result entry match exactly (probes) |
| calculator | chrome + aboveFold | 0.000 | 0.000 | pass | None measurable. The term table is a `legacy-flaw` region (raw TeX in the original); its colors are gated by probes |
| favorites-empty | full | 0.053 to 0.054 | 0.000 | pass | |
| favorites-edit | full | 0.053 to 0.054 | 0.000 | pass | |
| settings | full | 0.344 to 0.345 | 0.675 to 0.678 | pass | |

The run before (dist snapshot `0f4598efe007`) failed 8 scenarios. Equation measured 0.660 to 0.678 desktop and 1.515 to 1.564 mobile: the migration had folded the description's hard line break before "Because the speed of light..." into a space, where the original renders its `\n` through `.card-information p { white-space: pre-line }`. Constant measured 0.185 to 0.198 desktop and 0.330 to 0.331 mobile: the port computed a 6-significant-figure approximation (`2.99792×10^8`) instead of the authored `3×10^8`. Both were content and schema fixes, with no waiver or mask added: the break is a literal `|-` block scalar in the YAML, and constants carry authored `approximations` (`docs/guides/authoring-content.md`).

The first `aboveFoldPct` baseline (dist snapshot `1fcb63d324ca`) ranged from 0.519% (calculator, desktop) to 20.724% (home-types, desktop). Until this run the four calculator scenarios never captured the result state: their current-side `waitFor` named a class the port no longer renders, was marked `optional`, and was skipped as a note. Such a skip is now an error.

## Determinism

`--runs=10` over all 48 scenarios on one dist snapshot gives the same chrome, aboveFold and full-page percentage to three decimals in every run, and a second invocation on the same snapshot gives the same numbers again. The noise floor of every metric is therefore 0.000 in every scenario. At the byte level, every PNG (full page, regions, above-the-fold band, both apps) is identical to the run 1 PNG with one exception: the original's calculator watermark in desktop light (outlined MathJax glyphs at opacity 0.1) rasterizes 1 level off in 3 to 22 pixels in 3 to 8 of 9 runs. Pixelmatch at threshold 0.1 cannot register a 1-level change, so its metrics stay constant (0.519 aboveFold, 0.857 chrome). Committing finished animations to inline styles and a single raster thread were both tried and did not remove it, and masking it would hide a real design element, so it stays reported. The report flags `deterministic` (metrics constant) and `byteIdenticalCaptures` separately. A capture that differs from run 1 is copied to `$PARITY_OUT/runs/<n>/`, next to the run 1 copy in `runs/first/`, and `report.md` lists it with the changed pixel count and bounding box. Instability is located instead of inferred from a drifting percentage. These causes were measured and removed:

- **Lazy hydration during region shots.** The port hydrates islands when they scroll into view. The full page was shot before the converter island on `/units/metre` hydrated, and the footer shot then scrolled it into view. The page grew mid-capture and the footer PNG landed on the half-hydrated converter in 1 of 10 runs (890 pixels, the 0.622% versus 0.547% drift). Every capture now scrolls the whole page once, one viewport at a time, before the setup steps, and waits for the page to settle.
- **Scroll position under fixed elements.** A full-page screenshot paints fixed elements at the current scroll offset. The page is scrolled to the top before the full-page and above-the-fold shots.
- **Data under the translucent bottom nav.** The nav PNG carried whatever content was scrolled beneath it, which differs between the apps and between loads (the 1.685% versus 1.258% drift of units-list--mobile-dark). Chrome regions are now shot with `main` at opacity 0, so they measure the chrome over the page background in both apps. The content masks are not passed to region shots: Playwright paints a mask box even over an invisible element, and on the mobile shell the box landed on the bottom nav.
- **Response order in the original.** The original builds `/units` from four parallel `$content` queries and keys its result object in the order the responses land, so Physics and Chemistry swapped places in 1 of 10 runs. The harness answers the original's content API (`/api/`) strictly in request order, which yields the authored category order every time.
- Reduced motion, plus injected CSS that collapses every animation and transition to its end state. Durations go to 0 rather than `none`, so `forwards` reveals still finish.
- `backdrop-filter` is turned off in captures. Chromium's software compositor rasterizes blur with noise that changes between identical loads (about 1,000 pixels per acrylic surface, 1 to 18 levels apart). Probes still compare the `backdrop-filter` value exactly on cards, search inputs, dropdowns and the bottom nav. The visible cost: translucent overlays (dropdowns, the bottom nav) show the content beneath them unblurred in the PNGs. Both apps get the same treatment, so the comparison stays fair, but a sheet is not a perfect picture of the live page.
- **First-capture effects.** The first request to a cold dev server or browser profile renders differently from later ones (webpack lazy chunks, the content API's first query, font and image caches). A visit per route covered page loads but not what the setup steps load (the search index, the calculator's result path), nor the full-page screenshot at each page size. Every run now starts with one unmeasured capture of every variant into `$PARITY_OUT/warm-up/`, so the first measured capture takes no code path for the first time. It costs one extra pass.
- **Fallback-font captures.** In 1 of 5 runs, `/units/metre` in the mobile dark shell rendered the port's Poppins headings in the fallback font (6,301 pixels, aboveFold 3.66% against 3.063%). `document.fonts.ready` only covers loads already started, so the settle step now loads every declared font face explicitly. A face that still fails (2 of 528 port captures in one 10-run invocation, Poppins 600 in both cases, with other runs loading the machine) is an environment fault, not a property of the page: the capture is retried in a fresh context up to 3 times, the retry is a note in the report, and a third failure is reported as an error.
- One frozen dist snapshot per run. Captures whose page answers HTTP 4xx/5xx are errors, not 100% diffs.
- Fixed viewport and scale factor, UTC, `en-US`, the original's language cookie set to `en`, service workers blocked, caret hidden.
- The theme is seeded through localStorage: the original uses `nuxt-color-mode`, the port uses `equreka.v1.settings`. The port's settings also carry `numberFormat: 'scientific'`, because the original printed every calculator result in full-precision scientific notation. Favorites fixtures are seeded in each app's own format.
- No external requests. The original's Google Fonts requests are answered with the same Poppins files from `@fontsource/poppins`. Every other request off localhost (for example polyfill.io) is aborted and listed in the report.
- The harness waits for fonts, decoded images, MathJax startup and 500 ms without DOM mutations after load, after the scroll sweep and after every step.

## Output

`$PARITY_OUT/legacy/*.png` and `$PARITY_OUT/current/*.png` hold the full page, the region shots, the `--above-fold` band and a manifest per capture. `$PARITY_OUT/sheets/*.png` puts `legacy | current | diff` side by side: the full page cut into viewport-tall tiles, a `--chrome` sheet of the regions and an `--above-fold` sheet with the masks painted. `$PARITY_OUT/runs/` exists with `--runs`. `$PARITY_OUT/report.json` and `report.md` list, per scenario, the gates and every metric. The verdict line counts the views whose content is gated by pixels (full page or above the fold) and names the ones gated only by probes.

## Why baseline images are not committed

The screenshots come from the live original rendered by a local Chromium with the machine's system fonts (the original's body text uses the system font stack). They are reproducible on one machine but not across machines, and they would add megabytes of binaries to every change. The baseline is the running original, not a snapshot. `docs/design/reference/` keeps the small JPEG set the spec was written against.
