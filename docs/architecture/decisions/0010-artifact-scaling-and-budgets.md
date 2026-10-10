# 0010 — Artifact scaling and budgets

Date: 2026-10-06 · Status: accepted · Amended 2026-10-06 (math body shards and per-equation solutions) · Amended by ADR 0015 (presentation shards, search leads, mobile transfer budget)

## Context

ADR 0002 promises that "artifact slices have CI size budgets; growth fails loudly". Before this change the promise covered seven files. `emit.ts` held four ad-hoc constants, passed to `write()` one call at a time: engine 500 KB, 1 MB for each search index and each catalog-lite shard, math atlas 200 KB, math bodies 1 MB. Everything else the build emits, the presentation slices included, shipped with no ceiling. `artifact.test.ts` restated the numbers.

The corpus is about to grow from about 300 entries to about 770 roadmap entries, with ≈437 equations and encyclopedic descriptions of 200–350 words in two languages (`docs/content/README.md`). Measured on the W1.0 base (`pnpm --filter @equreka/content build`, 2026-10-06):

- **Everything was pretty-printed with tabs.** `stable-json.ts` indented every file. `dist/` is gitignored, so the indentation bought nothing in diffs. It roughly doubled the search indexes: `search/en.json` is 310,598 bytes pretty and 153,210 compact.
- **Search indexed full descriptions.** `searchDocumentOf` fed the whole TeX-stripped description of every entry into MiniSearch. The web fetches each locale's index whole on search focus, and the PWA precaches both locales.
- **Presentation carried every prose field twice.** Each description was mirrored as `descriptionSegments`, and each path step's prose as `noteSegments`, `bodySegments`, `promptSegments` and `answerSegments` (ADR 0005). The segments are derivable from the text with `splitRichText`. Serialized compact, they were 1.7 times the size of the descriptions they mirrored, and 55 KB of the 94 KB `paths.json`.
- **Splitting does not shrink the mobile bundle.** `apps/mobile/shared/content/artifact.ts` imports every presentation slice, both math files, both catalog-lite shards, `engine.json`, `meta.json` and `solutions.js`. Metro compiles them into the one Hermes bundle, and every OTA update ships that bundle whole (ADR 0005, *Measured cost*). Moving bytes between files changes nothing there. Only removing or deduplicating them does.

### Projection

The search index was the first budget the program would break. The projection adds synthetic 275-word entries, assembled from the corpus's own paragraphs, to today's English documents and serializes the index compact. The synthetic entries reuse the corpus vocabulary, so the measured sizes are a lower bound.

| Entries added | Full text | First paragraph, 480 characters |
| --- | --- | --- |
| 0 | 153,020 | 142,899 |
| 200 | 436,309 | 239,014 |
| 437 | 774,487 | 355,798 |
| 600 | 1,005,013 | 432,841 |
| 770 | 1,257,440 | 518,433 |

Full-text indexing crosses the 1 MiB budget at about 630 added entries when compact, and at about 240 when pretty-printed. Lead-only indexing ends the program at about half the budget.

## Decision

### Budget table

`ARTIFACT_BUDGETS` is the single source of truth. It lived in `packages/content/src/pipeline/emit.ts` and now lives in `packages/content/src/artifact-budgets.ts`, exported as `@equreka/content/artifact-budgets` (*Math body shards and per-equation solutions*). Each key is a path pattern relative to `dist/`, and each value is `{ maxBytes, mobileBundled, protects }`. `<collection>` matches a `COLLECTIONS` name, `<locale>` a `SEARCH_LOCALES` code, `<shard>` a lowercase hex shard id and `<equation>` an equation slug other than `index`.

The table as amended by A7:

