# Authoring content

Content lives in `packages/content/content/<collection>/<slug>.yaml`. The filename is the slug (kebab-case) and is never repeated inside the file. Every file is validated by `@equreka/schema`, cross-checked by the pipeline (`pnpm --filter @equreka/content check`), and compiled into the sharded artifact by `build`. Nothing ships that the pipeline cannot verify.

This guide is the field and YAML contract. How prose reads (length, structure, tone, sources, TeX) is in [`docs/content/style-guide.md`](../content/style-guide.md); Spanish names and terms are in [`docs/content/glossary-es.md`](../content/glossary-es.md).

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
- **Prose.** `description.en` uses a folded block scalar `>-` for ordinary wrapped prose: single line breaks fold to spaces, so wrap the source freely, and a blank line is a paragraph break. Use a literal block scalar `|-` only when a hard line break inside a paragraph is intended (the symbol lines of `units/nautical-mile.yaml`): every newline is kept, so each source line is exactly one rendered line and must not be wrapped. Every description container renders with `white-space: pre-line`, as the original's `.card-information p` did, so a kept newline is a visible break on web, and React Native `Text` breaks on it on mobile. Search indexes only a description's lede (`searchLeadOf`, ADR 0010): its first paragraph, cut to 480 characters at a word boundary. A blank line in the source ends that paragraph in either block style; a `|-` block with no blank line leads with its first line. Indexing folds every whitespace run to one space, so a break never glues two words into one token. Block scalars carry TeX, `#`, and apostrophes byte-literally. Inline math is `$...$` and cannot span a line break; display math is `$$...$$`; every fragment must pass strict KaTeX at build.
- **Comments.** Only the schema header. Rationale belongs in `description`, sources in `references`, numeric provenance in `toBase.source` (units) or `source` (constants), credits for adapted text in `textSources`.
- **License.** Everything in `packages/content/content/` is CC BY-SA 4.0 (`packages/content/content/LICENSE`, ADR 0011). The code beside it is GPL-3.0-or-later. By authoring an entry you license it under CC BY-SA 4.0. Reusers credit "Equreka contributors, https://github.com/Equreka/Equreka".
- **Originality.** Write every description, label and path step in your own words: explain the concept for a learner, cite the numbers in `references` and `source`, and leave the encyclopedia's phrasing behind. Run the check on what you wrote before you open a PR:

  ```
  node scripts/content/originality.mjs packages/content/content/units/metre.yaml --check
  ```

  The check fetches the Wikipedia article linked from the entry's `externalIds.wikidata` item (enwiki for the English description, eswiki for the `.es.yaml` one). It also phrase-searches the wiki for the description. A description is flagged when it shares a run of 8 or more words with the entry's own article, or 15% of its 8-word shingles. A search hit must meet both rules. `--check` exits 1 for a flagged description with no credit, and 2 when the network is down, since a skipped check is not a pass. `docs/content/originality-baseline.md` lists the legacy descriptions still awaiting a rewrite.
- **`textSources`.** Text you adapt from a third-party work needs a credit. Rewrite instead whenever you can. A credit is one item per work, and its license must let the adaptation be published under CC BY-SA 4.0. That means one of `CC-BY-SA-4.0` (Wikipedia today), `CC-BY-SA-3.0`, `CC-BY-4.0`, `CC0-1.0` or `public-domain`. GFDL-only, NC and ND texts cannot be adapted at all.

  ```yaml
  textSources:
    - title: 'Wikipedia: Metre'
      url: 'https://en.wikipedia.org/wiki/Metre'
      license: 'CC-BY-SA-4.0'
  ```

  - `title` names the work as credited and is not translated: a Spanish source keeps its own title, and its URL points at es.wikipedia.org.
  - A URL is credited once per entry.
  - `originality.mjs --apply` writes these items for every flagged description.
  - The entry page shows each credit under the description ("Text adapted from …") and lists it as `isBasedOn` in its JSON-LD.
  - When you rewrite a credited description in your own words, re-run the check, and keep the credit: the check only sees surface overlap, so removing a credit is a human reviewer's licensing decision (ADR 0011).
