# 0005 — Mobile math rendering: MathJax 4.1.3 atlas + bodies

Date: 2026-09-09 · Status: accepted · Amended 2026-10-06 (bodies v2 in hash shards)

## Context

ADR 0002 fixed the split: KaTeX SSR on the web, "MathJax 4.1 on mobile — build-time tex2svg with a shared glyph atlas + runtime liteAdaptor for calculator output. No WebView." That sentence had not been proven against Hermes, the MathJax 4 API, or the real corpus. Before `apps/mobile` could render a single symbol, two spikes settled the open questions; this record binds their outcome and the artifact contract both builders (content pipeline, mobile app) implement.

## Decision

- **MathJax 4.1.3 (exact pin, catalog) is the mobile math engine.** Static math — every symbol, equation expression, term key and `$…$`/`$$…$$` fragment of every localized prose field — is rendered **at build** by `@equreka/content` into a glyph atlas and math bodies under `dist/presentation/math/` (*Contract*). Calculator output (user-driven, unbounded) will use the same MathJax core **at runtime** through the lean liteAdaptor bundle, in a later phase. KaTeX stays web-only.
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

*Amended 2026-10-06: bodies v2 in hash shards replace `bodies.json` (see* Bodies v2 *below). The atlas is unchanged except for its version.*

`dist/presentation/math/atlas.json`

```json
{ "schemaVersion": 2, "font": "mathjax-newcm", "glyphs": { "<glyphId>": "<path d>" } }
```

`schemaVersion` 2 marks the bodies v2 encoding; version 1 paired the atlas with `bodies.json`.

`dist/presentation/math/bodies/<shard>.json`, `<shard>` = `00` … `0f`: the bodies whose canonical TeX hashes to that shard, keyed by **canonical TeX**. Each value is a `MathBodyV2`, in one of two forms:

```json
{ "<tex>": { "viewBox": "0 -666 1500 666", "wEx": 3.393, "hEx": 1.507, "dyEx": -0.025, "inner": "<g><g>[N-31][N-30 translate(500,0)]</g></g>" } }
```

```json
{ "<tex>": { "svg": "<svg …>…</svg>", "wEx": 8.704, "hEx": 1.912, "dyEx": -0.025, "glyphs": ["MJX-NCM-I-1D438", "…"] } }
```

