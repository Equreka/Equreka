# 0003 — Data-model audit: verdict, hardening batch, fix-before-scale backlog

Date: 2026-09-09 · Status: accepted

## Context

Before the corpus grows past its migrated v1 seed (148 entities), three independent agents audited the content data model (`@equreka/schema` + the `@equreka/content` pipeline) by corrupt-and-observe: each injected a specific corruption into the corpus and recorded whether the build caught it. All three returned the same verdict — **sound with fixes; keep the structure** (YAML collections, Zod contract, sharded artifact, hand-authored machine-verified solutions). The fixes below are those whose necessity was proven by a corruption that the pipeline silently accepted.

## Findings that motivated the batch

| Corruption injected | Pre-audit behaviour |
| --- | --- |
| Capacitance `T: 4` → `T: 7` | Accepted. Named SI derived units (J, N, W, Pa, V, Ω, C, F, Hz, lm) were authored derivation-free, so their magnitudes' dimension vectors were unverified hand-typed data. |
| `arcminute` as `compose: [degree]` without the 1/60 | Accepted. Compose forms had no scalar, so a missing ratio was unrepresentable, not detectable. |
| Hand-authored `decibel` with `toBase.factor: '0.1'` | Accepted as a linear unit; the converter computed 3 dB = 0.3. |
| `unit.yaml` (symbol `u`, `toBase.factor: '1'`) beside `unitless` | Accepted; surfaced as a bogus "u" unit badge on the Pythagorean calculator. |
| `variables/{a,b,c}` as wiki entities for triangle legs | Accepted; produced "c (c)" labels and a variables collection of placeholder pages. |
| `area-circle.units: [metre]` for an m² result | Accepted; the hand-maintained related-units list had already drifted. |
| `E: m * c` as a solution | Would fail the numeric check only by luck of sampling; there was no dimensional check. |
| `stone: '6.35029'`, `mile: '1609.34' exact: false`, `pi: exact: true` | Accepted; exactness flags were opinions, not derivations. |

## Decision — the should-fix-now batch

1. **Compose gains an exact coefficient.** `compose: { factor?: exactNumber = '1', of: [{ unit, exp }] }`. The pipeline multiplies the coefficient into the rational factor chain. Breaking shape change; every compose-authored file was migrated.
2. **Named SI derived units are compose forms** over base units (joule = kg·m²·s⁻², newton = kg·m·s⁻², watt = J·s⁻¹, pascal = N·m⁻², volt = W·A⁻¹, ohm = V·A⁻¹, coulomb = A·s, farad = C·V⁻¹, hertz = s⁻¹, lumen = cd·sr). They still resolve to factor 1 and anchor their magnitudes. **Derivation whitelist:** only `metre kilogram second ampere kelvin mole candela radian steradian unitless` (and nonConvertible units) may omit a derivation form. Result: every magnitude dimension vector is now verified by composition. Running the rule over the corpus exposed **zero** pre-existing dimension errors — the vectors were correct, but until now that was unprovable.
3. **`nonConvertible` gate.** Units flagged `nonConvertible: true` resolve no factor, are excluded from the engine slice, may not anchor a magnitude, and may not appear in `compose.of` or `prefixOf.base`; a derivation form on such a unit is a schema error. They remain presentation entities.
4. **`unit.yaml` deleted; identity-anchor rule.** A non-compose unit resolving to factor 1 / offset 0 that is not a magnitude's baseUnit is an error naming the anchor it collides with. *Deviation from the audit's draft rule ("at most one identity unit per dimension"):* compose forms landing on the identity are exempt because their identity is a verified consequence of their operands — J·s⁻¹ beside W is legitimate and the engine's golden fixtures assert both. The draft rule would also have forbidden Hz beside Bq (same dimension, distinct magnitudes), which is a real SI case.
5. **Equation-local symbol terms.** `equationTerm` gains `{ kind: 'symbol', label: localizedText, unit?: ref }`. All variable-kind terms in the corpus became symbol terms (Leg/Leg/Hypotenuse, Side length, Radius); `variables/{a,b,c}` deleted; `variables/radius` kept as a genuine wiki entity. `\var{}` annotates variables **or** symbols. The engine slice carries `label`/`unit` for symbol terms so calculator UIs need no second lookup. The engine package is untouched (solutions are keyed by term key).
6. **`equation.units[]` removed.** Related units are derived from terms at emit time into `presentation/equations.json` (magnitude → baseUnit, constant → unit, variable → defaultUnit, symbol → unit); the web reads the presentation slice.
7. **Dimensional-consistency stage** (`pipeline/solution-dimension.ts`, stage `dimensions`): walks each solution AST with dimension algebra and requires the result to equal the target term's dimension. *Deviation:* `abs` preserves its argument's dimension (|Δx| is a length) rather than requiring dimensionless, per first principles.
8. **Exactness audit** against NIST SP 811 Appendix B (see table in the batch report; corrected: stone, mile, imperial-pint, imperial-quart, us-pint; pi flagged inexact/irrational; us-quart rendering normalized). All other toBase factors verified exact-by-definition or already flagged inexact.
9. **Aliases**: 140 authored across 68 entities (US spellings, ASCII Greek, degree-text forms, symbol variants, constant nicknames).
10. **Editor contract**: `dist/schemas/<collection>.schema.json` emitted via `z.toJSONSchema` (input side, draft-07); every content file carries a `# yaml-language-server: $schema=` header; `.vscode/settings.json` wires the globs; `docs/guides/authoring-content.md` documents the authored forms.

