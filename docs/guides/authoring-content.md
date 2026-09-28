# Authoring content

Content lives in `packages/content/content/<collection>/<slug>.yaml`. The filename is the slug (kebab-case) and is never repeated inside the file. Every file is validated by `@equreka/schema`, cross-checked by the pipeline (`pnpm --filter @equreka/content check`), and compiled into the sharded artifact by `build`. Nothing ships that the pipeline cannot verify.

## Editor setup

Every file starts with a schema header pointing at the JSON Schema the build emits:

```yaml
# yaml-language-server: $schema=../../dist/schemas/units.schema.json
```

Translation sidecars (see *Translations*) point at their collection's sidecar schema instead:

```yaml
# yaml-language-server: $schema=../../dist/schemas/paths.locale.schema.json
```

Run `pnpm --filter @equreka/content build` once so `dist/schemas/*.schema.json` exists; VS Code with the Red Hat YAML extension then validates and autocompletes fields (`.vscode/settings.json` also wires the globs). The schemas are the *input* side of the Zod contract — exactly what you may type. `scripts/quality/yaml-lint.mjs` fails any file whose first line is not the header its kind requires.

## Universal rules

- **Decimal strings.** Every physical value (`value`, `factor`, `offset`, `uncertainty`, rational `num`/`den`, prefix `value`) is a quoted string: `'0.3048'`, `'6.62607015e-34'`, `num: '5'`. Unquoted numbers are rejected by `scripts/quality/yaml-lint.mjs` and would truncate to float64 at parse time (ADR 0002). Values are parsed exactly once, at the engine's float64 boundary.
- **Failsafe parse.** The pipeline parses YAML 1.2 with the failsafe schema: every scalar arrives as a string. Booleans are exactly `true`/`false` (never `yes`/`on`); integers are digit strings; both coerce in the schema.
- **Quoting.** Single quotes or plain scalars for short values. Never double quotes around TeX: `"\mu"` is an illegal YAML escape. Apostrophes inside single quotes are doubled (`'it''s'`), which is why prose uses block scalars instead.
- **Prose.** `description.en` uses a folded block scalar `>-` (or literal `|-` when paragraphs matter). Block scalars carry TeX, `#`, and apostrophes byte-literally. Inline math is `$...$`, display math `$$...$$`; every fragment must pass strict KaTeX at build.
- **Comments.** Only the schema header. Rationale belongs in `description`, sources in `references`, numeric provenance in `toBase.source` (units) or `source` (constants).
- **Localization.** Entity files carry English only: every localized field is `{ en: ... }`. Translations live in one sidecar per locale beside the entity (`<slug>.es.yaml`, see *Translations*); an inline `es:` key is rejected by both yaml-lint and the loader, so each language has exactly one home. A missing translation falls back to English with an untranslated notice.
- **Aliases.** `aliases` feeds the exact-match search lane: US spellings (`meter`), ASCII forms of Greek (`mu`, `ohm`), degree-text forms (`degC`), symbol variants users type (`m/s`, `J/K`), nicknames (`avogadro number`). Lowercase-insensitive; diacritics are folded at index and query time.
- **Editorial status.** Every entity except categories takes `status: 'draft' | 'reviewed'` (default `draft`). `reviewed` asserts that a person checked the entry's numbers against the source it cites; it is not a claim about prose polish. Web and mobile show a subtle *draft* badge on every entry that is not `reviewed`. Set it only in the same change that adds or verifies the citation.
- **External identifiers.** Every entity except categories takes an optional `externalIds: { wikidata?, qudt? }` — `wikidata` is an item QID (`'Q11573'`), `qudt` a `http(s)://qudt.org/...` IRI (`'http://qudt.org/vocab/unit/M'`). The web entry page links them and lists them as `sameAs` in its schema.org JSON-LD. Cite the exact concept: a unit's QID, never its quantity's.

## Collections

### categories

`name`, `description?`, `aliases?`, `order` (nonnegative integer string). Slug is the category id referenced everywhere else.

### magnitudes

`name`, `symbol { tex, text? }`, `symbolAlt?`, `baseUnit` (ref: units), `dimension` (partial vector over `L M T I Th N J A`, omitted keys are 0; `A` is the synthetic angle dimension), `kindOf?` (ref: magnitudes), `nonNegative?`, `categories`, `description?`.

