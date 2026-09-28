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
3. **Generated prefixed-unit pages** — prefix × base at build instead of one YAML per prefixed unit.
4. **Substances collection or chemistry-category removal** — the category exists with no chemistry-specific entity type.
5. **Lesson/exercise modeling** — `paths` is empty; decide the step grammar before authoring.
6. **Editorial state + numeric provenance** — `status: draft|reviewed`, per-value `source` on unit factors (NIST SP 811 rows), not just on constants. *Implemented.*
7. **Per-term calculator unit selection** — inputs are fixed to the baseUnit; symbol/magnitude terms should accept any compatible unit via the engine registry.
8. **`es` translation sidecar files** — inline `es:` keys do not scale to full descriptions; sidecars enable translation tooling and diffing. *Implemented.*
9. **Branches taxonomy depth** — `categories` is flat; physics needs sub-branches for navigation.
10. **External identifiers** — Wikidata QIDs and QUDT IRIs on units/magnitudes/constants for interoperability and disambiguation. *Implemented.*
