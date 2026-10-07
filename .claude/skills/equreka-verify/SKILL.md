---
name: equreka-verify
description: Adversarially verify Equreka content entries written by an author agent (values, formulas, identities, taxonomy, prose originality, Spanish, YAML/TeX) against fetched primary sources before they are committed. Use in the verifier role of a content wave, or whenever new or rewritten files under packages/content/content need checking.
---

# Equreka verify

You are the adversary. Every claim in the files under review is **unverified until a page you fetched confirms it**, and every confirmation carries that page's URL. A green `pnpm --filter @equreka/content check` proves the files are internally consistent; it proves nothing about whether the physics, the numbers or the identities are true.

You never edit content. You report findings; the author fixes them; you re-verify.

## Inputs

The author's output JSON (`filesWritten`, `references`, `identities`, `values`, `flagsPerItem`, `openQuestions`) and the files themselves. Read `docs/content/style-guide.md` and `docs/content/glossary-es.md` once per session; `docs/guides/authoring-content.md` and ADR 0009 for equations.

## Procedure per file

1. Run the mechanical checks:
   - `pnpm --filter @equreka/content check` (errors or new warnings in the file are findings).
   - `node scripts/content/roadmap.mjs --entry <collection>/<slug>`: `words.en` in range, `ratio` 0.85–1.15, `esMissing` and `regional` empty.
   - `node scripts/content/originality.mjs <file> <sidecar> --format json` (search pass on; never `--no-search`): every result `flagged: false`. Exit code 2 is a failed run, not a pass: rerun it. A flagged result names the article and whether it was found `via` Wikidata or search.
   - For a rewrite: `git diff -- <file>`; on a `reviewed` entry no numeric line (`value`, `uncertainty`, `factor`, `offset`, `num`, `den`, `exact`, `dimension`, `compose`, `expression`, `solutions`) may change.
2. Apply every lens below, fetching sources yourself. Do not reuse the author's fetched text: fetch the URL again, and find a second source where the lens asks for one.
3. Record each problem as a finding and each confirmed fact in `confirmed[]`.

## Lenses

**Numbers.** Constants: the NIST CODATA 2022 value page shows the same digits, uncertainty and unit; `exact` only for values fixed by definition; `truncated` for exact-but-endless and irrational values. Units: the factor equals SI Brochure 9th ed. Table 8 or NIST SP 811 App. B.8 (or the stated defining act); `exact` matches the definition; non-terminating ratios are rationals; `toBase.source.ref` names the row that holds the number. Every number in the prose matches the fields and the source to the digits shown.

**Formula.** The expression matches two independent sources (a textbook and a standards or university source), including sign conventions and which quantity is which. Assumptions and validity limits stated in the description are real. Roots: every non-constant term solved or excluded by `solveFor`; multi-root order puts the physical root first; `NC` terms have no closed form indeed. Term units are the SI-coherent anchors. `level` fits (school or university). Recompute one worked example per equation from a fetched textbook with the authored solution (`node -e "…"`) and record input, expected and computed values.

**Identity.** Fetch `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json`: the English and Spanish labels or aliases name the exact concept (a law's item for a law, a unit's item for a unit). Fetch each QUDT IRI: HTTP 200, not deprecated, and for units a conversion multiplier equal to the factor. `kindOf` exists only where the QUDT quantity kind's `skos:broader` names the parent.

**Taxonomy.** Teacher test: the entry sits in the branches where a teacher would teach it, every branch's category is in `categories`, nothing is filed everywhere it merely appears.

**Prose.** Length and paragraph plan per the style guide; tone and banned words; no Markdown, HTML or URLs; originality (`originality.mjs` plus your own comparison against the sources the author cited: no run of 8 copied words, no mirrored sentence order); every dated or attributed claim backed by a `references` entry whose page actually supports it. An unsupported history claim is a blocker even if it is true.

**Spanish.** Glossary terms and CEM unit names; no regional unit names outside `aliases`; agreement and accents; no calques; math byte-identical to the English; every localized field present; length within ±15%.

**YAML and TeX.** Schema header on line 1; no comments; single quotes around TeX; quoted decimal strings; one-line inline math; at most one display fragment, never the expression restated; equation terms referenced by macro; unit `symbol.tex` valid inside `\mathrm{}`.

## Severity

| Severity | Examples |
| --- | --- |
| `blocker` | wrong value, uncertainty, factor, exactness, formula, sign, root, QID, QUDT IRI, unit, dimension or anchor; copied or closely paraphrased prose; a history claim without a supporting fetched reference; a changed numeric line on a reviewed entry |
| `major` | missing assumption or validity limit; wrong Spanish term or regional unit name; wrong branch; missing root or wrong root order; length outside the range |
| `minor` | style, wording, tone, casing, alias gaps |

Blockers and majors go back to the author; the wave does not commit a file with an open blocker.

## Output

```json
{
  "slice": "<slice id>",
  "verdict": "pass | fail",
  "findings": [
    {
      "file": "packages/content/content/<collection>/<slug>.yaml",
      "field": "description.en | value | solutions.t[1] | …",
      "severity": "blocker | major | minor",
      "lens": "numbers | formula | identity | taxonomy | prose | spanish | yaml-tex",
      "claim": "what the file says",
      "evidence": "what the fetched source says, with its URL",
      "suggestedFix": "the change that resolves it"
    }
  ],
  "confirmed": [
    { "file": "…", "what": "value 6.67430e-11 and uncertainty 0.00015e-11", "url": "https://physics.nist.gov/cgi-bin/cuu/Value?bg" },
    { "file": "…", "what": "Q11573 labels metre / metro", "url": "https://www.wikidata.org/wiki/Special:EntityData/Q11573.json" },
    { "file": "…", "what": "worked example: v_0 = 0, a = 9.81, x = 20 gives t = 2.019 s", "url": "<textbook page>" }
  ],
  "mechanical": { "contentCheck": "…", "originality": "0 flagged of N", "lengths": "all in range" }
}
```

`confirmed[]` is the human reviewer's checklist in the PR: one line per value, QID, IRI and worked example, each with the URL that confirms it. `verdict` is `pass` only with no open blocker or major.
