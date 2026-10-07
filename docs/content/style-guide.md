# Content style guide

How every entry reads. Applies to all prose in `packages/content/content`: `description`, equation term `label`s, path step prose, and `name`. Field shapes and YAML rules live in [`docs/guides/authoring-content.md`](../guides/authoring-content.md); Spanish conventions in [`glossary-es.md`](glossary-es.md). Where this guide and the authoring guide meet, the authoring guide decides what the build accepts and this guide decides what a reader sees.

## Contract

- **Encyclopedic and original.** Descriptions are written for this project under CC BY-SA 4.0. They are never copied, translated or closely paraphrased from any source, Wikipedia included.
- **Bilingual from day one.** Every entity ships with a complete `<slug>.es.yaml` sidecar: every localized field the entity authors has a Spanish value.
- **Draft until a person checks it.** AI-authored or AI-rewritten entries are `status: 'draft'`. Only a human sets `reviewed`, after checking the numbers against the cited source. A prose rewrite of a `reviewed` entry keeps `reviewed` and leaves every numeric line byte-identical.
- **Audience is staged.** School entries (`level: intro`) come first; the university pass (`level: intermediate`) comes later. Write an `intro` entry for an upper-secondary reader: define every term, no calculus unless the entry is calculus.

## Length

English words, counted as whitespace-separated tokens with each `$…$` or `$$…$$` fragment counting as one word. The Spanish description is within ±15% of the English count. Check both with `node scripts/content/roadmap.mjs --entry <collection>/<slug>` (`words.en`, `words.es`, `ratio`).

| Collection | Words (EN) | Notes |
| --- | --- | --- |
| equations, magnitudes, constants | 200–350 | |
| units, SI and common | 200–300 | SI units, units accepted for use with the SI, everyday customary units (foot, pound, gallon) |
| units, obscure customary or historical | 150–300 | Rømer, stone, dyne, Réaumur |
| branches, categories | 150–250 | no `references` field: no dated or attributed claims |
| variables | 150–250 | |
| prefixes | 80–150 | |
| paths | 1–2 sentences | step `note` ≤ 60 words, `body` ≤ 150, `prompt` and `answer` ≤ 80 each |

The lower bound is enforced: a `rewrite` counts as done in the roadmap only at or above it. The upper bound is a verifier check.

## Structure

3–5 paragraphs inside one `>-` folded block, separated by a blank line. No headings, lists, bold, tables or line breaks inside a paragraph (`|-` only where a hard break is the content, which a description never needs).

**Write a strong lede.** Search indexes only the first paragraph, up to 480 characters (ADR 0010). Words that appear only in later paragraphs never find the entry. The first paragraph must therefore name the entry and state what it is in the terms a reader would type: the quantity, the law, the common synonyms and the discipline. Front-load them, because anything past 480 characters is cut. Name, `aliases`, symbol and branch names are indexed in full, so put spelling variants and abbreviations in `aliases`, not in the prose.

Each paragraph does one job, in this order:

**Equations**

1. Lede: what the relation states and the name it goes by.
2. Every term: symbol (by macro, see *TeX*), SI unit, sign convention (which direction is positive, what a negative value means).
3. Meaning, with a derivation sketch when one fits in three sentences.
4. Assumptions and validity limits: when the relation stops holding (non-relativistic speeds, ideal gas, small angles, constant acceleration, dilute solution).
5. History (≤ 3 sentences, each backed by a `references` entry) and applications, with at most one one-line numeric example. Worked examples belong to the future exercises collection, not here.

The equation page already typesets `expression`; never repeat it as display math.

**Magnitudes**

1. Definition in the ISO/IEC 80000 sense: what the quantity is, not what it is used for.
2. SI unit and dimension.
3. Scalar or vector, and what its sign means (or that it is non-negative).
4. How it is measured, with typical values spanning everyday to extreme.
5. Commonly confused quantities (speed and velocity, mass and weight, heat and temperature), optionally followed by history.

**Units**

1. What it measures and which system it belongs to.
2. The exact current definition and the document that defines it (SI Brochure, NIST SP 811, an act or resolution).
3. Relations to other units (exact factors in math).
4. Where it is used today.
5. History, then spelling and symbol notes (variant symbols, plural, common misspellings) in prose.

**Constants**

1. Value and status: exact by definition since the 2019 SI redefinition, exact by another definition (the standard atmosphere is a unit, not a constant), or measured with its NIST CODATA 2022 relative standard uncertainty.
2. Physical meaning.
3. The key equations it appears in.
4. Measurement history: how and when its value was determined, and what the 2019 redefinition changed.

**Prefixes**: factor and symbol; when the CGPM adopted it; etymology; typical uses; pitfalls (symbol case, μ versus u, prefixes never combine, kilo versus the binary kibi).

**Branches and categories**: what the discipline studies, its central quantities and laws (named as the entries they link to), how it relates to neighbouring branches. Undated and unattributed: the schema has no `references` for these collections.

**Variables**: definition, conventional symbols, unit, where the variable appears.

**Paths**: instructional register. Address the reader with the imperative (*Enter*, *Compare*), never with *you*. `check` prompts are questions by design; everywhere else the tone rules below apply.

## Tone

Encyclopedic, third person, present tense (past tense for history). Every sentence carries information.

Banned in English prose (Spanish equivalents in the glossary):

- *you*, *your*, *we*, *our*; rhetorical questions
- *simply*, *obviously*, *clearly*, *of course*, *just*
- *crucial*, *pivotal*, *vital*, *key role*, *plays a key role*, *plays a central role*, *delve*, *it is important to note*, *it is worth noting*, *in conclusion*
- emojis, Markdown or HTML of any kind, URLs, mentions of Equreka, *this wiki*, *this page*, *this entry*