- **The rendered body** (`MathBody`, the second form) is what the renderer produces and the render cache stores. `svg` is the MathJax root with `<defs>` removed and `data-*`, `aria-*`, `role`, `focusable`, `style` stripped; `fill`/`stroke="currentColor"` retained so a `color` prop drives it. `wEx`/`hEx`/`dyEx` are width, height and CSS `vertical-align` in ex (`ex = 8 px` at `em = 16 px` at build; scale by the reader's ex). `glyphs` lists atlas ids in first-use order; the atlas is glyph-closed over all bodies.
- **The lean form** (`LeanMathBody`, the first form) stores only what varies. Every rendered body opens with the same `<svg xmlns=… width="<wEx>ex" height="<hEx>ex" viewBox=… xmlns:xlink=…>` and `<g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)">`, and closes with `</g></svg>`. The lean form keeps `viewBox`, the metrics and the markup in between as `inner`. In `inner`, each `<use xlink:href="#MJX-NCM-<id>"></use>` is written `[<id>]`, and each one with a transform is written `[<id> <transform>]`. The glyph list is not stored: it is derived from the references.
- **A body ships lean only when the build proves it.** `encodeMathBody` (`pipeline/math-shards.ts`) builds the lean form and keeps it only if `hydrateMathBody(lean, atlas)` equals `hydrateMathBody(rendered, atlas)` byte for byte. That string is exactly what `SvgXml` receives, so the encoding cannot change a rendered pixel. Any other body ships as the rendered body itself, the raw form, and the build warns once with the count. Markup containing `[` or `]`, or a root that differs from the template, never encodes lean. Today all 599 bodies are lean.
- **Shards.** `mathShardOf(tex)` is the standard 32-bit FNV-1a hash of the canonical TeX's UTF-8 bytes, masked to its low bits: `& (MATH_SHARD_COUNT - 1)`. A lone surrogate hashes as U+FFFD, the way TextEncoder encodes it. Both the hash and `MATH_SHARD_COUNT` (16, a power of two of at most 256) live in `@equreka/content/rich-text`, so the pipeline and the app share them. `mathShardName` renders a shard as two lowercase hex digits. Every shard file is emitted, even when it is empty. Raising the count is ADR 0010's procedure.
- **Canonical TeX** = annotation macros (`\mag{}`/`\const{}`/`\var{}`) reduced to their brace-grouped argument, dash-like Unicode folded to `-`. Every TeX-bearing presentation field is already canonical — `symbolTex`, `symbolAltTex`, the new `expressionTex` on equations, and every math segment — so consumers look a body up with the slice string as-is. When one string is authored both inline and in display mode it is rendered once, in display style.
- **Segments.** Every entity with a `description` gains `descriptionSegments: { [locale]: Segment[] }`; path steps gain `noteSegments` / `bodySegments` / `promptSegments` / `answerSegments` likewise, with `Segment = { t: 'text', v } | { t: 'math', tex, display }`. Text is byte-literal (apostrophes, backslashes, unmatched `$`). The splitter is `splitRichText` in `@equreka/content/rich-text`, a platform-free module that also exports `canonicalTex` and the reference `hydrateMathBody(body, atlas)`. *Superseded by ADR 0010: the slices no longer carry segments; readers call `splitRichText` on the raw prose.*
- **Lookup (mobile):** `getMathBody(tex)` in `apps/mobile/shared/content/artifact.ts` computes `mathShardOf(tex)` and evaluates only that shard's JSON module, through a literal `require` in a table of `MATH_SHARD_COUNT` loaders.
- **Hydration (mobile):** `hydrateMathBody(body, atlas)` → `SvgXml`; `width = wEx·ex`, `height = hEx·ex`, baseline shift `dyEx·ex`. For a lean body it reassembles the SVG (`mathBodySvg`), derives the glyphs (`mathBodyGlyphs`, the same function the renderer uses for `glyphs`) and prepends their `<defs>`, exactly as for a rendered body.
- **Build guarantees:** one `<svg>` root per body; an inline TeX error (`merror`) or an undefined control sequence (noundefined's red `mtext`) fails the build with the source file and field; size budgets enforced; the lean encoding is proven per body; render cache keyed by TeX, display mode, MathJax version, render-config hash and pipeline version, discarded wholesale on any version change so a stale glyph path can never survive under an unchanged id. The cache stores rendered bodies, so the encoding never invalidates it.

## Consequences

- Adding math to content costs nothing at runtime: the corpus's glyph closure ships as data, and the on-device MathJax (calculator phase) needs no dynamic font ranges for static content.
- The bundled `mathjax` package boots through a `require` rooted at its own entry — its default loader `import()`s bare Windows paths and the font sub-dependency only resolves from inside MathJax's node_modules under pnpm's isolated layout. `@mathjax/src` is not a dependency; the pipeline uses only what the catalog pins.
- The web keeps its own KaTeX splitter for now; moving `apps/web/src/lib/tex.ts` onto `@equreka/content/rich-text` is a follow-up, not part of this decision.
- Two corpus expressions are wider than a phone; the reader scrolls them horizontally. Authoring shorter definitional chains is a content decision, not an engine one.

## Runtime leg — implementation record (2026-09-26)

The calculator phase deferred above shipped in `apps/mobile` (commit `f3f8b24`): a successful solve renders the solved form on-device as SVG, symbolic and with knowns substituted, plain-text fallback. This section corrects the Consequences where the runtime leg contradicts them and binds what the leg proved.

### Corrections

1. **`@mathjax/src` is a dependency — of the mobile app, not the pipeline.** The claim "`@mathjax/src` is not a dependency" holds for `packages/content` only. The `mathjax` npm package is a set of loader-driven component bundles resolved through a computed-path `import()`; Metro cannot bundle it. `apps/mobile` therefore depends on `@mathjax/src` 4.1.3 and `@mathjax/mathjax-newcm-font` 4.1.3 (exact catalog pins), importing the ESM sources directly (`runtime-mathjax-core.ts`: liteAdaptor, TeX with the build's package set, SVG over the static newcm tables, `fontCache: 'local'`, line-breaking off, `asyncLoad` unset). **Pin-equality rule:** both pins must equal the pipeline's `mathjax` pin. Build = runtime is a property of one MathJax version and one font table; a drifted runtime pin renders the calculator's output with different metrics than the atlas bodies beside it.
2. **A device-crash class Spike A structurally could not catch.** MathJax's `util/context` dereferences `navigator.appVersion` and `navigator.userAgent` at module evaluation, to name the host OS. React Native defines `window` and a `navigator` carrying only `product`, so every MathJax import throws before the first render — on device and under jest-expo alike. Spike A ran under bare-Hermes CLI, which has no `window` at all; that branch of `util/context` never executed, so the spike was blind to it. `apps/mobile/shared/math/mathjax-host.ts` defines both as empty strings when they are not strings; it is the first import of `runtime-mathjax-core.ts` and must evaluate before any MathJax module. Nothing in the runtime leg reads the resulting `context.os`.
3. **`#default-font/*` is not resolved by `expo export`.** `@mathjax/src` reaches its font through the `#default-font/*` subpath import of its own `package.json` `imports` map; Metro 0.84 (SDK 57) fails to resolve it. `apps/mobile/metro.config.js` rewrites the prefix to `@mathjax/mathjax-newcm-font/mjs/*` in `resolveRequest`; `apps/mobile/jest.config.js` maps it to the `cjs/` build so jest's CommonJS graph shares one font module instance with the output jax. Any MathJax bump re-verifies both rewrites: the alias target is MathJax's, not ours.

### Decision (runtime contract)

- **Lazy init.** `createRuntimeMathCore` is referenced only inside the singleton's `load` arrow (`runtime-mathjax.ts`); under Metro's `inlineRequires` the MathJax graph is required on the first solve, never at app start. Verified in a `--no-bytecode` export: the module ends in `o(async()=>(0,r(d[1]).createRuntimeMathCore)())` with no top-level require of the core. The singleton boots once and retries only after a rejected boot.
- **Budget.** Each render runs under a 250 ms `Promise.race` (`RUNTIME_MATH_BUDGET_MS`), first-call boot included. Overrun rejects and the caller shows the plain solution string while the boot it started keeps warming the singleton. The numeric result renders independently and never waits on math.
- **Normalization = pipeline rules.** Exactly one `<svg>` root, inline `merror` → rejection, ex metrics read before `data-*`/`aria-*`/`role`/`focusable`/`style` are stripped, `<defs>` and `currentColor` retained; `layoutRuntimeMath` yields the same `HydratedMath` the atlas path feeds to `SvgXml`.

### Measured cost

Android Hermes export: 1546 → 1785 modules (+239), entry `.hbc` 4.01 → 5.79 MB (+1.78 MB), `dist` 5.2 → 6.9 MB — matching Spike A's 1.85 MB hbc estimate. The graph is lazily evaluated but ships in every OTA update; there is no split bundle.

### Unverified on device

No device or emulator was available. Open until measured under Expo Go: first-solve boot time against the 250 ms budget (Spike A's ~30 ms is a bare-Hermes lower bound), `SvgXml` rendering of runtime output (atlas bodies are proven; runtime bodies carry their own `<defs>`), and the `navigator` shim's behaviour under Expo Go's runtime rather than jest-expo's.

## Bodies v2 — implementation record (2026-10-06)

`bodies.json` was the largest artifact: 552,262 bytes compact for 599 bodies, 52.7% of its 1 MiB budget, while the content program adds about 437 equation expressions and longer descriptions (ADR 0010). Measured on that file:

| Part | Bytes | Share |
| --- | --- | --- |
| Constant root `<svg>`, top-level `<g>` and closing tags, 191 bytes per body | 114,409 | 20.7% |
| `<use xlink:href="#MJX-NCM-…">` elements | 188,271 | 34.1% |
| `glyphs` arrays, which the references already determine | 51,261 | 9.3% |

### Result

| | Before | After |
| --- | --- | --- |
| Files | `bodies.json` | 16 shards, `00.json` … `0f.json` |
| Raw bytes | 552,262 | 220,668 (−60.0%) |
| Per body | 922 | 368 |
| Largest file | 552,262 (52.7% of 1 MiB) | 19,105, `0d` with 44 bodies (14.6% of 128 KiB) |
| Smallest file | — | 6,631, `08` with 23 bodies |
| gzip, summed per file | 33,509 | 34,279 |

The encoding removes redundancy that gzip already removed, so the gain is in raw bytes, which the mobile bundle and every JSON parse pay (ADR 0010). The atlas did not change: same 125 glyphs, same paths.

### Proof of identity

- **Per body, at build:** `encodeMathBody` ships a body lean only when the two hydrated strings are equal (*Contract*).
- **Against the previous artifact:** every body of the A6 build's `bodies.json`, hydrated with the v1 algorithm, equals the same body hydrated from the shards. The SHA-256 over all 599 hydrated documents is `49b7f475…abdb9b` for both.
- **In tests:** `artifact.test.ts` hydrates every shipped body and compares it with a frozen copy of the v1 hydrator applied to a fresh cold render. `math-render.test.ts` checks sampled lean bodies against MathJax's own `fontCache: 'local'` output.
- **On Hermes:** the lean form rebuilds width and height by printing `wEx` and `hEx`. ECMAScript fixes `Number::toString` to the shortest digit string that round-trips. MathJax writes at most three decimals, and such a string is the only shortest form of its double, so Hermes prints the same digits as V8. Every other varying part (`viewBox`, transforms, `inner`) is stored verbatim.

### Mobile

`expo export --platform android`: the Hermes bundle went from 6,210,405 to 5,930,950 bytes (−279,455, −4.5%), and the module count from 1800 to 1815 (16 shards replace one file).

The `--no-bytecode` export also showed that the content JSON was never lazy. `artifact.ts` default-imported every JSON file, and Expo's Babel preset compiles such an import to `_interopDefault(require(…))` at the top of the module. Metro's `inlineRequires` does not move those. So the first accessor call evaluated every presentation slice, the atlas and the bodies at once. Named imports such as `solutions` and the runtime MathJax core were inlined as intended. `artifact.ts` now reaches every JSON file through a literal `require` inside the function that reads it. In the export, each file's require sits inside its accessor or shard loader, so a screen evaluates only the files it reads and a lookup evaluates only its own shard.
