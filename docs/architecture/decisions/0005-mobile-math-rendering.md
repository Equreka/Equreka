# 0005 — Mobile math rendering: MathJax 4.1.3 atlas + bodies

Date: 2026-09-09 · Status: accepted

## Context

ADR 0002 fixed the split: KaTeX SSR on the web, "MathJax 4.1 on mobile — build-time tex2svg with a shared glyph atlas + runtime liteAdaptor for calculator output. No WebView." That sentence had not been proven against Hermes, the MathJax 4 API, or the real corpus. Before `apps/mobile` could render a single symbol, two spikes settled the open questions; this record binds their outcome and the artifact contract both builders (content pipeline, mobile app) implement.

## Decision

- **MathJax 4.1.3 (exact pin, catalog) is the mobile math engine.** Static math — every symbol, equation expression, term key and `$…$`/`$$…$$` fragment of every localized prose field — is rendered **at build** by `@equreka/content` into `dist/presentation/math/{atlas,bodies}.json`. Calculator output (user-driven, unbounded) will use the same MathJax core **at runtime** through the lean liteAdaptor bundle, in a later phase. KaTeX stays web-only.
- **Font: `mathjax-newcm`**, global font cache at build (`fontCache: 'global'`), so glyph `<path>` definitions are emitted once with stable ids (`MJX-NCM-<variant>-<codepoint>`) and bodies reference them by `<use href>`.
- **TeX packages (build = runtime):** `base, ams, newcommand, noundefined, unicode, textmacros`. A string that renders at build renders identically on-device later.
- **Line-breaking is disabled** (`linebreaks: { inline: false }`, unbounded `containerWidth`) and the pipeline **asserts exactly one `<svg>` root per body**; a violation is a build error. Wide expressions are the reader's layout problem (horizontal scroll), never a second root.
- **Inline math tiering (mobile):** plain symbols render as styled Unicode `Text` inline; 2D math (`\frac`, `\sqrt`, matrices) renders as a display `SvgXml` block below its paragraph. `SvgXml` is never nested inside `<Text>`.
- **Determinism is a contract:** artifacts are byte-identical across builds (the artifact test builds twice — one cold render, one from cache — and compares every file by SHA-256).

## Spike evidence

