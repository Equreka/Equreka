# 0006 — Quantity kinds: `kindOf` hierarchy and kind-scoped unit lists

Date: 2026-09-28 · Status: accepted

## Context

ADR 0003 backlog item 2: convertibility is dimension-vector equality, which is too permissive for dimension-collision clusters. Energy and torque are both kg·m²·s⁻², hertz and becquerel both s⁻¹, gray and sievert both m²·s⁻². QUDT does not treat these as one quantity: it distinguishes *quantity kinds* and relates them with `skos:broader`. The synthetic angle dimension `A` exists because Equreka had no other way to keep rad/s from converting to Hz.

Grouping the corpus's 33 magnitudes by dimension vector gives five same-dimension clusters:

| Dimension | Magnitudes |
| --- | --- |
| L² M T⁻² | energy, work, heat |
| L M T⁻² | force, weight |
| L⁻¹ M T⁻² | pressure, stress |
| L² M T⁻³ I⁻¹ | electric-potential, electric-potential-difference, electromotive-force |
| L² M T⁻³ | power, radiant-flux |

(plane-angle `A` and solid-angle `A²` have different vectors and are untouched.)

## Decision

1. **`magnitude.kindOf?: ref('magnitudes')`**. There is at most one parent, and it is authored on the narrower kind. The rejected alternative was `broaderThan: ref[]`, authored on the parent.
   - **The child names its parent**, so adding a new specialization touches one file. Authoring the list on the parent would mean editing the parent for every new child.
   - **One parent, not SKOS's many.** QUDT's `ElectromotiveForce` has four `skos:broader` targets, and a multi-parent graph makes the kind family a union over a DAG with diamonds. Every cluster in the corpus is a tree. Moving from `kindOf` to `kindOf[]` later is a schema widening, not a rewrite.