`SCHEMA_VERSION` → 2 (engine-slice term shape changed), `CONTENT_PIPELINE_VERSION` → 2 (verification inputs changed).

## Consequences

- A wrong dimension vector, a missing compose ratio, a duplicate identity unit, or a dimensionally inconsistent solution now fails the build instead of shipping.
- Adding a convertible unit requires a derivation. The whitelist is the only place derivation-free authoring is legal; extending it is an ADR-level decision.
- Compose-form aliases of an anchor (J/s) are tolerated, not endorsed; the backlog item on compound units decides their future.

## Fix-before-scale backlog

Recorded here so the next content push does not rediscover them:

1. **Magnitude-less compound units** — `unitOf: []` with a compose-derived dimension, so N·m, J/s, kW·h need no synthetic magnitude; decides whether J/s stays an entity or becomes a watt alias. *Implemented.*
2. **Quantity-kind hierarchy** for dimension-collision clusters (energy/work/heat/torque; Hz/Bq; Gy/Sv) — convertibility is dimension equality today, which is too permissive for some pairs and the reason `A` is synthetic. *Decided in ADR 0006.*
3. **Generated prefixed-unit pages** — prefix × base at build instead of one YAML per prefixed unit. *Implemented (ADR 0007):* the pipeline expands prefix × base at build (`pipeline/prefix-expansion.ts`); a generated unit inherits its base's `unitOf`, `system`, `categories`, `branches` and `status`, and a hand file for the same pair acts as an override.
4. **Substances collection or chemistry-category removal** — the category exists with no chemistry-specific entity type.
5. **Lesson/exercise modeling** — `paths` is empty; decide the step grammar before authoring.
6. **Editorial state + numeric provenance** — `status: draft|reviewed`, per-value `source` on unit factors (NIST SP 811 rows), not just on constants. *Implemented.*
7. **Per-term calculator unit selection** — inputs are fixed to the baseUnit; symbol/magnitude terms should accept any compatible unit via the engine registry.
8. **`es` translation sidecar files** — inline `es:` keys do not scale to full descriptions; sidecars enable translation tooling and diffing. *Implemented.*
9. **Branches taxonomy depth** — `categories` is flat; physics needs sub-branches for navigation. *Implemented:* a `branches` collection (one `category` each, ordered within it); entities list `branches`, each of which must belong to one of the entity's own categories (integrity error, never inferred); every physics/mathematics/chemistry entry has at least one branch (artifact test with an explicit allowlist). Navigation only — the engine slice is unchanged.
10. **External identifiers** — Wikidata QIDs and QUDT IRIs on units/magnitudes/constants for interoperability and disambiguation. *Implemented:* schema field `externalIds: { wikidata?, qudt? }` on every entity (categories and branches gained it in the backlog closeout, below), and authored across the corpus — every hand-authored unit (67, overrides included; generated prefixed units carry none and do not inherit their base's), magnitude (33), constant (8) and prefix (20) has a QID; 60 units, all 33 magnitudes, 6 constants and all 20 prefixes also have a QUDT IRI. Verification: every QID was fetched from `Special:EntityData/<QID>.json` and its English label or alias matched against the entry (units additionally by P2370 conversion value); every QUDT IRI was fetched with `Accept: text/turtle` (HTTP 200, subject block present), checked non-deprecated in the published vocabulary, its `conversionMultiplier`/`conversionOffset` compared with the resolved factor (all equal), and its `qudt:wikidataMatch` or Wikidata's P2968/P8393 cross-reference compared with the chosen QID. Categories and branches carry `wikidata` only, authored in the backlog closeout (see *Backlog disposition*). With identities authored, the orphan-magnitude warning lists nothing.

    **Follow-up — reference-model disagreements found while authoring.** Recorded, not resolved:
    - *Year, decade, century, month are 365-day reckonings.* Our `year` (symbol `a`, 31 536 000 s) is the common year (Q235729, `unit/YR_Common`); QUDT `unit/YR` and Wikidata "year" (Q577) are 365.25 d, and `a` conventionally denotes the Julian annum. `century` (Q578) and `decade` (Q39911) are 100/10 common years, while Wikidata's century converts at 3 155 716 800 s. `month` (Q5151) is 1/12 common year (2 628 000 s), which matches no QUDT unit: `unit/MO` is the synodic month (Wikidata maps Q5151 to it) and `unit/MO_MeanGREGORIAN` is 2 629 746 s — so `month` has no QUDT IRI. Decide whether `year` becomes the Julian year (and `a` moves with it) or is renamed "common year".
    - *Electric potential difference is not a kind of electric potential in either model.* We author `electric-potential-difference.kindOf: 'electric-potential'`; QUDT gives `ElectricPotentialDifference` no `skos:broader`, and Wikidata marks Q77597807 *different from* both electric potential (Q55451) and voltage (Q25428). Our entry also names itself "(Voltage)", which Wikidata and QUDT (`quantitykind/Voltage`) keep distinct; we cite the potential-difference identity. `electromotive-force.kindOf: 'electric-potential'` is consistent with QUDT, whose `ElectromotiveForce` is broader-linked to potential, potential difference and voltage. Re-check this `kindOf` against ADR 0006's QUDT rule.
    - *Time is Wikidata's "duration".* QUDT `quantitykind/Time` is aligned to Q2199864 "duration" by both sides; Wikidata's "time" (Q11471) is the dimension/concept, marked distinct. Our `time` cites Q2199864.
    - *Plane angle.* QUDT declares `PlaneAngle` an exact match of `Angle`, which it aligns to Q1357788 "angular measure"; Wikidata models "plane angle" (Q2849635) as a narrower subclass of it. We cite Q2849635 with `quantitykind/PlaneAngle`.
    - *Electrical resistance has two QUDT kinds.* `quantitykind/ElectricalResistance` (the SI Digital Framework exact match, cited) and `quantitykind/Resistance` (the kind `unit/OHM` points to). Wikidata Q25358 has no QUDT cross-reference.
    - *Foot-pound.* QUDT deprecated `unit/FT-LB_F` (3.3.0) in favour of `FT-LB_F_Energy`/`FT-LB_F_Torque`; we cite `FT-LB_F_Energy`, while Wikidata Q730251 still points at the deprecated ID.
    - *Luminous efficacy.* Wikidata splits luminous efficacy of radiation (Q1504173, QUDT `LuminousEfficacy`, cited — the ISO 80000-7 quantity Φv/Φe) from that of a source (Q3425218, per electrical watt); our description should say which one it means.
    - *Hyperfine caesium frequency and K_cd* have QIDs (Q94196529, Q94199486) but no QUDT constant; `unitless` cites Q199 ("1"), Wikidata's unit-one convention, matching QUDT `unit/UNITLESS`.

## Backlog disposition (2026-09-28)

Closeout of the fix-before-scale backlog above.

| # | Item | Disposition | Where |
| --- | --- | --- | --- |
| 1 | Magnitude-less compound units | Implemented | de0368c |
| 2 | Quantity-kind hierarchy | Implemented | a45a648, ADR 0006 |
| 3 | Generated prefixed-unit pages | Implemented | f45a28f, ADR 0007 |
| 4 | Substances collection or chemistry-category removal | Deferred (product decision) | below |
| 5 | Lesson/exercise modeling | Partially covered; graded exercises deferred | below, ADR 0004 |
| 6 | Editorial state and numeric provenance | Implemented | de0368c |
| 7 | Per-term calculator unit selection | Implemented | bf14ed9 |
| 8 | `es` translation sidecar files | Implemented | bbaf4e3 |
| 9 | Branches taxonomy depth | Implemented | de8d684 |
| 10 | External identifiers | Implemented | de0368c (schema), 0e81c06 (corpus), backlog closeout (categories, branches) |

- **Item 4 (substances), deferred.** There is no content demand: nothing in the corpus needs a substance entity. The chemistry category stays and holds the amount-of-substance content (mole, millimole, Avogadro constant). Design the `substances` collection when the first substance entry is proposed, against that entry's real fields, not ahead of it.
- **Item 5 (exercises), partially covered.** Learning paths with `check` steps (ADR 0004) cover self-assessment inside a lesson. Graded exercises (stored answers, attempts, scoring) are new scope, deferred until a product decision names them.
- **Item 10 closeout.** Categories and branches take `externalIds` (schema, presentation slices and the category and branch web pages through `EntryIdentifiers`; the mobile category screen does not render it). They cite `wikidata` only, because QUDT has no discipline vocabulary. Each QID was fetched from `Special:EntityData/<QID>.json` and its English label compared with the entry:

  | Entity | QID | Wikidata label |
  | --- | --- | --- |
  | physics | Q413 | physics |
  | mathematics | Q395 | mathematics |
  | chemistry | Q2329 | chemistry |
  | mechanics | Q41217 | mechanics |
  | thermodynamics | Q11473 | thermodynamics |
  | electromagnetism | Q11406 | electromagnetism |
  | geometry | Q8087 | geometry |
  | modern-physics | Q658544 | modern physics |
  | amount-of-substance | Q104946 | amount of substance |
  | atomic-structure | Q12355387 | atomic structure |
  | si-system | Q12457 | International System of Units |
  | measurement (Measurement and metrology) | Q394 | metrology |

  No QID for `universal` (an internal grouping of constants and units, not a real-world concept), `arithmetic-and-algebra` (two concepts), `optics-and-photometry` (two concepts) and `waves-and-oscillations` (two concepts). `measurement` cites metrology (Q394, the science of measurement); Q12453 "measurement" is the process, not the discipline. The brief's Q7492 for metrology is wrong: it resolves to a Song dynasty emperor.
- **Reference-model disagreements.** The follow-up note under item 10 is kept as written and remains open.