- **Localization.** Entity files carry English only: every localized field is `{ en: ... }`. Translations live in one sidecar per locale beside the entity (`<slug>.es.yaml`, see *Translations*); an inline `es:` key is rejected by both yaml-lint and the loader, so each language has exactly one home. Every English field an entity authors needs its Spanish: a new entity without a complete sidecar fails the `locale` stage (see *Translations*). Only entities on the shrinking locale debt, and generated prefixed units, still fall back to English with an untranslated notice.
- **Aliases.** `aliases` feeds the exact-match search lane: US spellings (`meter`), ASCII forms of Greek (`mu`, `ohm`), degree-text forms (`degC`), symbol variants users type (`m/s`, `J/K`), nicknames (`avogadro number`). Lowercase-insensitive; diacritics are folded at index and query time.
- **Taxonomy.** Every entity except categories and branches takes `categories` and `branches` (see *branches*).
- **Editorial status.** Every entity except categories and branches takes `status: 'draft' | 'reviewed'` (default `draft`). `reviewed` asserts that a person checked the entry's numbers against the source it cites; it is not a claim about prose polish. Web and mobile show a subtle *draft* badge on every entry that is not `reviewed`. Set it only in the same change that adds or verifies the citation.
- **External identifiers.** Every entity, including categories and branches, takes an optional `externalIds: { wikidata?, qudt? }` — `wikidata` is an item QID (`'Q11573'`), `qudt` a `http(s)://qudt.org/...` IRI (`'http://qudt.org/vocab/unit/M'`). `qudt` only exists for units, prefixes and quantity kinds; a category or branch cites `wikidata` alone. The web entry page links them and lists them as `sameAs` in its schema.org JSON-LD. Cite the exact concept: a unit's QID, never its quantity's, and a discipline's QID (`mechanics` → Q41217), never a broader or narrower one. An internal grouping with no single real-world concept, such as the `universal` category, is left without one rather than forced onto an approximate match.

## Collections

### categories

`name`, `description?`, `aliases?`, `order` (nonnegative integer string). Slug is the category id referenced everywhere else.

### branches

The second navigation level: a sub-discipline of exactly one category (physics → thermodynamics). `name`, `description?`, `aliases?`, `category` (ref: categories), `order` (nonnegative integer string; sorts branches within their category, ties break by slug). Every branch gets an `es` sidecar with its `name` and `description`.

```yaml
# yaml-language-server: $schema=../../dist/schemas/branches.schema.json
name:
  en: 'Thermodynamics'
category: 'physics'
order: 2
aliases:
  - 'thermal physics'
description:
  en: >-
    Thermodynamics studies heat, work and temperature ...
```

Every other entity (magnitudes, units, prefixes, constants, variables, equations, paths) files itself under branches with `branches: ['mechanics', 'thermodynamics']` next to `categories`:

- **Membership is explicit.** Each listed branch's `category` must already be in the entity's own `categories`; a branch never adds its category implicitly. `units/metre.yaml` listing `amount-of-substance` without `chemistry` in `categories` fails the integrity stage, as do an unknown branch slug and a branch listed twice.
- **Coverage.** Every entry in `physics`, `mathematics` or `chemistry` lists at least one branch of that discipline (the artifact test holds an explicit, currently empty, allowlist of exceptions). `universal` entries may stay branchless; they then appear under *General* on the Universal category page.
- **Judgment.** File an entry where a teacher would teach it, not everywhere it appears: joule is mechanics and thermodynamics; hertz is waves and oscillations; a unit of length is mechanics. Several branches are fine when the entry is genuinely central to each (the elementary charge: electromagnetism, modern physics, atomic structure, SI).
- **Empty branches warn.** A branch no entry lists produces one build warning; assign entries or delete it.