The `dimension` you type is **verified**: the baseUnit must resolve to factor 1, offset 0, and every compose-authored unit of the magnitude must sum to the same vector. A typo in a vector fails the build.

Author a magnitude only for a real quantity kind (ISO/IEC 80000; luminous efficacy is ISO 80000-7), never to give a compound unit somewhere to live — use a magnitude-less compound unit instead (see *units*). The build emits one **orphan-magnitudes warning** listing every magnitude that only its own baseUnit lists, that no constant or equation term uses, and that has no `externalIds`. Clear an entry either by authoring its `externalIds` (a real quantity that simply has one unit so far) or by deleting it and giving the hosted unit an empty `unitOf`.

**Quantity kinds (`kindOf`, ADR 0006).** When a magnitude is a specialization of another quantity kind with the same dimension, name the broader kind: `work.kindOf: 'energy'`, `weight.kindOf: 'force'`. The target must exist, must have an identical dimension vector, and the chain must be acyclic — each is a build error. Check the relation against QUDT's `skos:broader` before authoring it; two kinds that merely share a dimension (pressure and stress are QUDT siblings under force-per-area; torque and energy are unrelated) get **no** `kindOf`. The effect is presentational: a magnitude's converter and unit table default to units whose `unitOf` lists the magnitude, one of its ancestors, or one of its descendants; sibling and unrelated same-dimension units stay reachable behind the converter's *show all with this dimension* toggle. `kindOf` never changes a conversion factor.

### units

`name`, `symbol`, `symbolAlt?`, `unitOf` (magnitude refs; all must share a dimension; empty or omitted only with `compose`, see below), `system` (`si | si-derived | imperial | uscs | cgs | other`), `nonConvertible?`, plus **exactly one** derivation form — or none, in the two cases below.

**Form 1 — `toBase`** (linear or affine primitive against the SI-coherent base):

```yaml
toBase:
  factor: '0.45359237'      # decimal string, or { num: '5', den: '9' }
  offset: { num: '45967', den: '180' }   # optional, default '0'
  exact: false              # optional, default true
  source:                   # optional; where the factor is defined
    name: 'NIST SP 811'
    url: 'https://www.nist.gov/pml/special-publication-811'
    ref: 'B.8: pound (avoirdupois) (lb)'
```

`exact` is a claim about the *definition*: `0.3048` (yard-and-pound agreement) is exact; `31536000` (a 365-day year) is a convention and must say `exact: false`. Non-terminating ratios go in as rationals so the build keeps them exact; their decimal rendering is rounded to 36 significant digits and marked inexact automatically.

**Provenance.** `toBase.source` is `{ name, url?, ref? }`: the publication, a link, and a locator inside it (table, section, or row). Every `imperial`, `uscs`, `cgs` and `other` factor carries one. Preferred sources, in order: the defining document (SI Brochure Table 8 for units accepted for use with the SI; the UK Weights and Measures Act 1985 Schedule 1 for imperial-only units such as stone, imperial pint and quart); NIST SP 811 Appendix B.8 for customary units it lists exactly. When NIST lists only a rounded value but the unit is an exact multiple of an exact unit (ounce = lb/16, US gallon = 231 in³), cite the row and state the exact definition in `ref`. Calendar reckonings and historical temperature scales use `name: 'convention'` with the defining rule in `ref` (`'1 year = 365 d common year'`, `'Réaumur scale: 0 °Ré = 0 °C, 80 °Ré = 100 °C'`).

**Form 2 — `prefixOf`** (SI prefix on a linear unit):

```yaml
prefixOf:
  prefix: 'kilo'
  base: 'metre'
```

Prefixes on affine units (°C) are rejected.

**Form 3 — `compose`** (product of powers with an optional exact coefficient):

```yaml
compose:
  factor: { num: '1', den: '60' }   # optional, default '1'
  of:
    - unit: 'degree'
      exp: 1
```

The named SI derived units are authored this way (`joule = kilogram·metre²·second⁻²`, `pascal = newton·metre⁻²`, `farad = coulomb·volt⁻¹` …). Because they resolve to factor 1 they still anchor their magnitudes, and their magnitudes' dimension vectors are checked against the composition. Affine and nonConvertible operands are rejected; the coefficient inherits inexactness from its operands.