| Pattern | Max (raw compact bytes) | Mobile-bundled | Protects |
| --- | --- | --- | --- |
| `engine.json` | 500 KiB | yes | mobile bundle and OTA size |
| `meta.json` | 4 KiB | yes | a fixed-size header, never a data carrier |
| `solutions.js` | 512 KiB | yes | mobile bundle; every equation, evaluated on the first mobile solve |
| `solutions.d.ts` | none (build-only) | no | — |
| `solutions/index.js` | 64 KiB | no | web calculator island chunk: one dynamic-import case per equation |
| `solutions/index.d.ts` | none (build-only) | no | — |
| `solutions/<equation>.js` | 16 KiB each | no | web transfer: the one solution chunk a calculator page loads; PWA precache |
| `presentation/<collection>.json` | 2 MiB each | yes | mobile bundle; one JSON parse on the collection's first screen |
| `presentation/math/atlas.json` | 200 KiB | yes | mobile bundle |
| `presentation/math/bodies/<shard>.json` | 128 KiB each | yes | mobile bundle; one shard evaluated when a screen first renders a body in it |
| `search/<locale>.json` | 1 MiB | no | web transfer on search focus; PWA offline install (ADR 0013) |
| `search/catalog-lite.<locale>.json` | 512 KiB | yes | web transfer and PWA offline install (search, favorites, offline reader); mobile bundle |
| `schemas/<collection>.schema.json`, `schemas/<collection>.locale.schema.json` | none (build-only) | no | — |

*Amended by ADR 0015:* `presentation/<collection>.json` splits into `presentation/<whole>.json` (2 MiB, unsharded slices), `presentation/<sharded>.json` (the index of a sharded slice, 256 KiB) and `presentation/<sharded>/<shard>.json` (128 KiB each). `search/leads.<locale>.json` (512 KiB, mobile-bundled) is new.

The budgets protect three different costs:

- **Mobile bundle and OTA size.** The sum of the `mobileBundled` files may not exceed `MOBILE_BUNDLE_BUDGET_BYTES`, 8 MiB. `mobileBundled` mirrors the imports of `apps/mobile/shared/content/artifact.ts`, which a mobile test asserts (*Math body shards and per-equation solutions*). *Superseded by ADR 0015:* the mobile-bundled set is held to `MOBILE_TRANSFER_BUDGET_BYTES`, 3 MiB of gzip over the set as one stream, with `MOBILE_STORAGE_CEILING_BYTES`, 16 MiB raw, as a backstop.
- **Web transfer.** The search index and catalog-lite are fetched on demand. A calculator page loads `solutions/index.js` as part of the calculator island's chunk, and then the one `solutions/<equation>.js` chunk for its own equation.
- **PWA precache.** The search indexes, catalog-lite and the web's derived payloads are precached against the 6 MiB manifest budget that `equreka-pwa.ts` enforces. *Amended by ADR 0013:* they now live in a per-locale data cache filled for the locales the reader uses, and the 6 MiB budget counts the precached shell plus the largest locale's payloads.

### Enforcement

- `write()` classifies every emitted file. A file that matches no pattern, or more than one, is a build error, so a new artifact cannot ship without a budget.
- At 80% of a budget (`BUDGET_WARN_RATIO`) the build warns. Over the budget it errors. The same two thresholds apply to the mobile-bundled total.
- `EmittedArtifact` carries `bytes`, `gzipBytes` (zlib default level, for information), `pattern` and `budget`. The CLI prints every artifact's raw and gzip size, its share of its budget and whether it is mobile-bundled, then the mobile-bundled total against 8 MiB (since ADR 0015, the transfer against 3 MiB and the raw storage against 16 MiB).
- Budgets cap raw bytes, not gzip, because the mobile bundle and every JSON parse pay the uncompressed size. Per-file caps still do; ADR 0015 moves the mobile total to a transfer budget.
- `artifact.test.ts` reads the table: every file on disk is classified by exactly one pattern, sits within its `maxBytes` and adds to a mobile total within the ceiling. No number is restated in the test.

### Web payload budgets

`apps/web/src/integrations/equreka-assets.ts` derives three payloads per locale and holds each to `PAYLOAD_BUDGETS`, with the same 80% warning. Over a budget the web build fails.

| Payload | Max | Today (en / es) |
| --- | --- | --- |
| `data/reader.<locale>.json` | 2 MiB (raised from 1 MiB by ADR 0013) | 104,774 / 104,322 |
| `data/converter.<locale>.json` | 256 KiB | 40,108 / 40,219 |
| `data/paths.<locale>.json` | 128 KiB | 3,858 / 3,879 |

The reported payload total now counts UTF-8 bytes. It used to count UTF-16 code units.

### Compact JSON

`stableStringify(value, { compact: true })` keeps the recursive key sort and drops the indentation. Every shipped JSON artifact is compact. `dist/schemas/*.json` stays tab-indented, because editors and people open those files. Pretty stays the default, so the math render-config hash, which is stringified the same way, is unchanged.

### Lead-only search