**Spike A — MathJax 4.1.3 under Hermes.** A DOM-free bundle (liteAdaptor + TeX input + SVG output + newcm, no dynamic glyph ranges) was esbuild-bundled, lowered with `@react-native/babel-preset`, and executed under `hermes-engine-cli` 0.12 (direct JS and `hermesc -O` bytecode) plus a compile-only check with the RN 0.86 `hermes-compiler` hermesc. **PASS**: all five reference expressions produce byte-identical SVG (hash-equal) under Node, Hermes JS and Hermes bytecode; zero failures, zero dynamic-range requests. Sizes: **1.38 MB minified / 479 KB gzip / 1.85 MB hbc**; **~30 ms** module + renderer init; **1–5 ms per render** warm. Caveat: `hermes-engine-cli` 0.12 is a lower bound (older bytecode format than SDK 57's engine), so the RN-matched `hermes-compiler` compile check is the binding one; a runtime smoke on device remains for the mobile phase.

**Spike B — corpus measurement (pre-`paths`, `en` only, 241 unique TeX).** Rendering with `fontCache: 'local'` and stripping semantic attributes: 584 KB. Atlas + global bodies: **219 KB (−62.5 % raw, −63 % gzip; 34 KB gzip total)**; atlas alone 57 KB (103 glyphs). Every body parsed to ex metrics (17 unitless `0` vertical-aligns), every root carried `fill`/`stroke="currentColor"`, no `merror`, no `<text>` fallback. **Three dynamic glyph ranges** are touched by the corpus (`calligraphic` for `\mathcal{E}`, `script` for `ℓ`, `latin-i` for `°Ré`); pre-rendering them at build means the runtime bundle never loads a range. Two of 241 expressions exceed a 360 px phone width (farad and ohm definitional chains, 99 ex and 72 ex).

**Two discoveries that shaped the contract:**

1. **Line-breaking produces multiple roots.** MathJax 4 breaks inline math by default and display math that exceeds `containerWidth`; the output is several `<svg>` roots joined by `<mjx-break>` elements, not one SVG document (19 of 241 corpus expressions broke at 336 px; a 300-character inline probe yields 157 roots). Disabling breaking and asserting one root is therefore mandatory, not cosmetic.
2. **Cross-root `<defs>` is impossible.** `<use href="#id">` resolves only inside its own SVG root — in browsers and in react-native-svg alike — so a page-level atlas cannot be referenced from body SVGs. The body is hydrated per render: prepend a `<defs>` holding exactly the glyphs the body uses. The hydrated result equals the `fontCache: 'local'` rendering byte-for-byte after normalizing MathJax's local id prefix (`MJX-<n>-`), verified on the full spike corpus and, in the pipeline tests, on sampled bodies against MathJax itself.

**Pipeline result (this change, full corpus, `en`+`es`, paths included):** 333 unique TeX, 120 glyphs; `atlas.json` 61.6 KB raw / 25.1 KB gzip, `bodies.json` 299 KB raw / 19.6 KB gzip (budgets 200 KB / 1 MB raw). Cold render of the whole corpus is ~130 ms of a ~1.6 s build; a warm build (content-addressed cache hit) never boots MathJax. A warm build and a cache-less build hash identical across all 26 `dist/` files.

## Contract

`dist/presentation/math/atlas.json`

```json
{ "schemaVersion": 1, "font": "mathjax-newcm", "glyphs": { "<glyphId>": "<path d>" } }
```

`dist/presentation/math/bodies.json` — keyed by **canonical TeX**:

```json
{ "<tex>": { "svg": "<svg …>…</svg>", "wEx": 8.704, "hEx": 1.912, "dyEx": -0.025, "glyphs": ["MJX-NCM-I-1D438", "…"] } }
```

- `svg`: MathJax root with `<defs>` removed and `data-*`, `aria-*`, `role`, `focusable`, `style` stripped; `fill`/`stroke="currentColor"` retained so a `color` prop drives it. `wEx`/`hEx`/`dyEx` are width, height and CSS `vertical-align` in ex (`ex = 8 px` at `em = 16 px` at build; scale by the reader's ex). `glyphs` lists atlas ids in first-use order; the atlas is glyph-closed over all bodies.
- **Canonical TeX** = annotation macros (`\mag{}`/`\const{}`/`\var{}`) reduced to their brace-grouped argument, dash-like Unicode folded to `-`. Every TeX-bearing presentation field is already canonical — `symbolTex`, `symbolAltTex`, the new `expressionTex` on equations, and every math segment — so consumers index `bodies[value]` with the slice string as-is. When one string is authored both inline and in display mode it is rendered once, in display style.
- **Segments.** Every entity with a `description` gains `descriptionSegments: { [locale]: Segment[] }`; path steps gain `noteSegments` / `bodySegments` / `promptSegments` / `answerSegments` likewise, with `Segment = { t: 'text', v } | { t: 'math', tex, display }`. Text is byte-literal (apostrophes, backslashes, unmatched `$`). The splitter is `splitRichText` in `@equreka/content/rich-text`, a platform-free module that also exports `canonicalTex` and the reference `hydrateMathBody(body, atlas)`.
- **Hydration (mobile):** `hydrateMathBody` → `SvgXml`; `width = wEx·ex`, `height = hEx·ex`, baseline shift `dyEx·ex`.
- **Build guarantees:** one `<svg>` root per body; an inline TeX error (`merror`) or an undefined control sequence (noundefined's red `mtext`) fails the build with the source file and field; size budgets enforced; render cache keyed by TeX, display mode, MathJax version, render-config hash and pipeline version, discarded wholesale on any version change so a stale glyph path can never survive under an unchanged id.

## Consequences

- Adding math to content costs nothing at runtime: the corpus's glyph closure ships as data, and the on-device MathJax (calculator phase) needs no dynamic font ranges for static content.
- The bundled `mathjax` package boots through a `require` rooted at its own entry — its default loader `import()`s bare Windows paths and the font sub-dependency only resolves from inside MathJax's node_modules under pnpm's isolated layout. `@mathjax/src` is not a dependency; the pipeline uses only what the catalog pins.
- The web keeps its own KaTeX splitter for now; moving `apps/web/src/lib/tex.ts` onto `@equreka/content/rich-text` is a follow-up, not part of this decision.
- Two corpus expressions are wider than a phone; the reader scrolls them horizontally. Authoring shorter definitional chains is a content decision, not an engine one.
