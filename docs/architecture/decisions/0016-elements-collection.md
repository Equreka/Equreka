# 0016 — The `elements` collection

Date: 2026-11-01 · Status: accepted

## Context

The content program (track E of the program plan) adds a periodic table: one entry per chemical element, with rich, sourced data, a table page and an element page on web and mobile. The existing collections do not fit an element:

- **Its data is a set of independently sourced measurements.** An element carries an atomic weight, an electron configuration, a list of ionization energies, a density, a melting and a boiling point, and a standard state. Each comes from a different evaluation (CIAAW, NIST, thermochemical tables) and some are calculated or extrapolated rather than measured. A constant carries one `value` and one `source`; an element needs a source per value.
- **Its place in the table is a function of its atomic number.** Period, group, block and grid cell follow from Z. Authored by hand, 118 positions would drift from the numbers they derive from.
- **Group 3 is unsettled.** The IUPAC periodic table page (read 2026-11-01) says an IUPAC project (2015-039-2-200) was initiated to decide whether group 3 is Sc, Y, Lu, Lr or Sc, Y, La, Ac, and reports no outcome. It states that IUPAC has no recommendation for a specific form of the table, and that the lanthanoids run from La to Lu and the actinoids from Ac to Lr, fifteen elements each. Its own table, dated 4 May 2022, is the conventional long form.
- **The pages come later.** This change lands the schema, the pipeline and a seed (track steps E1 to E3); the web pages (E5) and the mobile screens (E6) follow in their own changes. Every surface enumerates collections through `@equreka/core/collections`, so registering a collection there makes web and mobile list it, search it and route to it.

## Decision

### Sourced data types

`packages/schema/src/common.ts` gains generic types, reusable by any collection (the planned exercises collection takes `quantity` data):

- `quantity`: `{ value, unit, uncertainty? }`. `value` and `uncertainty` are decimal strings (ADR 0002); `unit` is a units ref.
- `sourcedValue`: a sourced pure number, `{ value, uncertainty?, estimated, note?, source }`.
- `sourcedQuantity`: a `quantity` with the same provenance, `{ value, unit, uncertainty?, estimated, note?, source }`.
- `sourcedDatum(schema)`: provenance around a value that is not a number (an electron configuration, a state of matter).

The provenance fields mean:

- `source` is the existing `valueSource`, `{ name, url?, ref?, via? }`, and is required: a value without a citation is not authored. `via`, added here, records the page a value was read from when that page is not the cited work (see *Sources*).
- `estimated` (default `false`) repeats the source's own flag on a value it does not give as an evaluated measurement. The NIST Atomic Spectra Database marks such values in its output: parentheses for an ab initio value, brackets for one obtained by interpolation, extrapolation or another semi-empirical procedure. Both set `estimated: true`, and `source.ref` says which. The flag records the source's statement; an author never estimates a value.
- `note` is `localizedText`. It qualifies a datum for readers (conditions other than the standard ones, an allotrope) and is gated by locale completeness like every localized field (ADR 0012): the locale tree derives its positions from the schema, so `boilingPoint.note`, `ionizationEnergies.<n>.note` and `atomicWeight.abridged.note` need their Spanish without any change to the stage.

### The element entity

`element` extends `entityBase` (name, description, categories, branches, aliases, references, status, external ids, text sources) with:

| Field | Shape | Contract |
| --- | --- | --- |
| `symbol` | `'He'` | One capital and up to two lowercase letters, transformed to the shared symbol shape `{ tex: '\mathrm{He}', text: 'He' }`, so math rendering, presentation (`symbolTex`, `symbolText`) and search treat it like any other symbol. |
| `atomicNumber` | integer string | 1 to 118 (`MAX_ATOMIC_NUMBER`): the seventh period ends at oganesson, and no position is defined beyond it. |
| `atomicWeight` | union on `kind` | `value` (with its required `uncertainty`), `interval` (`low`, `high`) or `mass-number` (`massNumber`), each with its `source`; `value` and `interval` take an optional `abridged` sourced value. |
| `electronConfiguration` | `sourcedDatum(string)` | Ground state in plain notation (below). |
| `ionizationEnergies` | record of `sourcedQuantity` | Keyed by ionization number n, the energy that removes the n-th electron. |
| `paulingElectronegativity` | `sourcedValue` | Pauling scale. A second scale gets its own field. |
| `covalentRadius`, `density`, `meltingPoint`, `boilingPoint` | `sourcedQuantity` | `density` at 298.15 K and 101.325 kPa; `meltingPoint` and `boilingPoint` at 101.325 kPa; otherwise a `note` states the conditions. |
| `standardState` | `sourcedDatum('solid' \| 'liquid' \| 'gas')` | At 298.15 K. |