`searchLeadOf(text)` in `@equreka/content/search-options` is the only definition of what search indexes from a description:

- the first paragraph;
- TeX stripped by `stripTexForSearch` (moved here from `pipeline/tex.ts`), with whitespace collapsed;
- cut to `SEARCH_LEAD_MAX_CHARS` (480) at a word boundary.

A folded `>-` block parses each blank-line paragraph break to a single newline. A literal `|-` block keeps the blank line and uses single newlines for hard breaks inside a paragraph. Text that holds a blank line therefore ends its first paragraph at the first blank line, and any other text ends it at the first newline. A literal block with hard breaks but no blank line, such as the legacy `mass-energy-equivalence`, therefore leads with its first line.

The web index (`searchDocumentOf`, both locales) and the on-device mobile index (`use-search-lanes.ts`) both call it. Before this change, mobile indexed the Unicode-fallback form of the math. A mobile test now asserts that the index built on the device serializes to the same JSON as the web's `search/<locale>.json`, so the two platforms rank identically. The `SearchDocument.description` field keeps its name, which keeps serialized indexes and `searchOptions` interchangeable.

**Accepted trade-off: recall.** A word that appears only after a description's first paragraph no longer finds the entry. Name, aliases, symbol and branch names still index in full, and they carry most query intent. The lead states what the entry is. Indexing the full text would break the 1 MiB budget before the program ends, and would make the precache and the search-focus transfer more than twice as large. The style guide therefore asks for a strong lede: the first paragraph holds the terms a reader would search for.

### Segment-free presentation

The presentation slices no longer carry `descriptionSegments` or path-step `*Segments`. This supersedes the *Segments* item of ADR 0005's contract. Every reader splits raw prose with `splitRichText` at render time:

- **Mobile** calls `pickRichText(text, locale)` in `entities/content/text.ts`. It memoizes per source object and locale in a `WeakMap`, so each field is split once and keeps its identity across renders, which the memoized `RichText` relies on.
- **Web**: the equation page splits its localized description at build time, and `raw` still carries the term macros for cross-highlighting.

`splitLocalizedText` and `LocalizedSegments` had no remaining consumer and are deleted.

### Versions

- **`SCHEMA_VERSION` stays 4.** It tracks the engine-slice contract (ADR 0004, 0007, 0011 precedent), and `engine.json` changed only in whitespace. The presentation shape did change, but the presentation slices have no version field and no external consumer: the web reads them at build, and mobile compiles them into the same bundle as the code that reads them. Artifact and reader can never be out of step.
- **`CONTENT_PIPELINE_VERSION` stays 5.** It invalidates derivation caches. No cached value changed: math bodies are keyed by TeX and render identically, verification is untouched and codegen is untouched. Compact output and lead-only search are computed at emit time and never cached.

## Results

Before is the W1.0 base (pretty JSON, full-text search, segments). After is this change. All sizes are in bytes.

| Artifact | Before | After | gzip after | Budget | Share |
| --- | --- | --- | --- | --- | --- |
| `engine.json` | 96,060 | 63,376 | 8,720 | 500 KiB | 12.4% |
| `presentation/units.json` | 405,625 | 178,663 | 27,436 | 2 MiB | 8.5% |
| `presentation/paths.json` | 124,582 | 38,292 | 12,586 | 2 MiB | 1.8% |
| `presentation/magnitudes.json` | 55,359 | 30,288 | 7,506 | 2 MiB | 1.4% |
| `presentation/math/atlas.json` | 65,532 | 65,020 | 26,546 | 200 KiB | 31.7% |
| `presentation/math/bodies.json` | 580,267 | 552,262 | 33,509 | 1 MiB | 52.7% |
| `search/en.json` | 310,598 | 143,067 | 30,233 | 1 MiB | 13.6% |
| `search/es.json` | 320,242 | 147,132 | 30,348 | 1 MiB | 14.0% |
| `search/catalog-lite.en.json` | 65,873 | 50,108 | 6,222 | 512 KiB | 9.6% |
| Mobile-bundled total | 1,549,034 | 1,071,925 | | 8 MiB | 12.8% |