Branches drive navigation only — no engine, conversion or calculator behaviour depends on them. Category pages section their entries by branch (unbranched last under *General*), `/branches/<slug>/` lists a branch by collection, the units and magnitudes lists subgroup each category by branch, entry pages link their branches, and branch names are a search field, so a query for `termodinámica` reaches kelvin.

### magnitudes

`name`, `symbol { tex, text? }`, `symbolAlt?`, `baseUnit` (ref: units), `dimension` (partial vector over `L M T I Th N J A`, omitted keys are 0; `A` is the synthetic angle dimension), `kindOf?` (ref: magnitudes), `nonNegative?`, `categories`, `description?`.

The `dimension` you type is **verified**: the baseUnit must resolve to factor 1, offset 0, and every compose-authored unit of the magnitude must sum to the same vector. A typo in a vector fails the build.

Author a magnitude only for a real quantity kind (ISO/IEC 80000; luminous efficacy is ISO 80000-7), never to give a compound unit somewhere to live — use a magnitude-less compound unit instead (see *units*). The build emits one **orphan-magnitudes warning** listing every magnitude that only its own baseUnit lists, that no constant or equation term uses, and that has no `externalIds`. Clear an entry either by authoring its `externalIds` (a real quantity that simply has one unit so far) or by deleting it and giving the hosted unit an empty `unitOf`.

**Quantity kinds (`kindOf`, ADR 0006).** When a magnitude is a specialization of another quantity kind with the same dimension, name the broader kind: `work.kindOf: 'energy'`, `weight.kindOf: 'force'`. The target must exist, must have an identical dimension vector, and the chain must be acyclic — each is a build error. Check the relation against QUDT's `skos:broader` before authoring it; two kinds that merely share a dimension (pressure and stress are QUDT siblings under force-per-area; torque and energy are unrelated) get **no** `kindOf`. The effect is presentational: a magnitude's converter and unit table default to units whose `unitOf` lists the magnitude, one of its ancestors, or one of its descendants; sibling and unrelated same-dimension units stay reachable behind the converter's *show all with this dimension* toggle. `kindOf` never changes a conversion factor.

### units

`name`, `namePlural?`, `symbol`, `symbolAlt?`, `unitOf` (magnitude refs; all must share a dimension; empty or omitted only with `compose`, see below), `system` (`si | si-derived | imperial | uscs | cgs | other`), `nonConvertible?`, `prefixes?` (see *Prefixed units*), plus **exactly one** derivation form — or none, in the two cases below.

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

`exact` is a claim about the *definition*: `0.3048` (yard-and-pound agreement) is exact; `31536000` (a 365-day year) is a convention and must say `exact: false`. Non-terminating ratios go in as rationals so the build keeps them exact; their decimal rendering is rounded to 36 significant digits and marked inexact automatically. An irrational factor (π/180 rad for the degree, 2π rad for the revolution, 648 000/π au for the parsec) cannot be a rational: author it as a 36-significant-digit decimal with `exact: false`, and say in `source.ref` that the defined value is exact and the stored digits are rounded.

**Provenance.** `toBase.source` is `{ name, url?, ref? }`: the publication, a link, and a locator inside it (table, section, or row). Every `imperial`, `uscs`, `cgs` and `other` factor carries one. Preferred sources, in order: the defining document (SI Brochure Table 8 for units accepted for use with the SI; the UK Weights and Measures Act 1985 Schedule 1 for imperial-only units such as stone, imperial pint and quart); NIST SP 811 Appendix B.8 for customary units it lists exactly. When NIST lists only a rounded value but the unit is an exact multiple of an exact unit (ounce = lb/16, US gallon = 231 in³), cite the row and state the exact definition in `ref`. Calendar reckonings and historical temperature scales use `name: 'convention'` with the defining rule in `ref` (`'1 year = 365 d common year'`, `'Réaumur scale: 0 °Ré = 0 °C, 80 °Ré = 100 °C'`).

**Form 2 — `prefixOf`** (SI prefix on a linear unit) is never authored standalone: prefixed units are generated from their base (see *Prefixed units*), and `prefixOf` appears only in a hand **override** of a generated unit:

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