Every property except the atomic weight is optional: a value that no cited source gives is omitted, never filled in. The atomic weight is required because one of its three forms exists for every element.

- **Atomic weight.** CIAAW states standard atomic weights in three forms: one value with an uncertainty, an interval `[low, high]` for the elements whose isotopic composition varies across normal materials, and nothing for an element without a characteristic terrestrial isotopic composition, for which the IUPAC table prints in brackets the mass number of the nuclide with the longest confirmed half-life. The union mirrors them. `abridged` is CIAAW's abridged value with its uncertainty (five significant figures where the variability allows), the figure a table cell prints; an interval has no single figure of its own.
- **Electron configuration.** Plain notation, not TeX: an optional noble-gas core (`[He]`, `[Ne]`, `[Ar]`, `[Kr]`, `[Xe]`, `[Rn]`) and then subshells written shell, letter, count (`[He] 2s2 2p4`, `1s1`), separated by single spaces. `parseElectronConfiguration` in `@equreka/content/periodic-table` reads it: a subshell exists only for n > l, holds 1 to 2(2l + 1) electrons, appears once, and never repeats one its core already holds. Each core's electron count is derived from the subshells it stands for, never typed. TeX would render but could not be checked; this grammar can, and a page formats the superscripts from the parsed form.
- **Field names.** `paulingElectronegativity`, not `electronegativity`, so the scale is in the name and a second scale is a second field rather than a rename.

### Derived position

`periodicPosition(z)` in `@equreka/content/periodic-table` is pure and platform-free (the web reads YAML through the Astro loader and needs it; mobile reads it from the artifact). It returns `{ period, group, block, row, column }`:

- **The grid is the conventional long form, with the series the IUPAC page defines.** Rows 1 to 7 are the periods, and in the main body `column` equals `group`. Rows 8 and 9 hold the two fifteen-element series the IUPAC page names, the lanthanoids La–Lu (57–71) and the actinoids Ac–Lr (89–103), fifteen cells each from column 3 in atomic-number order (`F_ROWS`, `F_ROW_FIRST_COLUMN`). The series stand for the group 3 cells of periods 6 and 7, which no element occupies in the main body.
- **Group 3 is Sc and Y only.** All thirty series members have `group: null`: the table prints them apart from the numbered groups, and which of them continue group 3 is the question the IUPAC project left open.
- **`block` follows the filling order, the grid follows the series.** `block` is the letter of the subshell the Madelung order fills last, so La–Yb and Ac–No are f-block and Lu and Lr are d-block. Lu and Lr are therefore d-block cells drawn in the f rows (column 17), with no group. The two fields answer different questions, and neither is bent to fit the other.
- **Helium** is s-block by its two 1s electrons and sits in group 18 with the other noble gases.

The test checks every Z from 1 to 118 against an independent derivation: the Madelung filling order (1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p). The block is the letter of the subshell the last electron enters, and the period is the shell of the latest s subshell. The group counts that subshell's electrons after the groups before it, except for series members: an element whose last electron enters an f subshell, or the first d electron after a full f subshell (Lu, Lr), has none. The test also asserts that the grid holds one element per cell and leaves only the expected gaps. It counts 14 s, 36 p, 40 d and 28 f elements, and checks that exactly the thirty series members have no group, in rows 8 and 9 and columns 3 to 17. Group 3 is [21, 39], and group 18 holds the seven noble gases.

The presentation slice carries the result as `position` on every element, computed at emit time.

### Stage `elements`

`pipeline/elements.ts` runs after `anchors`, because it needs resolved units. It reports, as errors:

- **Uniqueness.** Two elements share an atomic number, or a symbol.
- **Configuration.** The configuration does not parse, or its electron count, cores expanded, differs from `atomicNumber`.
- **Atomic weight.** An interval whose `low` is not below its `high`, compared as exact decimals.
- **Units.** A property's unit is unknown, has no conversion (a nonConvertible unit), or does not have the dimension of the property's magnitude: `energy` for ionization energies, `length` for the covalent radius, `density`, and `thermodynamic-temperature` for the melting and boiling points. The dimension comes from the magnitude in the corpus, whose vector is itself verified (ADR 0003), not from a vector typed into the stage.
- **Ionization energies.** A key above `atomicNumber` (there is no such electron), or a value not above the previous one: removing each further electron from an ever more positive ion costs more, so successive ionization energies strictly increase. This rule is not in the program plan; it costs nothing and catches a swapped or mistyped value.
- **Phase change.** A boiling point not above the melting point.
- **Standard state.** At 298.15 K a known boiling point at or below it makes the element a gas, a known melting point above it a solid, and both known with the melting point at or below it and the boiling point above it a liquid. An authored state that contradicts the implied one is an error; an element whose points do not decide its state (one that sublimes, or a melting point below 298.15 K with no boiling point) is not judged.

Every comparison converts both sides to SI base units with the resolved factor and offset, as exact rationals, so a melting point in °C compares correctly with a boiling point in K and an ionization energy in eV with one in J. `ratCompare` joins `rational.ts` for it.

### Registration: built, not yet surfaced

- `elements` joins `COLLECTIONS` in `@equreka/schema/collections`, `collectionSchemas` and the corpus. Loading, validation, sidecars, locale completeness, integrity (taxonomy refs), TeX lint and math rendering cover it with no collection-specific code, and the build emits `presentation/elements.json` and the two editor schemas.
- `UNSURFACED_COLLECTIONS = ['elements']` in the same module lists the collections the pipeline builds before any page renders them. `SURFACED_COLLECTIONS` is the rest.
- **The user-facing registry holds only surfaced collections.** `@equreka/core/collections` keys `COLLECTION_INFO`, every order and `isCollectionName` on `SurfacedCollection`. A web or mobile build therefore lists no element, opens no route for one, and treats an `elements` deep link or artifact row as an unknown collection, which every consumer already handles. Registering elements there now would have put a group of unlinked rows, labelled with an untranslated collection name, in web search, and sent mobile search and deep links to a not-found screen.
- **Search is built and switched off with the surface.** `searchDocuments` iterates `SURFACED_COLLECTIONS` by default. An element's document already carries its symbol (`symbolText`), its localized name, its aliases and its branch names, as a test asserts by building them explicitly; it joins `search/<locale>.json`, catalog-lite and the leads when `elements` leaves `UNSURFACED_COLLECTIONS`. The search index carries no row that leads nowhere.
- **Not mobile-bundled.** A new budget row, `presentation/<unsurfaced>.json` (2 MiB, `mobileBundled: false`), classifies the slice, and `<whole>` now matches surfaced unsharded collections only. The mobile test that ties `mobileBundled` to the app's `require`s keeps holding, and it is what forces the flip: when E6 surfaces the collection, the file falls under `<whole>` (or `<sharded>`), becomes mobile-bundled, and the test fails until `artifact.ts` reads it.
- **The `periodic-table` branch is surfaced** (branches are), with an encyclopedic description in both languages. Until the element pages land, its page lists no entries, because its only members are unsurfaced; the build's empty-branch warning stays quiet because the corpus does file elements under it.

Surfacing the collection (E5 and E6) is one change: drop `elements` from `UNSURFACED_COLLECTIONS`; add its `COLLECTION_INFO` row, surface orders and the `collection.elements` label in both dictionaries; add the web content collection, routes and `entryHref`; add the mobile `PresentationSlices` type and loader; and move the slice to its sharded rows (next section).

### Size and sharding