- **Search.** `search/en.json` fell from 310,598 bytes to 153,210 from compact JSON alone, and to 143,067 with the lead only. Lead-only matters little today because most legacy descriptions are a single short paragraph. It matters at scale (*Projection*).
- **Presentation.** Removing segments cut the compact presentation slices from 534,052 to 289,201 bytes (−46%).
- **Mobile export** (`expo export --platform android`, 1800 modules both times): the Hermes bundle went from 6,278,748 to 6,210,406 bytes (−68 KB). The saving is smaller than the JSON delta because Metro reserializes JSON and Hermes deduplicates strings, so a segment text that equalled its description was already stored once.
- **Web.** The PWA precache manifest went from 2,133.4 KiB to 1,769.9 KiB. All 584 HTML pages and every island chunk are byte-identical to the base build. Only the search JSON and `sw.js` revisions differ.

## Alternatives considered

- **Raise the search budget.** It defers the break without fixing the slope: the whole index is still fetched on search focus and precached in both locales.
- **Shard the search index per collection.** The search box queries every collection at once, so it would fetch every shard anyway. Sharding does not shrink the precache.
- **Keep full text and drop the PWA precache of the index.** Search would stop working offline on first use, contradicting ADR 0002's offline promise.
- **Keep segments and drop the raw text.** Search, the reader payload and meta descriptions need the raw text, and the segments are the larger form.
- **Budget gzip bytes.** The mobile bundle and JSON parsing pay raw bytes, and gzip ratios differ by file (SVG bodies compress 16:1, search 5:1). A gzip cap would let the mobile-side cost grow unseen. *ADR 0015 adopts it for the mobile total only, measured as one stream, and keeps a raw storage ceiling; per-file caps stay raw.*

## Consequences

- Every new artifact path needs a row in `ARTIFACT_BUDGETS`, or the build fails.
- Content waves read their budget headroom straight from the build output. The build warns at 80%, so growth shows up a wave before it fails.
- Authors write a lede that carries the entry's searchable terms (style guide, authoring guide).
- Words deep in a description no longer find the entry.
- Consumers outside this repository, if any appear, must split prose with `splitRichText` themselves.

## Math body shards and per-equation solutions (A7)

The step this record announced as *Next* shipped the same day. ADR 0005 holds the body encoding (bodies v2) and its proof of identity; this section covers sharding, solutions and budgets.

### Hash shards

`presentation/math/bodies.json` is gone. The bodies ship in `MATH_SHARD_COUNT` (16) files, `presentation/math/bodies/00.json` … `0f.json`. A body's shard is `mathShardOf(tex)`, the low bits of the standard 32-bit FNV-1a hash of its canonical TeX's UTF-8 bytes. The build emits every shard, empty ones included, so the mobile loader table always matches the files on disk.

Shards are keyed by hash, not by collection, for two reasons. Callers hold only the TeX string, and much of the math a screen renders belongs to another collection: a path step quotes a unit's symbol, a calculator chip shows a magnitude's. Collection-affinity shards would need a TeX-to-shard manifest shipped with the bodies, while a hash needs nothing beyond the string the caller already has.

Hashing does scatter one screen's math across shards. A description with five fragments may touch five shards, and a shard, once evaluated, stays in memory. Shards do not shrink the mobile bundle either, since every shard is still compiled into it. What they bound is the cost of one first render, and the budget below gives the signal to split further.

**Raising `MATH_SHARD_COUNT`.** When a shard approaches its budget (the build warns at 80%), double the constant in `packages/content/src/rich-text.ts`. It must stay a power of two of at most 256. Then:

1. Extend the loader table in `apps/mobile/shared/content/artifact.ts` with one literal `require` per new shard file. The table is typed as a tuple of exactly `MATH_SHARD_COUNT` loaders, so `tsc` fails until it is complete. `__tests__/content-artifact.test.ts` checks that loader `i` returns `bodies/<mathShardName(i)>.json`.
2. Update the golden shard values in `rich-text.test.ts`: every body moves, so the old pins fail on purpose.

Nothing else changes. The hash is a pure function of the TeX, and the artifact carries no shard map.

**Per-shard budget: 128 KiB, not the 256 KiB this record reserved.** Today's largest shard is 19,105 bytes. At the program's end, about 2,000 bodies are projected, with display expressions above today's 368-byte average, so the mean shard lands near 80 KB and the largest about 25% above it. 128 KiB therefore lets the program finish without resharding while still flagging a skewed shard. Sixteen shards at 128 KiB allow 2 MiB of bodies, twice the old single-file budget and a quarter of the mobile total. At 256 KiB, the first warning would come only after bodies reached about 3.3 MB, 40% of the mobile budget. The 8 MiB mobile-bundled total stays enforced across all shards.

