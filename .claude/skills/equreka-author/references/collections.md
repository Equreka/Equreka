# Collections: author checklists

Field shapes are defined in `docs/guides/authoring-content.md`; this file is the checklist per collection plus the rules for `rewrite`, `edit` and `retire`. Templates for every collection are in `../templates/`.

## Every entity

- Line 1 schema header; no other comments.
- `name.en` sentence case; Spanish `name` in the sidecar.
- `categories` lists every category of every branch in `branches`; physics, mathematics and chemistry entries list at least one branch of that discipline. File where a teacher teaches it (style guide, authoring guide *Judgment*).
- `aliases`: US spellings, ASCII forms, symbol variants, nicknames, and the regional Spanish forms the glossary keeps out of prose (*joule*, *capacitancia*, *molaridad*). Lowercase-insensitive; never duplicate `name`.
- `references`: one `{ title, url }` per source a claim in the description rests on, fetched in this session.
- `externalIds`: `wikidata` (fetched and matched) and, where QUDT has the concept, `qudt`.
- No `status` on new entries (defaults to `draft`).
- `description.en` in `>-`, 3–5 paragraphs, within the style guide's range for the collection.
- Sidecar: every localized field, nothing else.

## categories

`name`, `description`, `order`, `externalIds.wikidata` (none for `universal`). No `references` field exists: the description is undated and unattributed. Rewrites keep `order` unless the roadmap note gives a new one.

## branches

`name`, `description`, `category`, `order` (from the roadmap note), `aliases` (English and Spanish sub-discipline names, as the existing branches do), `externalIds.wikidata` for the discipline's item, never a broader or narrower one. No `references`. A branch whose name joins two concepts (*Waves and oscillations*) usually has no single QID: omit it.

## magnitudes

`symbol { tex, text? }` (add `text` when the TeX is not plain ASCII: `\theta` → `θ`), `baseUnit` (SI-coherent), `displayUnit?` (a logarithmic level only: `baseUnit: 'unitless'`, `dimension: {}`, and the `nonConvertible` unit it is stated in, which lists the magnitude in its `unitOf`; ADR 0014), `dimension`, `kindOf?` (QUDT `skos:broader` only), `nonNegative?`, `externalIds` (QID and `http://qudt.org/vocab/quantitykind/<Kind>`). The base unit must already exist or be created by your slice or an earlier wave. If the base unit's `unitOf` must list your magnitude and the unit is not yours, that is a `sharedEdit` unless the roadmap `edits` gives it to you.

## units

- `name`, `symbol`, `unitOf`, `system` (`si` base units, `si-derived` coherent derived, `imperial`, `uscs`, `cgs`, `other` for SI-accepted and everything else).
- Exactly one form: `toBase { factor, offset?, exact?, source }`, `compose { factor?, of: [{ unit, exp }] }`, or none (only the anchors and `nonConvertible`).
- Prefer `compose` whenever the unit is a product of existing units (`newton-metre`, `knot` = nautical mile per hour, `torr` is not one: it is 101325/760 Pa as a rational `toBase`).
- `toBase.source`: `{ name, url, ref }`, `ref` naming the table row (`'B.8: torr (Torr)'`, `'Table 8: astronomical unit'`). Conventions use `name: 'convention'` and state the rule in `ref`.
- `exact: false` for conventions and measured definitions (the dalton, a 365-day year); rational factors stay exact.
- `prefixes` only per the roadmap note and ADR 0007; then `namePlural` (English in the entity, Spanish in the sidecar).
- `symbol.tex` valid inside `\mathrm{}`: `/` and `^{}` instead of `\frac`.

## prefixes

`name`, `symbol`, `value` (decimal string), `system`. Description: factor, symbol and its case, CGPM adoption (resolution and year, referenced), etymology, typical uses, pitfalls.

## constants

`symbol`, `value`, `unit` (SI-coherent), `exact`, `irrational`, `truncated`, `uncertainty` (measured only), `source { name: 'NIST CODATA 2022', url, ref }`, optional `approximations` (values readers quote, in the constant's unit, display order). Prose numbers match `value` and `uncertainty`.

## variables

`symbol`, `defaultUnit` (SI-coherent). Only for a wiki concept with its own page; equation-local unknowns are symbol terms.

## equations

See `term-keys.md`. Checklist: `kind`, `level`, `expression` fully annotated, `terms` (anchors SI-coherent), `solutions` for every non-constant term (or `solveFor`), multi-root order, `delta`/`integer`/`algebraic` flags, `calculator.enabled`, `externalIds.wikidata` for the law if an exact item exists, `references`, description with every term by macro.

## paths

`name`, `level`, `prerequisites` (existing paths), `estimatedMinutes`, `steps` of kind `entry` (an existing entry: `ref { collection, slug }`, optional `note`), `prose` (`body`) and `check` (`prompt`, `answer`). Step ids are kebab-case and stable. Build the path over this wave's entries; every prose field gets its Spanish twin keyed by step id. Instructional register: imperative, never *you*.

## Rewrite (`action: rewrite`)

- Keep the slug, `categories`, and every structural and numeric field: `value`, `uncertainty`, `toBase`, `compose`, `dimension`, `baseUnit`, `unitOf`, `exact`, `expression`, `terms`, `solutions`. A **reviewed** entry's numeric lines stay byte-identical (`git diff` must show none of them); its `status` stays `reviewed`.
- Rewrite `description.en` from scratch to the style guide, from fetched sources; do not edit the legacy text sentence by sentence (it is largely Wikipedia-derived).
- Remove Markdown, HTML and legacy formatting (`|-` with list items, `**bold**`, `$m$` around words that are not math).
- Fix `name` casing; re-file `branches` as the roadmap entry says.
- Add `references` for every dated or attributed claim; keep existing `externalIds` unless a fetch proves them wrong (then `openQuestions`, not a silent change).
- Write the complete sidecar, keeping any fields it already has unless the glossary says otherwise.
- A numeric field you believe is wrong: do not change it; put it in `openQuestions` with the source URL.
- `textSources` entries (licensing attribution), if present, stay untouched.

## Edit (`action: edit`)

Only the change the roadmap `note` names (for the existing paths: regional unit names in Spanish prose). Leave everything else byte-identical.

## Retire (`action: retire`)

First apply the `edits` that remove every reference to the slug (re-file entities that list the branch), then delete the entity file and its sidecars. Run the check: no reference to the retired slug may remain.