Measured with the seed of ten elements, `presentation/elements.json` is 76,798 bytes (13,626 gzipped), about 7.7 KB per element. The light elements carry every one of their ionization energies, each with its own source, so the per-element cost falls for heavy elements, whose NIST lists are shorter, but the descriptions and properties stay. A full table of 118 projects to roughly 0.8 to 1 MB, half of the 2 MiB whole-slice cap. The table screen needs only the symbol, name, atomic number, position and perhaps the abridged atomic weight of each element, a few tens of kilobytes, so by the reasoning of ADR 0015 the slice should be sharded, with those as its index fields, once a screen reads it. That decision lands with the mobile reader (E6): `PRESENTATION_SHARDS` types the mobile loader table as a tuple of exactly `count` loaders, so sharding now would force mobile code for a collection the app does not show. Until then the slice is whole and bundled nowhere.

### Sources

Values are cited one by one, from the source that was read:

| Property | Source used by the seed |
| --- | --- |
| atomic weight, abridged value | CIAAW, Standard Atomic Weights 2024 and Abridged Standard Atomic Weights 2024 |
| electron configuration, ionization energies | NIST Atomic Spectra Database 5.12, ground states and ionization energies |
| boiling point, density, standard state of the gases | NIST Chemistry WebBook, SRD 69, Thermophysical Properties of Fluid Systems: the normal boiling point and the isothermal data at 298.15 K and 0.101325 MPa of each element's reference equation of state |
| melting and boiling points, standard state of Li, Be and B | NIST-JANAF Thermochemical Tables, 4th ed. (Chase 1998), reference-state tables, whose standard pressure is 1 bar; the `note` says so |
| standard state of C | NIST Chemistry WebBook, condensed-phase data (the standard entropy of the solid at 1 bar) |
| covalent radius | Wikidata statements of property P14937 (covalent radius), each referencing Cordero et al., *Covalent radii revisited*, Dalton Trans. 2008 (21), 2832–2838, doi:10.1039/B801115J, cited as that work `via` the Wikidata statement |
| Pauling electronegativity | Wikidata statements of property P1108 that cite a primary or standard source; none of H–Ne has one (below) |

The program plan named CRC, Allred (1961) for Pauling electronegativities and Cordero et al. (2008) for covalent radii. None of the three could be read: the CRC Handbook online answers "not within the network of a subscribing institution", the publishers' pages of Allred (1961) and Cordero et al. (2008) answered with HTTP 403, and OpenAlex lists Cordero et al. as closed access. The NIST compilations above are primary evaluations of the CRC properties and can be read and checked. For the two properties only those papers give, the owner chose Wikidata statements that cite their primary or standard source, read value by value:

- **`valueSource.via`.** A value read from a page that is not the cited work records that page beside the work: `{ name, url, ref?, via: { name, url } }`, with `name`, `url` and `ref` describing the cited work and `via` the Wikidata statement it was read from (`https://www.wikidata.org/wiki/Q<id>#P<property>`). A reader therefore sees the value is second-hand and where to check both ends. `via` is optional and changes no existing entry.
- **Which statements qualify.** Only a statement whose reference names a primary or standard source (a DOI or item for Allred 1961, Cordero 2008, CRC, Lange's) is taken. A statement with no reference, or referenced only to *imported from Wikipedia* or to a secondary web page, is skipped and the field omitted.
- **Covalent radius.** H 31, He 28, Li 128, Be 96, B 84, N 71, O 66, F 57 and Ne 58 pm, each from the statement referencing Cordero et al. (2008). Their abstract says the radii of the noble gases were interpolated for lack of structural data, so He and Ne carry `estimated: true`. Carbon is omitted. Its only referenced statement gives 73 pm with no qualifier, while Cordero et al. give carbon several radii by hybridization, and an unqualified one cannot be stated faithfully. An unreferenced statement gives 76 pm.
- **Pauling electronegativity** is omitted for all ten. None of the Wikidata P1108 statements carries a scale qualifier. Eight have no reference. Carbon (2.55) and oxygen (3.44) are referenced only to the Royal Society of Chemistry periodic-table pages, a secondary compilation that credits CRC for its data as a whole. Neon has no statement.

A predicted value for a superheavy element (Z ≥ 104) enters only with its citation (the IUPAC/IUPAP Joint Working Party reports for discovery, a published calculation for a property) and with `estimated: true`.

### Versions

- **`SCHEMA_VERSION` stays 5.** It tracks the engine-slice contract (ADR 0010, 0014, 0015). Elements are presentation-only; `engine.json` is byte-identical.
- **`CONTENT_PIPELINE_VERSION` stays 7.** It invalidates the verification and math-render caches. Verification is untouched, the math cache is keyed by TeX (new bodies are added, none changes), and the `elements` stage and the derived positions run uncached at check and emit time.

### Roadmap

`roadmap.yaml` accepts the elements track's step ids (`E1`, …) beside the content waves, and E1 lists this change's entries: the branch and the ten elements. The roadmap tooling knows `elements` with a 200-word description floor, the floor of magnitudes.

## Results

Built against the same code with and without the new content (all sizes in bytes):

| Artifact | Before | After |
| --- | --- | --- |
| `presentation/elements.json` | — | 76,798 (3.7% of 2 MiB), not mobile-bundled |
| `presentation/branches.json` | 79,927 | 83,248 (the `periodic-table` branch) |
| math body shards, 13 of 16 | 797,727 | 810,316 (+12,589: the symbols and the math of the new descriptions) |
| `search/en.json`, `search/es.json` | 676,093 / 710,560 | 676,879 / 711,345 (the branch only) |
| catalog-lite and leads, both locales | 1,283,323 | 1,284,761 (the branch only) |
| Mobile transfer, one stream | 1,881,056 | 1,884,397 (59.9% of 3 MiB) |
| Mobile storage, raw | 7,619,269 | 7,636,618 (45.5% of 16 MiB) |

The editor schemas `schemas/elements.schema.json` and `schemas/elements.locale.schema.json` are new and build-only, and `meta.json` gains the `elements` count. Every other artifact is byte-identical.

## Alternatives considered

- **Register `elements` in the user-facing registry now.** Web search would group unlinked element rows under an untranslated label, mobile search and `equreka://entry/elements/<slug>` would land on not-found, and the mobile bundle would carry a slice no screen reads.
- **A separate pipeline beside `COLLECTIONS`.** Loading, sidecars, locale completeness, TeX lint and math rendering are generic over `COLLECTIONS`; a parallel path would duplicate each of them, and the UI changes would have to merge them back.
- **Ship search rows now and filter them in the apps.** It spends the search budget on rows nobody can open and needs filtering code in both apps that the surfacing change would delete.
- **Author period, group and block.** 118 hand-typed positions next to the atomic number they follow from, with nothing to catch a drift.
- **Group 3 as Sc, Y, Lu, Lr.** Lu and Lr would move into the main body under Y, leaving fourteen-cell f rows of La–Yb and Ac–No. It settles the question the IUPAC project left open in one direction.
- **Group 3 as Sc, Y, La, Ac.** La and Ac would move under Y, leaving fourteen-cell f rows of Ce–Lu and Th–Lr. It settles the same question in the other direction.
- **Why the fifteen-cell form.** It is the conventional long form of the table IUPAC publishes, it keeps whole each series the IUPAC page defines (La–Lu, Ac–Lr), and it takes no side in the group 3 question, on which IUPAC recommends no form. Either alternative is a later change to `periodicPosition` alone: the data authors no position, and `block` already follows the filling order whatever the layout.
- **Electron configuration in TeX.** It renders, but the electron count cannot be checked without a grammar, and a grammar of TeX is the wrong layer.
- **Dimension vectors typed into the stage.** Hand-typed vectors are the class of error ADR 0003 removed; the stage reads the verified vectors of the corpus magnitudes instead.
- **CRC values read from a secondary page.** The Royal Society of Chemistry's periodic table credits the CRC Handbook among several sources for its data as a whole, not value by value, so a value read there cannot be cited to CRC honestly.

## Consequences

- An element file states each value with its source and nothing else; the build checks the rest. Adding the remaining 108 elements (track steps E7 onward, by period) needs content only.
- The `periodic-table` branch page lists nothing until the element pages land.
- Surfacing the collection is a single, test-guarded change (see *Registration*), and sharding the slice belongs to it.
- Covalent radii come second-hand from Wikidata statements citing Cordero et al. (2008), marked as such through `via`. Carbon's radius and every Pauling electronegativity stay empty until a statement, or a readable source, names a primary work for them.
- A new generic type set (`quantity`, `sourcedValue`, `sourcedQuantity`) is available to the exercises collection.
