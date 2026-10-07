---
name: equreka-author
description: Author or rewrite Equreka content entries (equations, magnitudes, units, constants, prefixes, variables, branches, categories, learning paths) as YAML plus a complete Spanish sidecar, for one slice of a content wave. Use when assigned roadmap items from `node scripts/content/roadmap.mjs --wave <id> --json`, or when asked to write or rewrite any file under packages/content/content.
---

# Equreka author

You write the entries of **one slice** of a content wave: each one an English entity file and its complete Spanish sidecar, verifiable against fetched sources. A separate verifier will try to break every claim you make.

## Read first (once per session)

1. `docs/content/style-guide.md`: length, structure, tone, sources, TeX.
2. `docs/content/glossary-es.md`: Spanish unit names and terms.
3. `docs/guides/authoring-content.md`: every field and YAML rule the build enforces.
4. `references/collections.md` (this skill): per-collection checklists and the rewrite rules.
5. For equations: `references/term-keys.md` and `docs/architecture/decisions/0009-solution-contract-v2.md`.
6. One existing file of each collection you will touch, for house style.

## Your inputs

The slice object from the wave args (`items[]` with `collection`, `slug`, `action`, `name`, `level`, `branches`, `flags`, `note`, `edits`, `file`, `sidecar`) and `ownerBySlug` (`<collection>/<slug>` → slice). `note` and `flags` are planning hints from the roadmap, never values to copy and never binding when a fetched source disagrees: say so in `openQuestions`.

## Ownership

- Write **only** the `file` and `sidecar` of your items and the files listed in their `edits`. Everything else is read-only.
- A change another file needs (an alias moving, a `unitOf` entry, a re-filing) goes in `sharedEdits[]`, never into the file.
- No git state changes: no commit, branch, stash, checkout, reset or push. The main session commits.
- Never set `status: 'reviewed'`. New entries carry no `status` (it defaults to `draft`). A rewrite keeps the entry's existing `status`.
- Do not edit `packages/content/locale-debt.json` or its ceiling test. When your rewrite completes a legacy entity's Spanish, the check reports "stale locale debt" for it: ignore that issue; the wave's fixer reconciles the debt list centrally (ADR 0012).
- **Never type a value, QID, IRI, date, name or history claim from memory.** Every one comes from a page you fetched in this session, and its URL goes in your output.

## Per-entry loop

For each item, in roadmap order (branches and magnitudes before the units and equations that need them):

1. **Fetch at least two sources** (see *Sources*). Record every URL you use.
2. **Identity**: fetch the Wikidata item and, for units, quantity kinds, prefixes and constants, the QUDT IRI (see *Identity*).
3. **Write the English entity** from the template in `templates/` (schema header on line 1), following `references/collections.md`.
4. **Write the Spanish sidecar** (`<slug>.es.yaml`, sidecar header on line 1): every localized field the entity authors (`name`, `description`, `namePlural`, symbol-term `label`s keyed by term key, path step prose keyed by step id). Translate from your English with the glossary; math byte-identical.
5. **Measure**: `node scripts/content/roadmap.mjs --entry <collection>/<slug>`: `words.en` in the style-guide range, `ratio` within 0.85–1.15, `esMissing` and `regional` empty.
6. **Every 3–4 entries**, run `pnpm --filter @equreka/content check`. Fix every error in your files. Ignore only errors whose sole cause is a slug another slice of this wave owns and has not written yet (an unknown `ref` to it); list those in `missingPrereqs` only if no slice owns them.

Before reporting, run `pnpm --filter @equreka/content check` and `pnpm quality` once more and confirm your files produce no errors or warnings.

## Sources

Preferred, in order; fetch the page, never cite from memory:

- Defining documents: BIPM SI Brochure 9th ed. (`https://www.bipm.org/en/publications/si-brochure`; Table 8 for units accepted for use with the SI), CGPM and IAU resolutions.
- NIST: CODATA 2022 values (`https://physics.nist.gov/cuu/Constants/index.html`, each value page `https://physics.nist.gov/cgi-bin/cuu/Value?<code>`), SP 811 Appendix B.8 (`https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8`), SP 330.
- IUPAC Gold Book (`https://goldbook.iupac.org/`) and CIAAW for chemistry; MacTutor (`https://mathshistory.st-andrews.ac.uk/`) for the history of mathematics; original papers by DOI.
- Open textbooks and university course notes for formula statements, sign conventions and validity limits.
- Wikipedia only to find the sources above; never cited, never paraphrased.

## Prose

Follow the style guide exactly: per-collection paragraph plan, length range, banned words, every dated or attributed claim backed by a `references` entry you fetched. Write from at least two sources in your own sentence order; never reuse 8 consecutive words from any source. Branches and categories have no `references`, so their prose carries no dates or attributions.

## YAML hazards

- Line 1 is the schema header: `# yaml-language-server: $schema=../../dist/schemas/<collection>.schema.json`; sidecars use `<collection>.locale.schema.json`. No other comments.
- Prose in `>-` folded blocks, a blank line between paragraphs; `|-` only for a deliberate hard break (never in a description).
- Short values in single quotes; an apostrophe inside single quotes is doubled (`'Newton''s second law'`). Never double quotes around anything with a backslash: `"\mu"` breaks.
- Every decimal and rational is a quoted string: `value: '6.67430e-11'`, `num: '101325'`, `den: '760'`. Integers in `order`, `exp`: plain digits are fine.
- Booleans exactly `true` / `false`.
- No inline `es:` keys; Spanish lives only in the sidecar. A sidecar translates only fields the entity has.
- A term key starting with `{` or `[` is single-quoted: `'[\mathrm{H}^{+}]':`.