2. **Integrity (stage 3).** `kindOf` must resolve, must not be the magnitude itself, must have an **identical dimension vector** (the authored vectors are already verified by composition, ADR 0003), and the chain must be **acyclic**. Cycles are reported once each, starting from the lexicographically smallest member. The cycle finder is the same `graphCycles` the path-prerequisite check now uses. Every violation is a build error.
3. **The engine stays dimension-keyed.** `convert()`, `convertDelta()`, `compatibleUnits()` and `areCompatible()` are unchanged, so no resolved factor moved. The 77 units in `engine.json` are byte-identical before and after, and the 546-test engine suite is green. The additions in `@equreka/engine/units` are:
   - `kindAncestors(graph, slug)` returns the parent chain, nearest first. It is cycle- and dangling-safe.
   - `kindDescendants(graph, slug)` returns every transitive specialization, sorted.
   - `kindFamily(graph, slug)` = self ∪ ancestors ∪ descendants. It never includes siblings.
   - `kindRelations(graph, slug)` returns `{ broader, narrower, sameDimension }`. `sameDimension` is the same-dimension magnitudes outside the family.
   - `UnitRegistry.unitsForMagnitude(slug, scope = 'kind')`. The `'kind'` scope returns units whose `unitOf` meets the kind family, filtered to the magnitude's dimension, so the kind scope is always a subset of the dimension scope and every pair it offers converts. `'dimension'` returns `compatibleUnits(magnitude.dimension)`.

   **Family rule.** A unit of an ancestor measures the child (erg measures work). A unit of a descendant measures the parent (a work unit converts energy). A unit of a sibling does not (a future calorie with `unitOf: [heat]` is hidden from work's converter by default). Magnitude-less compound units (`unitOf: []`) are never in a kind scope and are reachable only through the dimension scope.

   `unitsForMagnitude` was chosen over a `{ kindOf }` option on `compatibleUnits` because the kind family belongs to a magnitude, while `compatibleUnits` is keyed by a unit or a dimension. Overloading it would have made the dimension-keyed call ambiguous.
4. **Artifact.** `compiledMagnitude.kindOf?: slug`, emitted only when authored. `presentation/magnitudes.json` carries it through the entity spread. The change is additive, so `SCHEMA_VERSION` stays 2. The web converter payload now carries each unit's `magnitudes` and each magnitude's `kindOf`. Before this change the island rebuilt its slice with `magnitudes: []` stubs, which would have silently emptied every kind scope. A round-trip unit test (`apps/web/src/lib/__tests__/converter-slice.test.ts`) now asserts that the client registry computes the same kind and dimension scopes as the full slice for every magnitude.
5. **UI (web and mobile, shared logic in `@equreka/core/converter`).**
   - `converterUnits(registry, magnitude, showAllDimension)` returns `{ units, hiddenByKind }`.
   - `pickUnitPair(units, baseUnit, preferred)` keeps the user's from/to across a scope toggle when they are still offered. Otherwise it falls back to the base unit and then the first other unit.
   - The converter opens on the kind scope. The **"Show all units with this dimension (+N)"** control (a web checkbox, a mobile `SwitchField`) is rendered **only when `hiddenByKind > 0`**, so it never appears as a control that changes nothing. A convert link whose `from` unit exists only in the dimension scope (a magnitude-less compound unit) opens already widened.
   - Magnitude pages on both platforms list **Broader kind** (the nearest parent), **Narrower kinds**, and **Same dimension** (siblings and unrelated same-dimension kinds, with a hint that their units convert numerically but name a different physical quantity).
   - The unit table on both platforms now uses the kind scope. Before, web listed direct `unitOf` only and mobile listed the whole dimension; the two disagreed. On the web, work's table gains erg and foot-pound.
   - i18n keys (en/es): `converter.showAllDimension`, `converter.showAllDimensionHint`, `magnitude.broaderKind`, `magnitude.narrowerKinds`, `magnitude.sameDimension`, `magnitude.sameDimensionHint`. `magnitude.unitsLead` is reworded to cover the kind family.

## `kindOf` authored

Each edge was checked against the live QUDT vocabulary on 2026-09-28:

| Magnitude | `kindOf` | QUDT evidence |
| --- | --- | --- |
| work | energy | `quantitykind:Work skos:broader quantitykind:Energy` |
| heat | energy | `Heat skos:broader ThermalEnergy`. Energy is the nearest kind in the corpus; the intermediate is collapsed. |
| weight | force | `Weight skos:broader Force` |
| electromotive-force | electric-potential | `ElectromotiveForce skos:broader ElectricPotential, ElectricPotentialDifference, EnergyPerElectricCharge, Voltage`. One parent is kept (decision 1). |
| electric-potential-difference | electric-potential | QUDT records `exactMatch` to ElectricPotential and Voltage, not `broader`. See the deviations. |
| radiant-flux | power | `RadiantFlux skos:broader Power`. This pair was found by the cluster scan; it was not in the brief. |

## Deviations from the implementation brief

- **`stress.kindOf = pressure` is not authored.** QUDT gives `Pressure skos:broader ForcePerArea` and `Stress skos:broader ForcePerArea`: they are siblings, not parent and child. Authoring the brief's edge would encode a false claim. They stay unrelated same-dimension kinds, and each page lists the other under *Same dimension*. Nothing is lost today, because pascal lists both. When a pressure-only unit (bar, atm, mmHg) or a stress-only unit lands, the correct model is a `force-per-area` head kind with both as children. That head is deferred until a unit needs it: minted now, it would be an orphan magnitude.
- **electric-potential-difference is a kindOf edge over a QUDT equivalence.** QUDT treats it as the same kind as electric potential. The edge gives the right converter behaviour (a shared family), but the accurate fix is to fold it into `electric-potential` as an alias. That changes a public URL, so it is recorded as a follow-up content decision, not taken here.
- **The dimension toggle is conditional.** The brief asked for an explicit "show all with this dimension" toggle. It is rendered only when it would widen the list; see the finding below for why.

## Finding: zero list changes in today's corpus

A probe over the built slice shows that for **every** magnitude the kind scope equals the dimension scope. Every unit of a sibling kind is the shared SI anchor (joule, newton, pascal, volt and watt list their whole cluster). The non-anchor units in collision clusters (erg, foot-pound, joule-per-second) belong to the parent kind. And no torque, activity or dose magnitude exists yet. So the toggle renders nowhere in the shipped corpus, and the default converter lists are unchanged. The hierarchy is fix-before-scale in the ADR 0003 sense: the first `torque` magnitude with `newton-metre`, the first `becquerel` beside `hertz`, or the first `calorie` authored for `heat` will be scoped correctly without further code. What users see today is the kind relations on magnitude pages and the aligned unit tables.

## Not decided here

- **The synthetic `A` dimension stays.** The kind hierarchy is the mechanism that could replace it (rad/s and Hz as unrelated kinds of one dimension). But retiring `A` changes compiled dimension vectors and the engine's `convert()` contract, which this wave forbids. That needs its own ADR, and the golden suite would have to be re-derived.
- `kindOf` does not count as a "use" in the orphan-magnitudes warning. A kind edge between two synthetic magnitudes must not silence it. Authoring `externalIds.qudt` for the QUDT-verified kinds above is the intended way to clear those entries and is left to the external-identifiers content pass.

## Consequences

- A false kind claim across dimensions, or a cycle, fails the build.
- New dimension-collision content is scoped by authoring a `kindOf` edge (or deliberately none). No engine or UI change is needed.
- The converter never offers a pair `convert()` would reject, because the kind scope is a subset of the dimension scope.
- Content authors check QUDT `skos:broader` before authoring `kindOf` (`docs/guides/authoring-content.md`).
