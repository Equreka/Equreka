# 0015 — Presentation shards and a mobile transfer budget

Date: 2026-10-10 · Status: accepted

## Context

Measured on `main` after content wave W11 (`7a2ea64`, `pnpm --filter @equreka/content build`):

| Artifact | Raw bytes | gzip | Share of budget |
| --- | --- | --- | --- |
| `presentation/equations.json` | 1,524,702 | 431,221 | 72.7% of 2 MiB |
| `presentation/units.json` | 941,006 | 249,703 | 44.9% of 2 MiB |
| Mobile-bundled set, 31 files | 5,037,393 | 1,209,185 as one stream, 1,222,017 summed per file | 60.1% of 8 MiB raw |

- **Equations break their budget before milestone 2.** The slice grows about 150 KiB per content wave and 169 equations remain in W12–W17 (`docs/content/roadmap.yaml`), with university descriptions longer than school ones. It passes the runbook's 90% stop line around W14 and fails the build around W15.
- **Prose is what the slices carry, and almost nothing reads it in bulk.** Descriptions and references are 79.8% of `equations.json` and 80.4% of `units.json`. The fields a list renders (name, symbol, categories, branches) are 2.9% and 6.1%.
- **Mobile parses every slice whole.** `getPresentation(collection)` evaluates the collection's file, so the equations browse list parsed 1.45 MiB to show names. On-device search read the description lead of every entry from every presentation slice, so the first search parsed all nine slices, 3,410,174 bytes, to index 480 characters per entry.
- **The mobile budget measured the wrong cost.** `MOBILE_BUNDLE_BUDGET_BYTES` (8 MiB) capped raw bytes. OTA updates and store installs download the bundle compressed, so the raw total overstates the download about fourfold. Raw bytes still measure what the installed bundle stores. The raw total was projected at about 6.3 MiB at the end of milestone 1 plus the planned elements and exercises collections, close enough to 8 MiB to force a decision on a figure that does not describe the download.

## Decision

### Index and hash shards

`PRESENTATION_SHARDS` in `@equreka/content/presentation-shards` (platform-free, read by the pipeline, the web build and the app) lists each sharded collection with a shard `count` and its `indexFields`:

- `presentation/<collection>.json` becomes the collection's **index**: slug → the index fields only.
- `presentation/<collection>/<shard>.json`, `<shard>` = `00` … , holds every other field of each entry whose slug hashes to that shard: slug → detail fields.
- Every slug is in the index and in exactly one shard. An entry is `{ ...indexRow, ...shardRow }`; the split is disjoint. Every shard file is emitted, empty ones included, so the mobile loader table always matches the files on disk.
- A field is a detail field unless it is listed in `indexFields`. A new schema field therefore lands in the shards and never grows the index silently.

**Hash.** `presentationShardOf(collection, slug)` is `shardOf(slug, count)`: the low bits of the standard 32-bit FNV-1a hash of the slug's UTF-8 bytes. It is the function `mathShardOf` already used (ADR 0010), moved with `fnv1a32` into `packages/content/src/shard-hash.ts`; `mathShardOf` and every math shard are unchanged. Assignment is a pure function of the slug, so it is stable across builds, no manifest ships, and a screen holding a slug evaluates exactly one shard. Doubling a count keeps the assignment nested: a slug in shard `i` of `2n` was in shard `i mod n`.

Shards are per collection and keyed by slug, unlike the math bodies, which share one hash space keyed by TeX. A screen that opens an entry holds its collection and slug, and the collections differ in size by two orders of magnitude, so each collection gets the count its size needs.

### The split, from the consumers

Every reader of `presentation/<collection>.json` was audited:

