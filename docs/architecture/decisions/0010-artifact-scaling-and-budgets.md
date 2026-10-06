# 0010 — Artifact scaling and budgets

Date: 2026-10-06 · Status: accepted

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

`ARTIFACT_BUDGETS` in `packages/content/src/pipeline/emit.ts` is the single source of truth. Each key is a path pattern relative to `dist/`, and each value is `{ maxBytes, mobileBundled, protects }`. `<collection>` matches a `COLLECTIONS` name, `<locale>` a `SEARCH_LOCALES` code and `<shard>` a lowercase hex shard id.

| Pattern | Max (raw compact bytes) | Mobile-bundled | Protects |
| --- | --- | --- | --- |
| `engine.json` | 500 KiB | yes | mobile bundle and OTA size |
| `meta.json` | 4 KiB | yes | a fixed-size header, never a data carrier |
| `solutions.js` | 512 KiB | yes | web calculator island chunk; mobile bundle |
| `solutions.d.ts` | none (build-only) | no | — |
| `presentation/<collection>.json` | 2 MiB each | yes | mobile bundle; one JSON parse on the collection's first screen |
| `presentation/math/atlas.json` | 200 KiB | yes | mobile bundle |
| `presentation/math/bodies.json` | 1 MiB | yes | mobile bundle |
| `presentation/math/bodies/<shard>.json` | 256 KiB each | yes | reserved for the sharded bodies (see *Next*) |
| `search/<locale>.json` | 1 MiB | no | web transfer on search focus; PWA precache |
| `search/catalog-lite.<locale>.json` | 512 KiB | yes | web transfer and PWA precache (search, favorites, offline reader); mobile bundle |
| `schemas/<collection>.schema.json`, `schemas/<collection>.locale.schema.json` | none (build-only) | no | — |

The budgets protect three different costs:

- **Mobile bundle and OTA size.** The sum of the `mobileBundled` files may not exceed `MOBILE_BUNDLE_BUDGET_BYTES`, 8 MiB. `mobileBundled` mirrors the imports of `apps/mobile/shared/content/artifact.ts`.
- **Web transfer.** The search index and catalog-lite are fetched on demand. `solutions.js` is part of the calculator island's chunk.
- **PWA precache.** The search indexes, catalog-lite and the web's derived payloads are precached against the 6 MiB manifest budget that `equreka-pwa.ts` enforces.

### Enforcement

- `write()` classifies every emitted file. A file that matches no pattern, or more than one, is a build error, so a new artifact cannot ship without a budget.
- At 80% of a budget (`BUDGET_WARN_RATIO`) the build warns. Over the budget it errors. The same two thresholds apply to the mobile-bundled total.
- `EmittedArtifact` carries `bytes`, `gzipBytes` (zlib default level, for information), `pattern` and `budget`. The CLI prints every artifact's raw and gzip size, its share of its budget and whether it is mobile-bundled, then the mobile-bundled total against 8 MiB.
- Budgets cap raw bytes, not gzip, because the mobile bundle and every JSON parse pay the uncompressed size.
- `artifact.test.ts` reads the table: every file on disk is classified by exactly one pattern, sits within its `maxBytes` and adds to a mobile total within the ceiling. No number is restated in the test.

### Web payload budgets

`apps/web/src/integrations/equreka-assets.ts` derives three payloads per locale and holds each to `PAYLOAD_BUDGETS`, with the same 80% warning. Over a budget the web build fails.

| Payload | Max | Today (en / es) |
| --- | --- | --- |
| `data/reader.<locale>.json` | 1 MiB | 104,774 / 104,322 |
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
- **Budget gzip bytes.** The mobile bundle and JSON parsing pay raw bytes, and gzip ratios differ by file (SVG bodies compress 16:1, search 5:1). A gzip cap would let the mobile-side cost grow unseen.

## Consequences

- Every new artifact path needs a row in `ARTIFACT_BUDGETS`, or the build fails.
- Content waves read their budget headroom straight from the build output. The build warns at 80%, so growth shows up a wave before it fails.
- Authors write a lede that carries the entry's searchable terms (style guide, authoring guide).
- Words deep in a description no longer find the entry.
- Consumers outside this repository, if any appear, must split prose with `splitRichText` themselves.

## Next

The next Wave 0 step, A7, replaces `presentation/math/bodies.json`, the largest artifact at 52.7% of its budget, with a denser body encoding (bodies v2) split into hash shards (`presentation/math/bodies/<shard>.json`, a pattern already in the table). It also splits `solutions.js` into per-equation solution modules. Shards do not shrink the mobile bundle, but they let a screen parse only the bodies it renders. A7 sets the shard budget, adds a pattern for the solution modules, and moves the mobile imports and their `mobileBundled` rows together.