### Per-equation solutions

`solutions.js` was imported statically by the web calculator island, so every calculator page shipped every equation's functions. The codegen now writes three things:

- **`dist/solutions/<slug>.js`**, one module per solved equation. Its default export is the term map, generated by the same function as the aggregate's entry.
- **`dist/solutions/index.js`**, which exports `loadSolutions(slug)`. Inside a `switch`, each slug has its own literal `import('./<slug>.js')`, because bundlers split only static specifiers into chunks and a `switch` cannot resolve a slug to an `Object.prototype` member. An unknown slug resolves to `undefined`. The slug `index` is reserved for this loader: an equation with that slug is a build error.
- **`dist/solutions.js`**, the aggregate, still inlined and byte-identical to before. Mobile keeps importing it, so its bundle carries one module rather than one per equation.

The web island calls `loadSolutions(meta.slug)` on mount and keeps Calculate disabled until the chunk arrives. If the chunk fails to load, for example after a deploy has replaced a hashed chunk, the island shows `calculator.solverUnavailable`.

Vite emits one chunk per equation (143–242 bytes today). The PWA's `_astro/*.js` glob precaches all of them, raising the manifest from 80 URLs and 1,769.9 KiB to 84 URLs and 1,772.3 KiB. A preview of the built site confirmed that each calculator page, in either locale, requests only its own equation's chunk and solves with it.

The island chunk grew from 12,883 to 14,421 bytes. It gained Vite's preload helper, about 1 KB once, and a `switch` case of about 110 bytes per equation, and it lost the inlined functions. The `switch` grows linearly: about 50 KB raw at 437 equations, against an inlined aggregate that grows with every solution's size. The `solutions/index.js` budget (64 KiB of source) guards that slope.

### Budget table and the mobile mirror

`ARTIFACT_BUDGETS`, `MOBILE_BUNDLE_BUDGET_BYTES`, `BUDGET_WARN_RATIO` and `artifactBudgetPatterns` moved to `packages/content/src/artifact-budgets.ts`. That module imports nothing from Node, so the mobile app's jest suite can read it. `apps/mobile/__tests__/content-artifact.test.ts` asserts that a file under `dist/` is `mobileBundled` exactly when `artifact.ts` imports or requires it.

The check lives in the app, not in `@equreka/content`. Turborepo reruns a package's tests when the package or one of its dependencies changes. A content test that read the app's source would be served from cache after an edit to `artifact.ts`, while the app's test reruns whenever either side changes.

### Lazy JSON, corrected

The `--no-bytecode` export showed that `artifact.ts`'s default JSON imports compiled to interop-wrapped requires at the top of the module. The first accessor call therefore evaluated every artifact file. ADR 0005 records the finding. Every JSON file is now read through a literal `require` inside its accessor, so the per-collection laziness that this record and ADR 0002 assumed now holds, and a math lookup evaluates one shard.

### Versions

- **`SCHEMA_VERSION` stays 4.** It tracks the engine-slice contract, and `engine.json` is unchanged. The atlas carries its own version, now 2 (ADR 0005). The aggregate `solutions.js` is byte-identical, and the per-equation modules and their loader are new files with the same functions.
- **`CONTENT_PIPELINE_VERSION` stays 5.** It invalidates the verification cache (messages and samples) and the math render cache (rendered bodies), and neither cached value changed. Codegen and the body encoding run at emit time, from ASTs and bodies that are never cached in encoded form. A bump would only force a cold re-render and a full re-verification. The doc comment on the constant listed "codegen output shape" as a reason to bump; it now names what the caches hold.

### Results

| Artifact | Before (A6) | After |
| --- | --- | --- |
| Math bodies | `bodies.json` 552,262 | 16 shards, 220,668 in total (6,631 to 19,105 each) |
| Mobile-bundled total | 1,071,925 | 740,331 (−30.9%) |
| Hermes bundle (`expo export --platform android`) | 6,210,405 | 5,930,950 (−4.5%) |
| Web calculator island chunk | 12,883 | 14,421, plus one 143–242-byte chunk per page |
| Web HTML | 584 pages | same 584 pages; identical once asset hashes and island ids are normalized, except that the 8 calculator pages render Calculate `disabled` until hydration |
