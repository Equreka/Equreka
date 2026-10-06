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

`--only=home-categories,settings` (view ids), `--area=chrome|content|interactive`, `--shell=desktop|mobile`, `--theme=light|dark`, `--no-probes`, `--skip-capture` (re-diff the PNGs already on disk; probes, unless `--no-probes`, run against the previous run's dist snapshot so the build matches the captures), `--runs=N` (repeat capture and diff N times and report each `diffPct`. This is the determinism check). Any filter marks the run `partial`, and a partial run never reports `pass: true`.

## What is compared

- **Scenarios** (`scenarios.json`): 12 views x {light, dark} x {desktop 1280x800, mobile 390x844} = 48 captures per app. The original picks its shell by user agent, so the mobile shell sends an Android user agent with touch enabled. Each view lists, for each app, its route, setup steps (`click`, `hover`, `type`, `waitFor`; `optional` steps that find no element are recorded as notes) and masks (selectors painted gray before diffing). Each view also has an area tag and `contentIdentical`. When `true`, the full page is diffed. When `false`, only the chrome regions are diffed (header, footer, bottom nav, with selectors per app and shell). A region that exists in one app only counts as entirely different. The full-page number is still reported for information.
- **Diff**: pixelmatch, threshold 0.1, anti-aliasing ignored. Images of different sizes are padded with two different colors, so missing area always counts as different. A scenario passes at `scenarioMaxDiffPct` (1.5%) or less (`thresholds.json`).
- **Probes** (`probes.json`): computed styles of matching elements in the two apps (header, page title, container, card, card title, badges, tables, buttons, inputs, select, dropdown, footer, hover colors, body). Probes run without the freeze CSS and with reduced motion off, so transitions report their authored values. Values must match exactly. The exception is the properties listed in `probeTolerantProperties`, which match within `probeLengthTolerancePx` (1px) when both sides are single px lengths. A missing element is always a mismatch.
- **Waivers** (`waivers.json`): only for v2 features that never existed in the original: draft badge, identifiers row, path context bar, per-term unit pickers, generated-unit line. `hide` waivers set the element to `display: none` in the named app before capture, so the rest of the page is measured as if the feature were absent. `probe` waivers accept one probe or property. Every waiver needs a reason, and the report lists them.
- **Pass** means every scenario passes, probes ran without errors, and no probe mismatch is left unwaived.

## Determinism

- Reduced motion, plus injected CSS that collapses every animation and transition to its end state. Durations go to 0 rather than `none`, so `forwards` reveals still finish.
- `backdrop-filter` is turned off in captures. Chromium's software compositor rasterizes blur with noise that changes between identical loads (about 1,000 pixels per acrylic surface, 1 to 18 levels apart), which made diffPct drift between runs. Probes still compare the `backdrop-filter` value exactly on cards, search inputs, dropdowns and the bottom nav. The visible cost: translucent overlays (dropdowns, the bottom nav) show the content beneath them unblurred in the PNGs. Both apps get the same treatment, so the comparison stays fair, but a sheet is not a perfect picture of the live page.
- One untimed warm-up visit per route before the first measured capture. The first request to a cold dev server or browser profile renders differently from later ones.
- One frozen dist snapshot per run. Captures whose page answers HTTP 4xx/5xx are errors, not 100% diffs.
- Fixed viewport and scale factor, UTC, `en-US`, the original's language cookie set to `en`, service workers blocked.
- The theme is seeded through localStorage: the original uses `nuxt-color-mode`, the port uses `equreka.v1.settings`. Favorites fixtures are seeded in each app's own format.
- No external requests. The original's Google Fonts requests are answered with the same Poppins files from `@fontsource/poppins`. Every other request off localhost (for example polyfill.io) is aborted and listed in the report.
- The harness waits for fonts, decoded images, MathJax startup and 500 ms without DOM mutations after load and after every step.

## Output

`$PARITY_OUT/legacy/*.png`, `$PARITY_OUT/current/*.png` (full page, per-region shots, a manifest per capture), `$PARITY_OUT/sheets/*.png` (`legacy | current | diff` side by side, cut into viewport-tall tiles, plus a `--chrome` sheet of the regions), `$PARITY_OUT/report.json` and `report.md`.

## Why baseline images are not committed

The screenshots come from the live original rendered by a local Chromium with the machine's system fonts (the original's body text uses the system font stack). They are reproducible on one machine but not across machines, and they would add megabytes of binaries to every change. The baseline is the running original, not a snapshot. `docs/design/reference/` keeps the small JPEG set the spec was written against.