Names:

- `name` is sentence case: *Ideal gas law*, *Joule per kelvin*, *Speed of light in vacuum*. Laws named after people take the possessive (*Newton's second law*, *Snell's law*). An equation's `name` is the relation's conventional name, never *X formula*; when that name equals a magnitude's, qualify it (*Kinetic energy of a body in translation*). Roadmap names are working titles.
- English spelling is British with Oxford *-ize*, matching the SI Brochure's unit names: *metre, litre, behaviour, vapour, fibre, centre*, but *ionization, polarization, standardized*. US forms (*meter, behavior, vapor*) go in `aliases`, never in prose.
- Unit names are lowercase in running prose (*the joule*, *three newtons*), symbols upright in math.
- Spell numbers one to nine in prose when they count things (*three base units*); use numerals with units, always in math (`$3\,\mathrm{N}$`).
- Slugs are English kebab-case. An equation that would share a slug with a magnitude, unit or constant takes `-formula` (`density-formula`); `roadmap-check` enforces it.

## History, sources and originality

- **Every dated or attributed claim has a `references` entry the author fetched in the same session.** If no fetched source supports a claim, omit the claim. Never write a value, date, name, QID or history fact from memory.
- **Preferred sources**, in order: defining documents (BIPM SI Brochure 9th ed., CGPM resolutions, IAU resolutions); NIST (CODATA 2022 values, SP 811, SP 330); IUPAC (Gold Book, Green Book) and CIAAW; MacTutor for the history of mathematics; original papers by DOI. Textbooks and university course pages are acceptable for formula statements and validity limits.
- **Wikipedia** may be used to find primary sources, never cited as the source and never paraphrased closely.
- `references` entries are `{ title, url }`: the title names the publication and the locator (*BIPM, The International System of Units, 9th ed., Table 8*).
- **Write from at least two sources.** No run of 8 or more words copied from any source, in either language. Never mirror a source's sentence order or paragraph plan.
- **The check.** Verifiers run `node scripts/content/originality.mjs <file> --format json` on the entity file (English) and its sidecar (Spanish). It compares 8-word shingles with the Wikipedia article linked from the entry's Wikidata item in the same language, flagging a shared run of 8 or more words or at least 15% shingle overlap; when that article does not flag, or there is none, it phrase-searches the same wiki and flags a hit only when both rules hold. A new or rewritten description must come back `flagged: false` with the search pass on (never `--no-search`). Exit code 2 means the check could not run (network or API error); it fails closed, so rerun it rather than skip it. The tool compares against Wikipedia only, so the verifier also compares the prose with the sources the author fetched.
- `textSources` (from the licensing change) attributes text derived from a CC BY-SA source. A rewrite never adds one, because its prose is original, and never removes one: removal is the human reviewer's licensing decision.

## TeX

- **Inline** `$…$` on one line; a fragment never spans a line break. **Display** `$$…$$`: at most one per description, and never a restatement of `expression`.
- **Budget.** Every unique math fragment ships as a rendered body in one of 16 hash shards, `presentation/math/bodies/<shard>.json` (measured 2026-10-06: 599 bodies, 221 KB compact in all, about 0.37 KB each, against a 128 KiB budget per shard; `build` prints each shard's share). A term written by macro reuses the body of its key, which the page already renders, so it is free; every new number-with-unit, formula or symbol variant costs a body. Add at most three new fragments per description beyond its term keys, reuse exact spellings (`$c$`, not `$c_{0}$` in one entry and `$c$` in another), and say *the speed of light* in prose when no math is needed.
- **Equation descriptions refer to terms by macro**: `$\mag{F}$`, `$\const{c}$`, `$\var{r}$`. The build strips macros before rendering, so `$\mag{F}=\mag{m}\mag{a}$` is stored once with the expression, and the page highlights the term.
- **Quantities and units**: `$9.81\,\mathrm{m/s^{2}}$`, `$\mathrm{J/(kg\,K)}$`, `$25\,^{\circ}\mathrm{C}$`, `$3\,\mathrm{N\,m}$`. Thin space `\,` between number and unit and between unit factors; unit symbols upright in `\mathrm{}`; quantity symbols italic (the default); descriptive subscripts upright (`v_{\mathrm{max}}`, `E_{\mathrm{k}}`).
- **Numbers**: scientific notation `6.674\times10^{-11}`; digit groups of three with a thin space, `101\,325`, `0.000\,1`; the decimal separator is `.` in both languages (see the glossary for why); a leading zero before the separator, `0.5`.
- **Minus** is the ASCII hyphen-minus inside math; the build normalizes en dash, em dash and U+2212 with a warning.
- **Logarithms**: `\ln` or `\log_{10}`, never a bare `\log` (the build rejects it in expressions; keep descriptions consistent).
- **Strict KaTeX only.** No `\text` for units (use `\mathrm`), no `\\`, no environments, no `\color`, no HTML.
- **Unit `symbol.tex`** must be valid inside `\mathrm{}`, because generated prefixed units render `\mathrm{<symbol>}`: `m/s^{2}`, `N\,m`, `^{\circ}C`, `\Omega`. No `\frac`, no `\text`, no `$`.
- **YAML**: TeX lives in single-quoted or block scalars, never in double quotes (`"\mu"` is an illegal escape).

## Numbers in prose

Every number in prose agrees with the entry's own fields (`value`, `toBase.factor`, `uncertainty`) and with the cited source, to the digits shown. Round only where the text says so (*about*, *approximately*). Quote exact values in full; quote measured values with the CODATA 2022 digits or a stated rounding.