**Prefixed units (ADR 0007).** A base unit lists the SI prefixes it takes, and the build generates one unit per prefix — there is no YAML file per prefixed unit:

```yaml
name: { en: 'Metre' }             # es 'Metro' / 'metros' live in metre.es.yaml
namePlural: { en: 'metres' }      # lowercase prose plural; required with prefixes
prefixes: ['milli', 'centi', 'kilo']
```

Each generated unit has slug `<prefix><base>` (`kilometre`), name prefix + base (`Kilometre`; Spanish `metro` compounds take the esdrújula stress, `Kilómetro`), symbol prefix TeX + base TeX, a templated description with the power of ten (en and es), aliases derived from the base's spellings (`meter` → `kilometer`), notation variants (`L` → `mL`) and single-letter ASCII prefix aliases (`u` → `um`), and `unitOf`, `system`, `categories`, `branches` and `status` copied from the base; its factor is the prefix value × the base factor. A locale is generated only when the prefix, the base name and the base plural all carry it — otherwise it falls back to English with the untranslated notice. The presentation artifact marks these units `generated: true`; pages show "Derived from <base> with the SI prefix <prefix>".

- **Which prefixes.** SI coherent units take the 3n prefixes `femto pico nano micro milli kilo mega giga tera`. `metre`, `gram` and `litre` add the school ladder `centi deci deca hecto`; `pascal` adds `hecto` (hPa, meteorology). `gram` never takes `kilo` — `kilogram` is the SI anchor. `litre` omits `kilo`: 1 kL = 1 m³ would duplicate the cubic metre's identity mapping, which the identity rule rejects.
- **Overrides.** A hand file `units/<prefix><base>.yaml` authored as `prefixOf` the same pair overrides the generated unit: every field it writes wins, localized fields merge per locale (a hand `name.en` keeps the generated `name.es`, a hand `description.en` keeps the generated Spanish description), and `aliases` are unioned. Write an override only for knowledge the generator cannot derive — `micrometre` (the micron), `microgram` (mcg in medicine), `centimetre` (the CGS base unit). The `locale` stage judges an override on what it authors, not on the merged result: a hand `description.en` needs a hand Spanish description in `<slug>.es.yaml`, because the generated one does not translate the hand text.
- **Errors.** Prefixes on an affine unit, on a prefixed unit, or on a nonConvertible unit; an unknown or non-power-of-ten prefix; a repeated prefix; `prefixes` without `namePlural`; a hand file with a generated slug that is not its `prefixOf` override; a `prefixOf` file for a pair its base does not declare, or under a slug other than `<prefix><base>`.

**`nonConvertible: true`** marks wiki-only units with no linear or affine mapping (levels such as the decibel). They resolve no factor, are excluded from the engine slice (no converter, no conversion table), may not anchor a magnitude, and may not appear in any `compose.of` or `prefixOf.base`. They keep their presentation entry and page.

### prefixes

`name`, `symbol`, `value` (decimal string, e.g. `'1e-6'`), `system` (`si | binary`, default `si`).

### constants

`name`, `symbol`, `symbolAlt?`, `value` (decimal string, full precision), `unit` (ref), `exact?` (default false), `irrational?` (default false), `truncated?` (default false), `uncertainty?`, `source? { name, url?, ref? }`. `exact: true` is only for values fixed by definition (SI 2019 defining constants). π is `exact: false, irrational: true, truncated: true`.