**Magnitude-less compound units.** A compose-form unit may leave `unitOf` empty (`unitOf: []`, or omit it): its dimension is then Σ exp·dimension of its operands instead of the magnitude's vector, so compound units such as N·m, kW·h or mol⁻¹ need no synthetic magnitude. The engine slice lists them with `magnitudes: []`; they stay convertible (conversion is dimension-keyed) and their page shows a *compound* badge and no magnitude link. The converter opens on the first magnitude sharing the dimension, and is omitted when none does (`reciprocal-mole`, the Avogadro constant's unit). When `unitOf` is non-empty the composition must still match the declared magnitudes. `unitOf: []` without `compose` is a schema error.

**No form** is legal only for the derivation-free anchors — `metre kilogram second ampere kelvin mole candela radian steradian unitless` — and for `nonConvertible: true` units. Any other unit without a form is an integrity error.

**Identity rule.** Exactly one non-compose unit per dimension may resolve to factor 1 / offset 0: the magnitudes' baseUnit. A second `toBase: { factor: '1' }` unit is a duplicate identity and fails (this removed `unit.yaml`). Compose forms that land on the identity (J·s⁻¹ beside W) are allowed because their identity is a verified consequence of their operands.

**`nonConvertible: true`** marks wiki-only units with no linear or affine mapping (levels such as the decibel). They resolve no factor, are excluded from the engine slice (no converter, no conversion table), may not anchor a magnitude, and may not appear in any `compose.of` or `prefixOf.base`. They keep their presentation entry and page.

### prefixes

`name`, `symbol`, `value` (decimal string, e.g. `'1e-6'`), `system` (`si | binary`, default `si`).

### constants

`name`, `symbol`, `symbolAlt?`, `value` (decimal string, full precision), `unit` (ref), `exact?` (default false), `irrational?` (default false), `uncertainty?`, `source? { name, url?, ref? }`. `exact: true` is only for values fixed by definition (SI 2019 defining constants). π is `exact: false, irrational: true`.

### variables

`name`, `symbol`, `defaultUnit?`. A wiki entity with its own page (e.g. `radius`). Equation-local unknowns are **not** variables — use symbol terms.

### equations

```yaml
name: { en: 'Circle area' }
kind: 'formula'                      # equation | formula (taxonomy only)
expression: '\mag{A}=\const{\pi}\var{r}^{2}'
terms:
  A: { kind: 'magnitude', ref: 'area' }
  \pi: { kind: 'constant', ref: 'pi' }
  r:
    kind: 'symbol'
    label: { en: 'Radius' }          # es lives in area-circle.es.yaml
    unit: 'metre'                    # optional; fixes the term's dimension
solutions:
  A: 'pi * r^2'
  r: 'sqrt(A / pi)'
calculator: { enabled: true }
```

- `expression` is TeX annotated with `\mag{}` (magnitude terms), `\const{}` (constant terms) and `\var{}` (variable **or** symbol terms). Every macro argument is a `terms` key and vice versa.
- **Term kinds:** `magnitude`/`constant`/`variable` reference wiki entities; `symbol` is equation-local — a `label` (localized) and an optional `unit`. Symbol terms without a unit are dimensionless.
- **Solutions** use the grammar `+ - * / ^ ( )`, `sqrt abs ln exp sin cos tan`, decimal literals, `pi`, and term identifiers (keys with non-alphanumerics stripped: `\pi` → `pi`). Each solution is (a) numerically verified against the expression by random substitution and (b) **dimensionally checked**: `*`/`/` add/subtract exponent vectors, `^` by a literal scales them (non-integral results fail — no `sqrt` of an odd power), `+`/`-` require equal dimensions, transcendental functions require dimensionless arguments, `abs` preserves its argument, and the result must equal the target term's dimension.
- Related units are **derived** from terms at build time (magnitude → baseUnit, constant → unit, variable → defaultUnit, symbol → unit). There is no `units:` list to maintain.

### paths

Learning paths (ADR 0004): an ordered walk through existing entries with authored transitions and self-checks. Paths are presentation-only — nothing here touches the engine slice.

