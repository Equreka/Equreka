# 0007 — Generated prefixed units

Date: 2026-09-28 · Status: accepted

## Context

ADR 0003 backlog item 3. Before this change the corpus held 13 hand-written prefixed units (centimetre, kilometre, micrometre, millimetre, nanometre, microsecond, millisecond, nanosecond, milliampere, milligram, microgram, millilitre, millimole). Each one was a `prefixOf` file that restated its base's `unitOf`, `system` and `categories` by hand. That does not scale to the SI prefix grid. It also drifted: 12 of the 13 said `system: 'si-derived'` (millilitre said `other`), even the prefixed forms of SI base units, and kilometre carried a copy of the metre's description.

The audit claimed that all 13 descriptions were copies of the base prose. A file-by-file check found that only kilometre's was. The other 12 had prose of their own. Nine of those added nothing beyond what a template states (the prefix and the power of ten), and nanosecond's was wrong ("one millionth" for 10⁻⁹). Three held facts a generator cannot derive: centimetre (the base unit of length in CGS), micrometre (the micron) and microgram (mcg in medicine).

## Decision

1. **Declare on the base.** `unit.prefixes?: ref('prefixes')[]` lists the prefixes a unit takes. `unit.namePlural?: localizedText` holds the lowercase prose plural (`metres`, `hertz`, `pascales`). It is required whenever `prefixes` is non-empty, because generated names and descriptions count in the plural. Authoring the plural avoids an English and Spanish inflection table in code (hertz is invariant, newton → newtons, pascal → pascales).
2. **Expand at build** (`pipeline/prefix-expansion.ts`, stage `expand`, which runs after validation and before integrity). The Astro loader runs the same expansion, so the web builds a page for every unit in the artifact. For each (prefix, base) pair:
   - **Slug:** `<prefix><base>`, so the existing slugs are unchanged.
   - **Name:** the prefix name followed by the lowercased base name.
   - **Plural:** the prefix name followed by the base's plural.
   - **Symbol:** the prefix TeX followed by the base TeX, with a space after a control word.
   - **Copied from the base:** `unitOf`, `system`, `categories`, `branches` and `status`.
   - **Derivation:** `prefixOf: { prefix, base }`. Resolution is the same prefix × base-factor path the hand files used, so no factor moved.
3. **Grammar by locale.** A typed `Record` keyed by every supported locale holds the compounders and describers, so a new locale fails typecheck until its grammar exists.
   - **Spanish stress:** `metro` compounds are esdrújulas and stress the prefix's last vowel (kilómetro, milímetro). Every other compound keeps the base's stress (kilogramo, mililitro).
   - **Descriptions** always count in a plural of at least ten. For a multiple, "1 kilometre equals 1000 metres". For a submultiple, "1 metre equals 1000 millimetres". Counts above 10³ are written `$10^{n}$`. Each description ends with one TeX identity, `1\ \mathrm{km} = 10^{3}\ \mathrm{m}`.
   - **Gender-neutral Spanish:** "Múltiplo decimal de la unidad metro…" uses the fixed noun *unidad*, so the template does not depend on the base's grammatical gender (a future *caloría*).
   - **Missing translations:** a locale is emitted only when the prefix, the base name and the base plural all supply it. Otherwise that field falls back to English with the untranslated notice.
   - **Sidecars:** Spanish sidecars supply names for all 20 prefixes and names and plurals for the 15 bases. The RAE spellings *mili*, *ato*, *zeta* and *yota* are used.