## Equations

Read `references/term-keys.md` before the first equation. In short:

- `kind: 'formula'` for a definition or mensuration rule that computes one quantity from others (area of a circle, density); `kind: 'equation'` for a law or relation (Newton's second law, the ideal gas law).
- `level` from the roadmap item (`intro` or `intermediate`).
- Every quantity in `expression` sits inside a macro (`\mag{}` magnitude, `\const{}` constant, `\var{}` variable or symbol), subscripts included: `\var{v_{0}}`. Only `\pi` and Euler's `e` may stand bare.
- Term kinds: a `magnitude` term when a wiki magnitude has exactly that meaning; a `constant` term for a constant entry; `symbol` otherwise, with `unit` set to the SI-coherent anchor (radian for angles, `unitless` for ratios and counts, never degree, kilometre, electronvolt, Celsius or percent).
- `calculator: { enabled: true }` and a solution for **every** non-constant term. Where a term has no closed form (`NC`), narrow with `calculator.solveFor`.
- Multi-root (`MR`): list every root, the physical one first (forward time, low launch angle, positive length).
- Influence rule: every root uses every other non-constant term.
- `delta: true` on differences of possibly affine quantities (`T2`); `integer: true` on counts (`INT`); `algebraic: false` for notation (`NONALG`), with no `solutions` and no calculator.
- `identifier` override when the derived identifier is unreadable or collides (`KEY`).
- Recompute one worked example from a fetched source with your solution (`node -e "…"`) and note it in `openQuestions` if it disagrees. A passing check proves internal consistency, not correctness.

## Magnitudes, units, constants

- **Magnitudes**: `baseUnit` is the SI-coherent unit; `dimension` is the exponent vector over `L M T I Th N J A` (`A` is plane angle, `A: 2` solid angle); `nonNegative: true` when the quantity cannot be negative. `kindOf` only after fetching the QUDT quantity kind and finding `skos:broader` pointing at the parent; siblings get no `kindOf` (ADR 0006).
- **Units**: exactly one form (`toBase`, `compose`, or none for the whitelisted anchors and `nonConvertible`); every `imperial`, `uscs`, `cgs`, `other` factor carries `toBase.source` with the table row in `ref`; `exact` states whether the definition is exact; non-terminating ratios as rationals; `prefixes` require `namePlural` (ADR 0007); `unitOf` lists the magnitudes it measures, `[]` only for a magnitude-less compose unit; `symbol.tex` valid inside `\mathrm{}`.
- **Constants**: fetch the NIST CODATA 2022 value page; `value` with every published digit; `uncertainty` (the standard uncertainty, same unit) for measured values; `exact: true` only for values fixed by definition; `truncated: true` for exact values with endless digits and for irrational numbers (`irrational: true`); `unit` is the SI-coherent unit; `source: { name: 'NIST CODATA 2022', url, ref }`.

## Identity

- **Wikidata**: find candidates with `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=<term>&language=en&format=json`, then fetch `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json` and confirm that the English and Spanish label or aliases name the **exact** concept. A law gets the law's item, never the quantity's; a unit gets the unit's item; a branch gets the discipline's item. No exact item: omit `wikidata` and say why in `openQuestions`.
- **QUDT** (units, quantity kinds, prefixes, constants): fetch `https://qudt.org/vocab/<unit|quantitykind|prefix|constant>/<Id>`; it must return 200 and not be deprecated; for a unit, its conversion multiplier must equal your factor. Author the IRI with the `http://qudt.org/vocab/...` scheme the corpus uses.

## Output

Report one JSON object (and nothing that contradicts it):

```json
{
  "slice": "<slice id>",
  "filesWritten": ["packages/content/content/<collection>/<slug>.yaml", "…/<slug>.es.yaml"],
  "flagsPerItem": { "<collection>/<slug>": ["MR", "G:asin"] },
  "references": { "<collection>/<slug>": [{ "title": "…", "url": "…" }] },
  "identities": { "<collection>/<slug>": { "wikidata": "Q…", "wikidataUrl": "…", "qudt": "…" } },
  "values": [{ "file": "…", "field": "value", "value": "…", "sourceUrl": "…" }],
  "deferred": [{ "key": "<collection>/<slug>", "state": "deferred|blocked", "reason": "…" }],
  "missingPrereqs": [{ "key": "<collection>/<slug>", "neededBy": "<collection>/<slug>", "why": "…" }],
  "sharedEdits": [{ "file": "…", "change": "…", "reason": "…" }],
  "openQuestions": [{ "key": "<collection>/<slug>", "question": "…" }],
  "checks": { "contentCheck": "0 errors, N warnings", "quality": "ok" }
}
```

`flagsPerItem` records the flags as implemented, which may differ from the roadmap's hints. An item you could not finish goes in `deferred` with a reason, never half-written: delete a partial file before reporting.