| Consumer | Reads | After |
| --- | --- | --- |
| Mobile browse, category and branch lists (`listEntries`, `branchSections*`, `entriesInBranch`) | name, symbolText, categories, branches | index |
| Mobile cross-references (`getSummary`: equation terms, related units, a unit's magnitudes, deep-link titles) | name, symbolText | index |
| Mobile calculator unit labels (`printedUnit`) | a unit's symbolTex, symbolText | index |
| Mobile favorites | catalog-lite only | unchanged |
| Mobile search | catalog-lite plus each entry's description lead | catalog-lite plus `search/leads.<locale>.json` |
| Mobile entry screen, calculator expression and solved form | the whole entry | index row + one shard row (`getEntity`) |
| Mobile paths list | path description, level, step ids | `paths` stays whole |
| Web pages | the Astro content loader (YAML), not the artifact | unchanged |
| Web build: offline reader and learning-path payloads, unit tests | whole entries | reassembled with `readPresentationSlice` |
| Web path page | `paths.json` | unchanged |

Hence:

| Collection | `count` | `indexFields` |
| --- | --- | --- |
| `equations` | 64 | `name`, `categories`, `branches` |
| `units` | 16 | `name`, `symbolTex`, `symbolText`, `categories`, `branches` |

Descriptions, references, text sources, aliases, external ids, status, terms, solutions and expressions all ship in the shards.

**Which collections.** Equations break their budget before milestone 2 and units is the second-largest slice, parsed by every units list; both are sharded. The other slices are measured not to cross their budget before milestone 2: `magnitudes.json` 445,951 bytes (21.3%, one magnitude left on the roadmap), `paths.json` 196,403 (9.4%), `constants.json` 157,573 (7.5%), and the taxonomy, prefix and variable slices are smaller still. `paths` would also lose by sharding: its list card renders each path's description and step count. Sharding another collection is one entry in `PRESENTATION_SHARDS` plus its mobile loader table.

**Counts.** Measured on the W11 corpus, detail bytes per shard:

| Collection | Count | Mean | Largest | Entries per shard |
| --- | --- | --- | --- | --- |
| equations (268) | 16 | 92,976 | 120,626 | 13–21 |
| | 32 | 46,489 | 75,477 | 3–14 |
| | **64** | 23,246 | 50,644 | 0–9 |
| units (336) | 8 | 111,104 | 169,008 | 33–60 |
| | **16** | 55,553 | 92,400 | 15–35 |
| | 32 | 27,778 | 66,217 | 4–24 |

At milestone 2 the equations' detail bytes grow about 1.8 times (169 more entries, longer prose). At 32 shards the largest would reach about 115–120 KB, the 90% stop line of a 128 KiB shard; at 64 it lands near 65–70 KB, about half the cap. Units are complete, and at 16 the largest shard sits at 70.5% of its budget.

The low k bits of FNV-1a depend only on the low k bits of each input byte, since the multiply carries bits upward only. Measured as χ² of entries per shard (degrees of freedom = count − 1): equations 7.5 at 16, 26.9 at 32, 59.6 at 64; units 19.5 at 16, but 54.7 at 32 (p ≈ 0.005). Units stay at 16, where the spread is ordinary. The math shards already depend on these bits, so the reduction stays the same rather than introducing a second one.

### Budgets

| Pattern | Max (raw) | Protects |
| --- | --- | --- |
| `presentation/<whole>.json` | 2 MiB | an unsharded collection's one parse; nearing it means sharding the collection |
| `presentation/<sharded>.json` | 256 KiB | the index every list of the collection parses; growth beyond the entry count means a heavy field joined `indexFields` |
| `presentation/<sharded>/<shard>.json` | 128 KiB each | the one shard parsed when an entry opens; nearing it means doubling the count |
| `search/leads.<locale>.json` | 512 KiB | the search tab's first build of its index |

`<sharded>` matches a collection in `PRESENTATION_SHARDS` and `<whole>` any other, so every emitted file still classifies under exactly one row. The 128 KiB shard cap matches the math shards (ADR 0010). The index cap leaves the equations index at about 28% at milestone 2 (about 71 KB) and still fails within a wave if a description joined it.

### Search leads

`search/leads.<locale>.json` maps each SearchDocument id (`<collection>:<slug>`) to the lead `searchLeadOf` indexes, entries without one omitted. With catalog-lite it holds every field of the locale's SearchDocuments, so the app builds its MiniSearch index from those two files and reads no presentation slice or shard. ADR 0002 still holds: the app tokenizes on device, and no serialized index ships. The on-device index still serializes to the web's `search/<locale>.json`; a pipeline test rebuilds it from catalog-lite and the leads, and the existing mobile test compares the device's index.

The leads cost 247,346 (en) and 267,207 (es) raw bytes, about 133 KiB gzipped. They duplicate the first paragraph of descriptions that also ship in full. The other places for them cost more: in the index, every list would parse both locales' leads; in catalog-lite, the web would download them on search focus next to an index that already holds them.

### Mobile reading

- `getPresentation(collection)` returns index rows. Its type, `PresentationIndexRow`, picks `indexFields` for a sharded collection, so a list that reads a detail field does not compile.
- `getPresentationShard(collection, shard)` reads one shard through a table of literal `require`s, typed as a tuple of exactly `count` loaders, as `getMathBody` does. Metro bundles only literal specifiers.
- `getEntity(collection, slug)` in `entities/content/lookup.ts` merges an index row with its shard row and memoizes the result, so an entry keeps its identity across renders and each shard is evaluated once. The entry screen, the calculator and the solved form use it. Lookups ignore prototype keys, since a deep-link slug is untrusted input.

### Web

The web build reads every entry. `readPresentationSlice(collection, readJson)` reassembles a sharded slice from its index and every shard. `equreka-assets.ts` reads it through `readPresentation`, so the reader, converter and search payloads are unchanged. The whole web `dist/` (2,418 files) is byte-identical to the build before this change.

### Mobile transfer budget

- **`MOBILE_TRANSFER_BUDGET_BYTES` = 3 MiB.** It caps the gzip size (zlib default level) of the mobile-bundled files concatenated in path order, as one stream. The bundle downloads as one compressed file, so a single stream approximates the download. A sum of per-file gzip sizes would charge every shard its own compression restart. Measured on equations, the whole file gzips to 431,221 bytes, and its 64 shards to 512,499 when summed per file. Under such a sum, the remedy for a large shard, doubling the count, would itself spend budget.
- **`MOBILE_STORAGE_CEILING_BYTES` = 16 MiB** raw is the backstop for what the installed bundle stores.
- Both warn from `BUDGET_WARN_RATIO` (80%) and fail the build over the cap. Per-file caps stay on raw bytes, because each parse pays the uncompressed size (ADR 0010).

**Why 3 MiB.** The set measures 1,379,055 bytes (1.32 MiB) after this change. The equations' presentation, leads and catalog rows add about 2.1 KB of transfer per equation (measured by removing them from the stream). With math bodies and the engine and solutions entries, that comes to about 2.5 KB. With longer prose, the 169 remaining equations add about 0.45 MiB, so milestone 2 lands near 1.8 MiB, 59% of the budget. The planned elements collection, at the density of magnitudes, adds about 0.2 MiB. An exercises collection of a few hundred entries adds about 0.4 MiB. Together they bring the set to about 2.4 MiB, the 80% warning. A warning at that point is intended. Once those collections land, whether the app keeps bundling all content becomes a real question (*Alternatives*, downloadable packs), and the warning raises it while a fifth of the budget is still free. A 2 MiB budget would warn during milestone 1. A 4 MiB budget would stay silent past the point where that question is due.

The figure is a JSON-level proxy. The bundle carries Hermes bytecode, which encodes the same strings in a deduplicated table. Re-measure with `expo export --platform android` when the warning first fires.

### Versions

- **`SCHEMA_VERSION` stays 5.** It tracks the engine-slice contract (ADR 0010, 0014), and `engine.json` is byte-identical.
- **`CONTENT_PIPELINE_VERSION` stays 5.** It invalidates the verification and math render caches, and neither cached value changed: sharding, the index and the leads are computed at emit time and never cached. A cold build and a warm build produce identical bytes.
- **No presentation version is added.** As ADR 0010 found, the slices have no external consumer: the web reads them at build, and the app compiles them into the same bundle as the code that reads them, so reader and layout cannot drift apart.

## Results

All sizes in bytes.

| Artifact | Before | After |
| --- | --- | --- |
| `presentation/equations.json` | 1,524,702 (72.7% of 2 MiB) | index 43,655 (16.7% of 256 KiB) |
| `presentation/equations/<shard>.json` | — | 64 files, 1,487,714 in total; largest `13` 50,644 (38.6% of 128 KiB); `07` empty |
| `presentation/units.json` | 941,006 (44.9% of 2 MiB) | index 57,493 (21.9% of 256 KiB) |
| `presentation/units/<shard>.json` | — | 16 files, 888,849 in total; largest `0d` 92,400 (70.5%), smallest `0c` 34,354 |
| `search/leads.<locale>.json` | — | en 247,346 (47.2% of 512 KiB), es 267,207 (51.0%) |
| Mobile-bundled files | 31 | 113 |
| Mobile transfer, one stream | 1,209,185 | 1,379,055 (43.8% of 3 MiB) |
| Mobile storage, raw | 5,037,393 (60.1% of 8 MiB) | 5,563,949 (33.2% of 16 MiB) |

What a mobile screen parses from the artifact on first use:

| Screen | Before | After |
| --- | --- | --- |
| Equations browse list | 1,524,702 | 43,655 |
| Units browse list | 941,006 | 57,493 |
| An equation's entry (equations data) | 1,524,702 | index plus one shard, at most 94,299 |
| First search (en) | 3,620,381 (catalog-lite and all nine slices) | 457,553 (catalog-lite and leads) |

Every other file of the content `dist/` is byte-identical to the build before the change, and each reassembled slice serializes to exactly the bytes of the old whole slice.

## Alternatives considered

- **Downloadable content packs.** Ship a small bundle and fetch collections or locales on demand. That is the only option that shrinks the download, but it breaks the offline-first install (ADR 0002): a fresh install without a network would lack content. It needs hosting, pack versioning against the app, integrity checks and partial-state UI. At 1.32 MiB of content transfer, it solves a problem the app does not have yet. The 3 MiB budget is sized to warn when it might.
- **Raising the limits.** A 4 MiB slice budget and a larger raw mobile budget keep the build green. But every list still parses every description, about 2.5 MiB for equations by milestone 2, and the slope stays the same. The budget exists to bound that parse, not only the bytes.
- **Splitting per locale** (`presentation/<collection>.<locale>.json`). Half the prose per file for a reader of one locale, but the bundle still carries both locales, so transfer and storage do not move. Lists would still parse every description of their locale, about 1 MiB for equations at milestone 2. Spanish readers would also load the English file for untranslated fallbacks. It does not remove the list-screen cost, which the index does. The two can compose later if per-entry prose ever outgrows a shard.
- **One hash space across all collections** (keyed by `collection:slug`, as the math bodies share one). One table and one count, but small collections would be mixed into large shards, the paths list would lose its descriptions, and a collection's growth would no longer show in its own files.
- **The lead in the index or in catalog-lite.** See *Search leads*.
- **Xor-folded hash bits.** These are more uniform for unit slugs at 32 shards or more, but they would add a second reduction beside the math shards. At the chosen counts the spread is ordinary.
- **Budgeting per-file gzip.** It charges sharding for compression restarts that the bundle does not pay (*Mobile transfer budget*).

## Consequences

- List, browse, category, branch and cross-reference screens parse indexes of 43–57 KB instead of slices of 0.9–1.5 MiB. Opening an entry parses one shard more. Search parses neither the slices nor the shards.
- The raw mobile set grows 0.50 MiB and the transfer 0.16 MiB, almost all of it the search leads.
- Adding entries needs nothing. A shard nearing 80% of its cap means doubling its collection's `count`, extending the mobile loader table (the tuple type fails `tsc` until it has `count` loaders) and updating the golden pins in `presentation-shards.test.ts`. Every entry may move, and nothing else changes.
- A field joins the index only by being added to `indexFields`, once a list needs it. The index budget and the type of `getPresentation` keep the boundary visible.
- Build-time readers of a sharded slice go through `readPresentationSlice`. Reading `presentation/<collection>.json` directly now yields index rows.
- The content-wave runbook reads the transfer and storage lines in place of the old mobile total.