4. **Aliases are derived.** Base spelling aliases take the prefix name (meter → kilometer). Notation aliases take the prefix symbol (L → mL). Single-letter ASCII prefix aliases combine with the base symbol (u → um, ug). This reproduces every alias on the deleted files except `micron` and `mcg`.
5. **Overrides.** A hand file with a generated slug is an override if it is authored as `prefixOf` the same pair. The merge uses the raw, pre-default keys of the file:
   - every field the file writes wins;
   - `localizedText` fields merge per locale (the set of these fields is derived from the schema's locale tree);
   - `aliases` are unioned;
   - fields the file omits, including schema defaults such as `system`, keep their generated value.
6. **Errors:**
   - `prefixes` on an affine, prefixed or nonConvertible unit;
   - an unknown or repeated prefix, or one that is not a nonzero power of ten;
   - two pairs that produce the same slug;
   - a hand file with a generated slug that is not that unit's override;
   - a `prefixOf` file for a pair its base does not declare, or under a slug other than `<prefix><base>`.

   A generated unit still passes every later stage. The identity-anchor rule is one example: it rejected `kilolitre`, since 1 kL = 1 m³ duplicates the cubic metre. A prefixed form of a compose base is exempt, as the compose form itself is, because its identity follows from verified operands: the millimole per litre lands on the mole per cubic metre by construction.
7. **Artifact.** Generated units enter the engine slice, the presentation slices, search and catalog-lite. `presentation/units.json` marks them `generated: true`; overrides have their own file and are not marked. The engine-slice shape is unchanged, so `SCHEMA_VERSION` stays 2. The orphan-magnitude warning reads the unexpanded corpus, because a generated unit's `unitOf` is copied from its base and is not an independent use.
8. **UI.** Generated units render like any other unit and get no badge. The draft badge follows the status copied from the base. Every prefixed unit's page has the line "Derived from <base> with the SI prefix <prefix>", which links to both on web and mobile. The shared `tParts` helper in `@equreka/core/i18n` splits the localized template so each platform can insert its own links.

## Prefixes authored

| Base | Prefixes |
| --- | --- |
| metre, litre | femto pico nano micro milli centi deci deca hecto kilo mega giga tera (litre without kilo) |
| gram | the same minus kilo (`kilogram` is the SI anchor) |
| pascal | femto … milli, hecto, kilo … tera (hPa is the meteorological unit) |
| second, ampere, mole, joule, watt, volt, hertz, newton, ohm, farad, coulomb | femto pico nano micro milli kilo mega giga tera |

The non-3n prefixes centi, deci, deca and hecto go only on metre, gram and litre. This is the km–hm–dam–m–dm–cm–mm ladder taught in Spanish-language schools. On the coherent derived units those prefixes are not in real use (decafarad, centijoule). Kelvin and candela take no prefixes.

## Consequences

- Units: 77 files became 67 files plus 143 generated units, 210 in total (146 prefixed units: 143 generated and 3 hand overrides). Of the 13 former hand files, 10 were deleted and 3 are kept as overrides (centimetre, micrometre, microgram, each for knowledge the generator cannot derive: the CGS base unit, the micron, the medical `mcg`).
- Pages: the web build went from 292 to 582 pages. 266 are the 133 net new units (77 → 210) in two locales; the other 24 are the 12 branch pages from the concurrent branches taxonomy (ADR 0003 item 9), also in two locales. All 13 slugs resolve to byte-identical factors, offsets, exactness, dimensions and symbols (`src/__tests__/fixtures/prefixed-units-baseline.json`, captured from the pre-change build), and the 556-test engine golden suite is unchanged.
- Engine-slice `system` changed for the 10 prefixed forms of SI base units, from `si-derived` to `si`, because they now copy it from their base. Kilometre is a decimal multiple of an SI base unit, not a coherent derived unit.
- Branches follow the base: nanometre and every other generated unit copy `branches` from their base (metre → `mechanics`). A hand override file adds a different branch where wanted, such as `optics-and-photometry` for nanometre.
- The orphan-magnitude warning now also lists `electric-current` and `substance`. Before, only the deleted milliampere and millimole files kept them off the list. Authoring their `externalIds` clears them.
- Size budgets hold with wide margin (`emit.ts` and the PWA integration enforce them): `engine.json` 96 KB of 500 KB, each search index about 310-320 KB of 1 MB, PWA precache manifest 1771 KiB of 6144 KiB. `presentation/units.json` (386 KB) has no budget.
- Adding a prefixed unit is a one-word edit to its base, and correcting a base now fixes every prefixed form of it.