**Truncated values.** `truncated: true` says the authored `value` cuts off a true value with no finite decimal form: an irrational number (π) or an exact value with endless digits (ħ = h/2π, the Stefan–Boltzmann constant, Wien's b, the molar volume of an ideal gas at 101.325 kPa). Every `irrational` constant must declare it, and only an `exact` or `irrational` one may: a measured value (G) is a rounding with an `uncertainty`, not a truncation. Pages print a truncated value with a trailing ellipsis; the engine and the calculator use `value` as written.

**Unit.** A constant used as an equation term is injected into the calculator exactly as authored, so its `unit` must be the SI-coherent unit of its dimension (factor 1, offset 0): joules, not electronvolts. The build fails otherwise (see *Anchors* under *equations*).

`approximations?` lists authored rounded forms of the value, as decimal strings in the constant's own `unit`, in display order, at least one and none repeated:

```yaml
value: '299792458'
approximations:
  - '3e+8'
```

They are the values a reader quotes (`3e+8` for c, `3.1416` for π), not a rounding the build computes, so write them exactly as they should print: the page formats each in the legacy notation (`3×10⁺⁸`; a zero exponent prints the plain number, `3.1416`). The entry page shows an *Approximate values* card beside the exact one only when the list is present; without it the exact card spans the full width. Only presentation reads the field: the engine slice and the calculator always use `value`.

### variables

`name`, `symbol`, `defaultUnit?`. A wiki entity with its own page (e.g. `radius`). Equation-local unknowns are **not** variables — use symbol terms.

### equations

```yaml
name: { en: 'Circle area' }
kind: 'formula'                      # equation | formula (taxonomy only)
level: 'intro'                       # intro | intermediate | advanced (required)
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

- `expression` is TeX annotated with `\mag{}` (magnitude terms), `\const{}` (constant terms) and `\var{}` (variable **or** symbol terms). Every macro argument is a `terms` key and vice versa. Everything that is a quantity goes inside a macro, subscripts and accents included: `\var{v_{0}}`, never `\var{v}_{0}`.
- **Level.** `level` (required) places the equation on the same scale learning paths use: `intro` (school), `intermediate` (upper secondary, first-year university), `advanced`. Pages show it as a badge; it changes no calculation.
- **Non-algebraic equations.** Notation no solver reads — ∇, ∂, ∫, operators acting on fields (Maxwell's equations, the Schrödinger equation) — declares `algebraic: false`. Such an equation authors no `solutions` and no calculator (both fail validation), and the verifier never parses its expression; it is still rendered and strict-KaTeX-linted, and a bare `\log` is still an error. Everything else is algebraic (the default) and must verify.
- **Term kinds:** `magnitude`/`constant`/`variable` reference wiki entities; `symbol` is equation-local — a `label` (localized) and an optional `unit`. Symbol terms without a unit are dimensionless.
- **Anchors.** Every term's unit — a symbol's `unit`, a variable's `defaultUnit`, a constant's `unit` — must be the SI-coherent unit of its dimension, resolving to factor 1 and offset 0: `radian`, never a degree; `kelvin`, never `celsius`; `metre`, never `kilometre`; `unitless`, never a percentage. Solutions are written and verified in these units, the calculator converts inputs into them and injects constants as authored, and angles are dimensionless in the dimension check, so a degree anchor would silently feed degrees into `sin`. Readers still enter any unit of the dimension in the calculator. Violations fail the `anchors` stage.
- **Integer terms.** A magnitude, variable or symbol term that only takes whole values (the `n` and `k` of a binomial coefficient, a count of turns) declares `integer: true`. The verifier then samples it from the integers 0–10, which is what makes `factorial` verifiable, and the calculator rejects a fractional input for it (*Enter a whole number*). Constants take no flag.
- **Delta terms.** A magnitude, variable or symbol term that is a difference (ΔT in Q = m c ΔT, a temperature rise) declares `delta: true`. The calculator then converts it without the affine offset — 10 °C of warming is 10 K, not 283.15 K — and offers it °C and °F; a term without the flag (an absolute temperature) is offered linear units only. Flag every difference whose unit could be affine; on linear units the flag changes nothing. Constants take no flag.
- **Term keys** (ADR 0009) are the term's symbol as TeX, rendered on its own on web and mobile, so any key that renders under strict KaTeX works: `v_{0}`, `t_{1/2}`, `\Delta x`, `\hbar`, `\varepsilon_0`, `[\mathrm{H}^{+}]`. Braces nest at most one level inside a key (`v_{0}` yes, `x_{a_{b}}` no). A key has no `$`, no line break, no leading or trailing space, and is never an `Object.prototype` name (`constructor`, `toString`, …). Single-quote a key that starts with `{` or `[` (`'[\mathrm{H}^{+}]':`) — unquoted, YAML reads it as a flow collection. A key with a bare run of two or more letters (`KE`) warns, because it typesets as K times E: write `\mathrm{KE}`.
- **Identifiers.** Solutions name terms by identifier: the key with its font and text wrappers (`\mathrm \text \textrm \mathit \mathbf \boldsymbol \operatorname \mathsf \mathtt`) unwrapped to their content, then every character outside `[A-Za-z0-9_]` dropped (`\pi` → `pi`, `v_{0}` → `v_0`, `\Delta x` → `Deltax`, `\mathrm{KE}` → `KE`, `E_{\mathrm{k}}` → `E_k`), or an authored `identifier` override. Author the override when the derivation is unreadable (`[\mathrm{H}^{+}]` → a bare `H`), collides (`v_0` and `v_{0}` both derive `v_0`) or is reserved:

  ```yaml
  terms:
    '[\mathrm{H}^{+}]':
      kind: 'symbol'
      label: { en: 'Hydronium concentration' }
      identifier: 'cH'
  ```

  An identifier is a letter followed by letters, digits or `_`, unique within the equation. Reserved, as identifier or override: the grammar's function names (`sqrt abs ln exp sin cos tan asin acos atan log10 log2 cbrt sinh cosh tanh asinh acosh atanh factorial`), every `Object.prototype` property name, and `pi`, which only the constant term with `ref: 'pi'` may use (the grammar reads `pi` as π). Violations fail the integrity stage.
- **Solutions** use the grammar `+ - * / ^ ( )`, decimal literals, `pi`, term identifiers and the functions below (ADR 0009, grammar v2). The expression and the solution spell each function differently; write the expression column in `expression` and the solution column in `solutions`:

  | In `expression` (TeX) | In `solutions` | Notes |
  | --- | --- | --- |
  | `\sqrt{x}` | `sqrt(x)` | halves dimension exponents |
  | `\sqrt[3]{x}` | `cbrt(x)` | thirds dimension exponents; real for negative x |
  | `\left\|x\right\|` | `abs(x)` | keeps the dimension |
  | `e^{x}` | `exp(x)` | |
  | `\ln x` | `ln(x)` | natural logarithm |
  | `\log_{10} x` | `log10(x)` | pH, decibels |
  | `\log_{2} x` | `log2(x)` | |
  | `\sin \cos \tan` | `sin cos tan` | argument in radians |
  | `\arcsin \arccos \arctan` | `asin acos atan` | result in radians |
  | `\sinh \cosh \tanh` | `sinh cosh tanh` | |
  | `\operatorname{arsinh}` `\operatorname{arcosh}` `\operatorname{artanh}` | `asinh acosh atanh` | ISO 80000-2 names; `\arsinh` does not render |
  | `n!`, `\left(n-k\right)!` | `factorial(n)`, `factorial(n - k)` | integers 0–170 only; declare the terms `integer` |

  **Never write a bare `\log`** in an expression: readers disagree on its base (compute-engine takes 10), so the build fails with *write \ln or \log_{10}*.

  Each root is (a) numerically verified against the expression and (b) **dimensionally checked**: `*`/`/` add/subtract exponent vectors, `^` by a literal scales them (non-integral results fail — no `sqrt` of an odd power, no `cbrt` of an area), `+`/`-` require equal dimensions, `abs` keeps its argument's dimension, every other function requires a dimensionless argument and yields dimensionless, and the result must equal the target term's dimension. **Angles count as dimensionless** in these checks (the SI's rad = 1), so `\sin\mag{\theta}` over a plane-angle term, `s = r\theta` and `\omega = 2\pi f` all check; unit conversion still keeps degrees and radians apart from plain numbers.
- **Multiple roots.** When solving for a term has more than one root, list them; a list has at least two:

  ```yaml
  solutions:
    t:
      - '(-v_0 + sqrt(v_0^2 + 2 * a * x)) / a'   # forward in time: listed first
      - '(-v_0 - sqrt(v_0^2 + 2 * a * x)) / a'
    \theta:
      - 'asin(g * R / v^2) / 2'                  # low launch angle
      - 'pi / 2 - asin(g * R / v^2) / 2'         # high launch angle
  ```

  **Order is preference.** The calculator answers with the first root that is real for the inputs (and non-negative, when the term's magnitude is `nonNegative`), shows that root's solved form, and lists every other real root beside it. Put the physical root first. Each root must verify on its own, and two roots that never differ are rejected as *duplicate roots*.
- **Coverage.** Every algebraic equation authors at least one solution. Solutions solve for non-constant terms only (constants are injected, never unknown). With `calculator: { enabled: true }` the calculator lets the reader leave any non-constant term empty, so **every non-constant term needs a solution**. When some term has no closed form, narrow the calculator with `solveFor`, the terms it may leave unknown; every other term becomes a required input:

  ```yaml
  # C = n! / (k! (n - k)!): n and k cannot be solved for
  solutions:
    C: 'factorial(n) / (factorial(k) * factorial(n - k))'
  calculator:
    enabled: true
    solveFor: ['C']
  ```

  `solveFor` is non-empty, repeats nothing and names no constant.
- **Influence rule.** Every root must use every other non-constant term of the equation, by identifier. A root that does not either belongs to an equation where that term cancels out (`F = m a + b - b`: delete the term) or is a typo (`c: 'sqrt(a^2 + a^2)'`); the build names the missing term. Constants are exempt (`m * 299792458^2` is fine, though `m * c^2` reads better). A root that is constant for every input, such as x = 0 of x(ax + b) = 0, is not authorable: it is no calculator answer.
- **Numeric verification.** Each macro is replaced by a synthetic symbol before compute-engine parses the expression, so a key's own TeX never affects the check. A symbol left outside every macro fails as *unannotated symbol* — only `\pi` and `e` (Euler's number) may stand bare. Every root is evaluated at 20 seeded random samples of its own (free terms in [0.1, 10), integer terms in the integers 0–10, constants at their compiled values) and must balance the equation **relative to its largest additive term**: |lhs − rhs| ≤ 1e-9 × the largest absolute value among the `+`/`-` operands of both sides. Tiny constants such as h get no absolute slack, and a side that is exactly `0` (`a x^2 + b x + c = 0`) still verifies. A sample where the root is undefined (outside its real domain, such as `asin` of a value above 1) or a side is non-finite or complex is discarded; fewer than 20 valid samples in 400 attempts fails.
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
- **Localization.** Translate every prose field in the path's sidecar, not only `name`/`description`: step text renders on the page in the reader's locale, and the `locale` stage fails a path whose step prose lacks its Spanish (`steps.<id>.body`). Sidecar step entries are keyed by step `id`, so reordering steps never misattaches a translation.
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

Localizable fields are derived from the schema — every `localizedText` or `localizedProse` position: `name` and `description` everywhere, `namePlural` of units, `label` of equation symbol terms (keyed by term key: `terms: { c: { label: 'Hipotenusa' } }`), and the step prose of paths (`note`, `body`, `prompt`, `answer`, keyed by step id). The `localizedProse` positions (`description` and the step prose) are rich text: only they render `$...$` math, and the TeX lint and math artifact read exactly those. The loader merges each sidecar into its entity *before* validation, so every downstream stage — TeX lint, math rendering, search, presentation — sees the translation exactly as if it were inline.

**Translator workflow.**

1. Copy the entity's `en` text fields into `<slug>.es.yaml`, keeping the nesting; flatten each `{ en: ... }` to the bare string and key path steps by their `id` (equation terms by their key).
2. Put the sidecar header on line 1 (`$schema=../../dist/schemas/<collection>.locale.schema.json`) — the editor then rejects any key that is not a localized field.
3. Translate. Keep `$...$` math byte-identical unless the notation itself is localized; it is strict-KaTeX-linted like the English. The quoting rules are the same as entity files: single quotes for short labels, `>-` folded blocks for prose.
4. Translate every field. A sidecar is complete when every localized field the entity authors in English has its Spanish beside it; the build fails on a partial one.

**What fails the build.**

- **Malformed sidecars** (stage `load`): a sidecar for a slug with no entity file; a key that is not a localized field (`level:`, a misspelled `bdy:`); a step id, term key or optional field (`description`, `note`) the entity itself does not author — a translation needs English source text to translate; a locale suffix other than a supported locale (`.en.yaml` is rejected: English lives in the entity file); and any non-`en` key authored inline in an entity file.
- **Missing translations** (stage `locale`, ADR 0012): an entity file that authors English text at a localized position with no Spanish beside it. The error is reported against the sidecar the text belongs in and lists the missing positions in sidecar addressing: `incomplete es translation — missing: description, terms.v_{0}.label, steps.composing.body`. Generated prefixed units are never judged. A hand override is judged on what it authors (see *Prefixed units*).
- **The locale debt** (`packages/content/locale-debt.json`, `{ "es": ["<collection>/<slug>", ...] }`, sorted, unique). It lists the existing entities that predate the gate and are allowed to stay incomplete until the content waves backfill them. It only shrinks:
  - Never add a new entity to it. Translate the entity instead. The debt test holds the list at exactly `LOCALE_DEBT_CEILING`, so growing it means raising that constant in review.
  - When you complete a listed entity, the build fails with `stale locale debt: remove '<id>'`. Delete that line, and lower `LOCALE_DEBT_CEILING` in `src/pipeline/__tests__/locale-completeness.test.ts` to the new length in the same change.
  - `check` prints the coverage: `locale es: <complete>/<total> authored entities complete, <n> in debt`.

## Checking your work

```
pnpm --filter @equreka/content check   # load → validate → locale → expand → integrity → resolve → anchors → dimensions → solutions → tex
pnpm quality                            # yaml-lint (raw-text hazards) + catalog drift
pnpm --filter @equreka/content build    # emits dist/ (engine.json, presentation/*, search/*, schemas/*)
node scripts/content/originality.mjs <files> --check   # network: prose overlap with Wikipedia (see Originality)
```

Issues are aggregated per file with the failing stage in brackets; the build refuses to emit while any error stands.

**Artifact budgets** (ADR 0010). Every file the build emits has a budget in `ARTIFACT_BUDGETS` (`packages/content/src/artifact-budgets.ts`). `build` prints one line per artifact: raw bytes, gzip bytes, the share of its budget, and `· mobile` when the app bundles it. It ends with the mobile-bundled total against its 8 MiB ceiling:

```
dist/presentation/units.json                174.5 KiB  gzip   26.8 KiB  8.5% of 2.00 MiB · mobile
dist/search/en.json                         139.7 KiB  gzip   29.5 KiB  13.6% of 1.00 MiB
dist/schemas/units.schema.json                6.7 KiB  gzip    1.1 KiB  build-only
mobile-bundled total: 1.02 MiB of 8.00 MiB (12.8%)
```

- A file at 80% of its budget, or a mobile total at 80% of 8 MiB, is a warning. Over budget is an error.
- A file that matches no pattern is an error: add its row to the table rather than emitting it unbudgeted.
- The web build holds its derived payloads to their own budgets in `apps/web/src/integrations/equreka-assets.ts`: `data/reader.<locale>.json` 1 MiB, `data/converter.<locale>.json` 256 KiB, `data/paths.<locale>.json` 128 KiB.
- The costs that grow with content are math bodies (every new unique `$…$` fragment; see the style guide's TeX budget) and the search lede (480 characters per entry at most).
