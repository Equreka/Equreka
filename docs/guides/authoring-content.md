# Authoring content

Content lives in `packages/content/content/<collection>/<slug>.yaml`. The filename is the slug (kebab-case) and is never repeated inside the file. Every file is validated by `@equreka/schema`, cross-checked by the pipeline (`pnpm --filter @equreka/content check`), and compiled into the sharded artifact by `build`. Nothing ships that the pipeline cannot verify.

## Editor setup

Every file starts with a schema header pointing at the JSON Schema the build emits:

```yaml
# yaml-language-server: $schema=../../dist/schemas/units.schema.json
```

Run `pnpm --filter @equreka/content build` once so `dist/schemas/*.schema.json` exists; VS Code with the Red Hat YAML extension then validates and autocompletes fields (`.vscode/settings.json` also wires the globs). The schemas are the *input* side of the Zod contract — exactly what you may type.

## Universal rules

- **Decimal strings.** Every physical value (`value`, `factor`, `offset`, `uncertainty`, rational `num`/`den`, prefix `value`) is a quoted string: `'0.3048'`, `'6.62607015e-34'`, `num: '5'`. Unquoted numbers are rejected by `scripts/quality/yaml-lint.mjs` and would truncate to float64 at parse time (ADR 0002). Values are parsed exactly once, at the engine's float64 boundary.
- **Failsafe parse.** The pipeline parses YAML 1.2 with the failsafe schema: every scalar arrives as a string. Booleans are exactly `true`/`false` (never `yes`/`on`); integers are digit strings; both coerce in the schema.
- **Quoting.** Single quotes or plain scalars for short values. Never double quotes around TeX: `"\mu"` is an illegal YAML escape. Apostrophes inside single quotes are doubled (`'it''s'`), which is why prose uses block scalars instead.
- **Prose.** `description.en` uses a folded block scalar `>-` (or literal `|-` when paragraphs matter). Block scalars carry TeX, `#`, and apostrophes byte-literally. Inline math is `$...$`, display math `$$...$$`; every fragment must pass strict KaTeX at build.
- **Comments.** Only the schema header. Rationale belongs in `description`, sources in `references`.
- **Localization.** `en` is required; `es` is optional and falls back to English with an untranslated notice.
- **Aliases.** `aliases` feeds the exact-match search lane: US spellings (`meter`), ASCII forms of Greek (`mu`, `ohm`), degree-text forms (`degC`), symbol variants users type (`m/s`, `J/K`), nicknames (`avogadro number`). Lowercase-insensitive; diacritics are folded at index and query time.

## Collections

### categories

`name`, `description?`, `aliases?`, `order` (nonnegative integer string). Slug is the category id referenced everywhere else.

### magnitudes

`name`, `symbol { tex, text? }`, `symbolAlt?`, `baseUnit` (ref: units), `dimension` (partial vector over `L M T I Th N J A`, omitted keys are 0; `A` is the synthetic angle dimension), `nonNegative?`, `categories`, `description?`.

The `dimension` you type is **verified**: the baseUnit must resolve to factor 1, offset 0, and every compose-authored unit of the magnitude must sum to the same vector. A typo in a vector fails the build.

### units

`name`, `symbol`, `symbolAlt?`, `unitOf` (≥ 1 magnitude refs; all must share a dimension), `system` (`si | si-derived | imperial | uscs | cgs | other`), `nonConvertible?`, plus **exactly one** derivation form — or none, in the two cases below.

**Form 1 — `toBase`** (linear or affine primitive against the SI-coherent base):

```yaml
toBase:
  factor: '0.45359237'      # decimal string, or { num: '5', den: '9' }
  offset: { num: '45967', den: '180' }   # optional, default '0'
  exact: false              # optional, default true
```

`exact` is a claim about the *definition*: `0.3048` (yard-and-pound agreement) is exact; `31536000` (a 365-day year) is a convention and must say `exact: false`. Non-terminating ratios go in as rationals so the build keeps them exact; their decimal rendering is rounded to 36 significant digits and marked inexact automatically.

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

**No form** is legal only for the derivation-free anchors — `metre kilogram second ampere kelvin mole candela radian steradian unitless` — and for `nonConvertible: true` units. Any other unit without a form is an integrity error.

**Identity rule.** Exactly one non-compose unit per dimension may resolve to factor 1 / offset 0: the magnitudes' baseUnit. A second `toBase: { factor: '1' }` unit is a duplicate identity and fails (this removed `unit.yaml`). Compose forms that land on the identity (J·s⁻¹ beside W) are allowed because their identity is a verified consequence of their operands.

**`nonConvertible: true`** marks wiki-only units with no linear or affine mapping (levels such as the decibel). They resolve no factor, are excluded from the engine slice (no converter, no conversion table), may not anchor a magnitude, and may not appear in any `compose.of` or `prefixOf.base`. They keep their presentation entry and page.

### prefixes

`name`, `symbol`, `value` (decimal string, e.g. `'1e-6'`), `system` (`si | binary`, default `si`).

### constants

`name`, `symbol`, `symbolAlt?`, `value` (decimal string, full precision), `unit` (ref), `exact?` (default false), `irrational?` (default false), `uncertainty?`, `source? { name, url? }`. `exact: true` is only for values fixed by definition (SI 2019 defining constants). π is `exact: false, irrational: true`.

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
    label: { en: 'Radius', es: 'Radio' }
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
name: { en: 'Temperature scales', es: 'Escalas de temperatura' }
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
- **Localization.** Write `es` for every prose field, not only `name`/`description`: step text renders on the page in the reader's locale and falls back to English per field.
- **Progress** is a reader-side concern (completed step ids under a local storage key), so renaming a step `id` resets learners' progress for that step — treat ids as stable.

## Checking your work

```
pnpm --filter @equreka/content check   # load → validate → integrity → resolve → dimensions → solutions → tex
pnpm quality                            # yaml-lint (raw-text hazards) + catalog drift
pnpm --filter @equreka/content build    # emits dist/ (engine.json, presentation/*, search/*, schemas/*)
```

Issues are aggregated per file with the failing stage in brackets; the build refuses to emit while any error stands.