```yaml
name: { en: 'Temperature scales' }    # es lives in temperature-scales.es.yaml
level: 'intro'                        # intro | intermediate | advanced (required)
prerequisites: ['si-base-units']      # refs to other paths; resolved, no cycles
estimatedMinutes: '15'                # optional integer string
steps:
  - id: 'kelvin'                      # unique within the path; stable — progress is keyed on it
    kind: 'entry'
    ref:
      collection: 'units'             # magnitudes | units | prefixes | constants | variables | equations
      slug: 'kelvin'
    note: { en: >- ... }              # optional, why this entry, here
  - id: 'composing'
    kind: 'prose'
    body: { en: >- ... }
  - id: 'check-boiling'
    kind: 'check'
    prompt: { en: >- ... }
    answer: { en: >- ... }            # revealed on demand; prose, no grading
```

- **Step kinds.** `entry` points at one wiki entry through `ref: { collection, slug }` (the build resolves its name and symbol into `presentation/paths.json`, so readers need no second lookup; the target is nested because Astro's content layer reads any flat `{ collection, id }` object as a reference and would take the step's own `id` for the target); `prose` is transition text; `check` is a question with a revealable answer. Every prose field (`note`, `body`, `prompt`, `answer`) takes `$...$` math and is strict-KaTeX-linted like descriptions — never allowlist-downgradable.
- **Localization.** Translate every prose field in the path's sidecar, not only `name`/`description`: step text renders on the page in the reader's locale and falls back to English per field. Sidecar step entries are keyed by step `id`, so reordering steps never misattaches a translation.
- **Progress** is a reader-side concern (completed step ids under a local storage key), so renaming a step `id` resets learners' progress for that step — treat ids as stable.

## Translations

A translation is a sidecar file `<collection>/<slug>.<locale>.yaml` (today the only locale is `es`) holding **only** the localized text of one entity, in the entity's own nesting, with each field's value the translated string itself rather than an `{ en, es }` map:

```yaml
# yaml-language-server: $schema=../../dist/schemas/paths.locale.schema.json
name: 'Escalas de temperatura'
description: >-
  Relaciona el kelvin, el grado Celsius y las escalas históricas.
steps:
  kelvin:                     # step id, never a list position
    note: >-
      La escala absoluta: su cero es el cero absoluto.
  check-boiling:
    prompt: >-
      ¿A qué temperatura hierve el agua a presión normal?
    answer: >-
      A $373.15\ \text{K}$, es decir $100\ ^{\circ}\text{C}$.
```

Localizable fields are derived from the schema — every `localizedText` position: `name` and `description` everywhere, `label` of equation symbol terms (keyed by term key: `terms: { c: { label: 'Hipotenusa' } }`), and the step prose of paths (`note`, `body`, `prompt`, `answer`, keyed by step id). The loader merges each sidecar into its entity *before* validation, so every downstream stage — TeX lint, math rendering, search, presentation — sees the translation exactly as if it were inline.

**Translator workflow.**

1. Copy the entity's `en` text fields into `<slug>.es.yaml`, keeping the nesting; flatten each `{ en: ... }` to the bare string and key path steps by their `id` (equation terms by their key).
2. Put the sidecar header on line 1 (`$schema=../../dist/schemas/<collection>.locale.schema.json`) — the editor then rejects any key that is not a localized field.
3. Translate. Keep `$...$` math byte-identical unless the notation itself is localized; it is strict-KaTeX-linted like the English. The quoting rules are the same as entity files: single quotes for short labels, `>-` folded blocks for prose.
4. Partial sidecars are fine — an untranslated field falls back to English.

**What fails the build.** A sidecar for a slug with no entity file; a key that is not a localized field (`level:`, a misspelled `bdy:`); a step id, term key or optional field (`description`, `note`) the entity itself does not author — a translation needs English source text to translate; a locale suffix other than a supported locale (`.en.yaml` is rejected: English lives in the entity file); and any non-`en` key authored inline in an entity file.

## Checking your work

```
pnpm --filter @equreka/content check   # load → validate → integrity → resolve → dimensions → solutions → tex
pnpm quality                            # yaml-lint (raw-text hazards) + catalog drift
pnpm --filter @equreka/content build    # emits dist/ (engine.json, presentation/*, search/*, schemas/*)
```

Issues are aggregated per file with the failing stage in brackets; the build refuses to emit while any error stands.
