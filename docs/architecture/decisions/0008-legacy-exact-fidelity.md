# 0008 — Legacy exact fidelity over WCAG AA for the legacy pairs

Date: 2026-10-05 · Status: accepted

## Context

The first pass of the legacy visual port (commits 8954390 and f065405) reproduced the original Equreka design language but changed 21 token colors so that every text pair met WCAG 2.2 AA (SC 1.4.3 text 4.5:1, SC 1.4.11 UI 3:1). It also moved text set on accent fills to darker fills with white labels, added a second navigation row, a theme toggle and a locale link to the header, and replaced the footer's content.

On 2026-10-05 the user set the success criterion of the port: measured 1:1 visual parity with the original Nuxt app, checked by `tools/design-parity` against the running original. When the original disagrees with an earlier choice of the port, the original wins. The first parity round failed all 48 scenarios (mean diff 41.6%). The header, the footer and every token adjusted for contrast showed up as probe mismatches.

## Decision

1. **Exact legacy colors.** Every color in `@equreka/tokens` takes the value the compiled 2022 CSS resolved, in both themes (`docs/design/legacy-design-spec.md` sections 2.2 to 2.8):
   - The neutrals go back to their legacy values: `--body-color`, `--body-color-muted`, `--header-color`, `--footer-color`, and the separator at 8% in dark.
   - Swatch text, solid and fill all take the palette color for their theme, as legacy used `--eqk-color` for all three. Badge labels are `hsl(h, 100%, 90%)`, page-header titles `hsl(h, 100%, 95%)` and labels `hsl(h, s, 80%)`.
   - Term colors are the light hex in both themes.
   - Bootstrap's literal semantic colors (`#0d6efd` primary, `#dc3545` danger, the button states) apply in both themes, because Bootstrap compiled them as literals.
   - Each swatch carries its authored `h, s%, l%` triplet (`hsl` field), so `hsla()` washes and `hsl(h, …)` tints resolve to the same RGB values the original produced. Deriving the triplet from the rounded hex was off by one channel step.
2. **Contrast gate becomes a ratchet.** `scripts/quality/contrast-check.mjs` still checks every foreground token against every background it can sit on, in both themes. `scripts/quality/contrast-baseline.json` lists every pair that fails AA with these exact colors, with its legacy ratio: 147 pairs (light and dark). The gate fails when:
   - a pair below threshold is not in the baseline (every new pair must meet AA);
   - a baselined pair's ratio drops below its recorded value;
   - a baselined pair now passes or no longer exists, so the baseline only shrinks.
3. **Shell identical to the original.**
   - The header holds the logo, the search bar and the four icon buttons (home, search, favorites, settings), nothing else. Theme and language are reachable only through Settings, as in the original.
   - The mobile bottom navigation holds exactly those four items.
   - The footer keeps the original's three columns: "Equreka", the four social icons, and three text links. The original's links went to About, Contact and Donate, pages v2 does not have, so the three slots carry the v2-only destinations (Paths, Calculator, Converter). Those destinations, and the branches, are otherwise reachable only through home cards, never through new header elements.
   - Below 768px there is no footer, as in the original app shell.
   - The shell switch stays a CSS media query at 768px (ADR 0002 floor, no user-agent sniffing).
4. **Original typography.**
   - The body uses the exact legacy font stack.
   - The display stack is the legacy Poppins stack, and the metric-override fallback face was removed.
   - Poppins ships only the 500 and 600 faces the original downloaded, so legacy 700/800 declarations render as synthesized bold of 600, as they did in 2022.
5. **Logo.** The header uses the original file's structure (mesh raster clipped by the seven-circle path) with the raster re-encoded at 432 px as WebP. The result is 5 KB and renders pixel-identical at 62 and 72 px, where the original was 621 KB.

## Consequences

- Muted, header, footer and accent text in the shells and pages sit below AA again, at exactly the ratios the original shipped (for example light `--body-color-muted` on the background, 2.01:1). This is a deliberate, recorded deviation from SC 1.4.3 and SC 1.4.11 at the user's request, not an oversight. Section 9 of the spec still lists the other legacy flaws v2 does not reproduce (user-agent shell switch, removed focus rings, polyfill.io, the Google Fonts CDN), and those stay fixed: focus rings, self-hosted fonts and the offline guarantees are unaffected.
- **How to fix a deviation later:** change the token in `packages/tokens/src/index.ts`, run `pnpm --filter @equreka/tokens build`, then delete the pair's entry from `scripts/quality/contrast-baseline.json` (the gate reports the entry as stale once it passes). Re-run `pnpm design:parity` to see the visual cost; a fix that moves a legacy color also needs a waiver or a user decision, because it breaks 1:1 parity.
- The `-webkit-backdrop-filter` prefix now survives the build. Vite's Lightning CSS minifier targets come from `build.cssTarget`, which `apps/web/astro.config.ts` sets to include Safari 15, so acrylic blur works on Safari 15 to 17 and not only on 18.
