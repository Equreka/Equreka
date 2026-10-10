# 0014 — Display units for logarithmic levels

Date: 2026-10-09 · Status: accepted

## Context

A logarithmic level such as the sound intensity level, L_I = 10 lg(I/I₀), is a quantity of dimension one. Its unit, the decibel, is `nonConvertible` (ADR 0003): a level converts into nothing by a factor, so the decibel resolves no factor, stays out of the engine slice and may not anchor a magnitude. The level therefore anchors on `unitless`, and the calculator printed what it knew: the field *Sound intensity level (1)* and the result `L_I = 80 1`, where every reader expects dB.

The same calculator printed a trailing 1 for any plain ratio on `unitless` (`η = 0.8 1`, *Efficiency (1)*), while NIST SP 811 section 7.10 (fetched) says the number 1 generally does not appear in the value of a quantity of dimension one.

The sources agree on how a level is stated. IUPAC Green Book 3.10.3 (fetched) calls the neper, bel and decibel special names for the number 1 for the logarithm of a ratio, and reads `L_P = n dB` as `10 lg(P/P₀) = n`. NIST SP 811 Table 6 (fetched) reads `L_X = m dB` as `lg(X/X₀) = m/10` and requires the nature of the quantity to be stated. A level in decibels is the number of decibels: no conversion is hidden by showing the unit, provided the magnitude is dimension one.

## Decision

- **Field.** A magnitude takes an optional `displayUnit` (ref: units). The schema requires an all-zero authored `dimension` beside it. The `integrity` stage requires the unit to exist, to be `nonConvertible`, and to list the magnitude in its `unitOf` (as a baseUnit must), and the baseUnit to be dimension one.
- **Engine slice.** `compiledMagnitude.displayUnit` is `{ slug, name, symbolTex, symbolText }`. The unit itself stays out of `units`, so the magnitude carries the name and symbol its consumers print. The web converter payload carries `displayUnit: { slug }` on the magnitude, which is all the calculator hook reads.
- **Calculator.** `createCalculatorUnits` gives a term whose magnitude has a display unit the base unit `''`: nothing converts, no unit is offered, and the value enters the solution as typed. Web and mobile label the field and print the result with the display unit's symbol, and the web term table lists the display unit.
- **Unit one.** `isUnitOne` (`@equreka/core`) recognises the unit one by its compiled form (dimension one, factor 1, offset 0), not by slug. Both calculators print no symbol for it, in the field label, the result line, the copied result and mobile's auto-filled constants. A unit-one term stays convertible, so the picker still offers %. Unit pages, the converter, reference tables and the picker keep the symbol 1.
- **Versions.** `SCHEMA_VERSION` goes from 4 to 5: a consumer that ignores `displayUnit` prints a level as a bare number in the unit one and offers it conversions. `CONTENT_PIPELINE_VERSION` stays at 5: verification and math rendering are unchanged, and the new rules run in the uncached `integrity` stage.

## Alternatives rejected

- **A nonConvertible anchor.** Letting the decibel be a baseUnit would put a unit with no factor into the conversion path that ADR 0003 closed to it.
- **A flag on the equation term.** The display unit belongs to the quantity, not to one equation; on the magnitude, every equation that uses the level inherits it.
- **Matching the slug `unitless`.** A rule on the compiled form also covers a compose form that lands on the identity of dimension one.

## Consequences

- A level is authored with `baseUnit: 'unitless'` and `displayUnit: 'decibel'` (or `'neper'`), and the corpus audit at this change found no level on `main`: `ph` keeps none, because IUPAC gives pH the unit 1 (Green Book table 2.13) and no special name.
- Pages outside the calculator (the magnitude page, an equation's related units, the converter) still show the baseUnit.
