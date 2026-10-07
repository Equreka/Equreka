# Originality baseline

This is the first run of the originality check (ADR 0011) over the corpus, as migrated from the legacy app. That run (`--apply`) gave every flagged description a `textSources` entry crediting the matched article, so every flagged row reads *Attributed: yes*. The prose itself is unchanged: it is legacy text, and the rewrite wave replaces it with original writing.

The rewrite wave clears this list. A rewritten description leaves it when a re-run (`node scripts/content/originality.mjs <file>`) no longer flags it. In the same change, its Wikipedia `textSources` entry is deleted, and from then on `--check` fails if a later edit makes it flag again without attribution.

*Below the threshold* and *Not checkable* do not mean original. The check compares against today's revision of each article, and the legacy text was copied years earlier, so a passage Wikipedia has since reworded escapes it. `magnitudes/plane-angle`, `units/delisle`, `units/rankine` and several branch descriptions read as encyclopedia prose. The rewrite wave rewrites every legacy description, whatever its row says here.

- Date: 2026-10-06
- Command: `node scripts/content/originality.mjs --apply --out docs/content/originality-baseline.md`
- Rule: 8-word shingles over normalized text (TeX, punctuation, case and diacritics removed). A description is flagged when its longest run shared with the article is at least 8 words or at least 15.0% of its shingles occur in the article.
- Sources: the article the entry's Wikidata item links (via `wikidata`); a description that article does not flag, or that has none, is also compared with the hits of phrase searches for up to 5 of its shingles spread across it (via `search`), keeping the strongest hit that meets both rules (a search hit is not the entry's own article, so one shared stock phrase is not enough).
- Summary: 139 descriptions checked, 97 flagged (0 without attribution), 28 not checkable.

## Flagged (97)

| Entry | Lang | Article | Via | Longest run (words) | Shared shingles | Overlap | Attributed |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| units/inch | en | [Inch](https://en.wikipedia.org/wiki/Inch) | wikidata | 67 | 60/60 | 100.0% | yes |
| magnitudes/luminous-flux | en | [Luminous flux](https://en.wikipedia.org/wiki/Luminous_flux) | wikidata | 56 | 49/49 | 100.0% | yes |
| magnitudes/length | en | [Length](https://en.wikipedia.org/wiki/Length) | wikidata | 54 | 47/47 | 100.0% | yes |
| magnitudes/luminous-intensity | en | [Luminous intensity](https://en.wikipedia.org/wiki/Luminous_intensity) | wikidata | 54 | 47/47 | 100.0% | yes |
| magnitudes/substance | en | [2019 revision of the SI](https://en.wikipedia.org/wiki/2019_revision_of_the_SI) | search | 40 | 33/33 | 100.0% | yes |
| units/ounce | en | [Ounce](https://en.wikipedia.org/wiki/Ounce) | wikidata | 34 | 27/27 | 100.0% | yes |
| prefixes/hecto | en | [Hecto-](https://en.wikipedia.org/wiki/Hecto-) | wikidata | 69 | 62/63 | 98.4% | yes |
| prefixes/centi | en | [Centi-](https://en.wikipedia.org/wiki/Centi-) | wikidata | 48 | 41/43 | 95.3% | yes |
| prefixes/deci | en | [Deci-](https://en.wikipedia.org/wiki/Deci-) | wikidata | 41 | 34/38 | 89.5% | yes |
| magnitudes/entropy | en | [Maximum entropy](https://en.wikipedia.org/wiki/Maximum_entropy) | search | 23 | 16/18 | 88.9% | yes |
| units/foot-pound | en | [Foot-pound](https://en.wikipedia.org/wiki/Foot-pound) | wikidata | 50 | 43/49 | 87.8% | yes |
| magnitudes/electrical-resistance | en | [Electrical resistance and conductance](https://en.wikipedia.org/wiki/Electrical_resistance_and_conductance) | wikidata | 60 | 53/61 | 86.9% | yes |
| units/newton-degree | en | [Newton scale](https://en.wikipedia.org/wiki/Newton_scale) | search | 66 | 98/113 | 86.7% | yes |
| units/century | en | [Century](https://en.wikipedia.org/wiki/Century) | wikidata | 31 | 24/28 | 85.7% | yes |
| prefixes/mega | en | [Mega-](https://en.wikipedia.org/wiki/Mega-) | wikidata | 32 | 34/41 | 82.9% | yes |
| constants/hyperfine-transition-frequency-of-caesium | en | [Caesium standard](https://en.wikipedia.org/wiki/Caesium_standard) | search | 62 | 59/72 | 81.9% | yes |
| magnitudes/solid-angle | en | [Solid angle](https://en.wikipedia.org/wiki/Solid_angle) | wikidata | 65 | 118/145 | 81.4% | yes |
| prefixes/milli | en | [Milli-](https://en.wikipedia.org/wiki/Milli-) | wikidata | 35 | 35/44 | 79.5% | yes |
| units/cubic-metre | en | [Cubic metre](https://en.wikipedia.org/wiki/Cubic_metre) | wikidata | 49 | 62/78 | 79.5% | yes |
| prefixes/nano | en | [Nano-](https://en.wikipedia.org/wiki/Nano-) | wikidata | 31 | 36/46 | 78.3% | yes |
| units/pound | en | [Pound (mass)](https://en.wikipedia.org/wiki/Pound_(mass)) | wikidata | 53 | 60/79 | 75.9% | yes |
| prefixes/deca | en | [Deca-](https://en.wikipedia.org/wiki/Deca-) | wikidata | 113 | 130/172 | 75.6% | yes |
| magnitudes/pressure | en | [Pressure](https://en.wikipedia.org/wiki/Pressure) | wikidata | 63 | 111/151 | 73.5% | yes |
| magnitudes/time | en | [Time in physics](https://en.wikipedia.org/wiki/Time_in_physics) | search | 26 | 25/35 | 71.4% | yes |
| units/square-metre | en | [Square metre](https://en.wikipedia.org/wiki/Square_metre) | wikidata | 22 | 15/22 | 68.2% | yes |
| equations/area-circle | en | [Area of a circle](https://en.wikipedia.org/wiki/Area_of_a_circle) | search | 23 | 34/50 | 68.0% | yes |
| magnitudes/radiant-flux | en | [Radiant flux](https://en.wikipedia.org/wiki/Radiant_flux) | wikidata | 58 | 61/90 | 67.8% | yes |
| magnitudes/force | en | [Glossary of aerospace engineering](https://en.wikipedia.org/wiki/Glossary_of_aerospace_engineering) | search | 43 | 47/72 | 65.3% | yes |
| units/fahrenheit | en | [Fahrenheit](https://en.wikipedia.org/wiki/Fahrenheit) | wikidata | 23 | 16/25 | 64.0% | yes |
| magnitudes/work | en | [Work (physics)](https://en.wikipedia.org/wiki/Work_(physics)) | wikidata | 40 | 50/79 | 63.3% | yes |
| prefixes/giga | en | [Giga-](https://en.wikipedia.org/wiki/Giga-) | wikidata | 20 | 17/27 | 63.0% | yes |
| categories/mathematics | en | [Glossary of engineering: M–Z](https://en.wikipedia.org/wiki/Glossary_of_engineering:_M%E2%80%93Z) | search | 22 | 15/24 | 62.5% | yes |
| units/month | en | [Month](https://en.wikipedia.org/wiki/Month) | wikidata | 18 | 14/23 | 60.9% | yes |
| magnitudes/stress | en | [Stress (mechanics)](https://en.wikipedia.org/wiki/Stress_(mechanics)) | wikidata | 22 | 17/28 | 60.7% | yes |
| magnitudes/area | en | [Area](https://en.wikipedia.org/wiki/Area) | wikidata | 48 | 54/92 | 58.7% | yes |
| magnitudes/electric-charge | en | [Electric charge](https://en.wikipedia.org/wiki/Electric_charge) | wikidata | 27 | 44/78 | 56.4% | yes |
| units/nautical-mile | en | [Nautical mile](https://en.wikipedia.org/wiki/Nautical_mile) | wikidata | 42 | 70/135 | 51.9% | yes |
| units/mile | en | [Mile](https://en.wikipedia.org/wiki/Mile) | wikidata | 25 | 38/74 | 51.4% | yes |
| magnitudes/power | en | [Power (physics)](https://en.wikipedia.org/wiki/Power_(physics)) | wikidata | 25 | 19/39 | 48.7% | yes |
| magnitudes/heat | en | [Thermal energy](https://en.wikipedia.org/wiki/Thermal_energy) | search | 23 | 16/34 | 47.1% | yes |
| units/ohm | en | [Ohm](https://en.wikipedia.org/wiki/Ohm) | wikidata | 49 | 67/147 | 45.6% | yes |
| units/joule-second | en | [Joule-second](https://en.wikipedia.org/wiki/Joule-second) | wikidata | 24 | 19/42 | 45.2% | yes |
| units/us-quart | en | [Quart](https://en.wikipedia.org/wiki/Quart) | search | 28 | 34/76 | 44.7% | yes |
| units/tonne | en | [Tonne](https://en.wikipedia.org/wiki/Tonne) | wikidata | 17 | 24/58 | 41.4% | yes |
| units/us-pint | en | [Pint](https://en.wikipedia.org/wiki/Pint) | search | 24 | 32/79 | 40.5% | yes |
| units/farad | en | [Farad](https://en.wikipedia.org/wiki/Farad) | wikidata | 24 | 54/137 | 39.4% | yes |
| magnitudes/electric-potential | en | [Electric potential](https://en.wikipedia.org/wiki/Electric_potential) | wikidata | 53 | 46/117 | 39.3% | yes |
| units/foot | en | [Foot (unit)](https://en.wikipedia.org/wiki/Foot_(unit)) | wikidata | 20 | 23/59 | 39.0% | yes |
| units/candela | en | [Candela](https://en.wikipedia.org/wiki/Candela) | wikidata | 34 | 31/80 | 38.8% | yes |
| units/metre-per-second | en | [Metre per second](https://en.wikipedia.org/wiki/Metre_per_second) | wikidata | 19 | 12/31 | 38.7% | yes |
| units/year | en | [Year](https://en.wikipedia.org/wiki/Year) | search | 20 | 18/47 | 38.3% | yes |
| magnitudes/volume | en | [Volume](https://en.wikipedia.org/wiki/Volume) | wikidata | 39 | 32/84 | 38.1% | yes |
| units/stone | en | [Stone (unit)](https://en.wikipedia.org/wiki/Stone_(unit)) | wikidata | 18 | 11/30 | 36.7% | yes |
| units/joule | en | [Joule](https://en.wikipedia.org/wiki/Joule) | wikidata | 37 | 32/90 | 35.6% | yes |
| units/decade | en | [Decade](https://en.wikipedia.org/wiki/Decade) | wikidata | 23 | 16/45 | 35.6% | yes |
| variables/radius | en | [Radius](https://en.wikipedia.org/wiki/Radius) | search | 18 | 25/71 | 35.2% | yes |
| magnitudes/weight | en | [Weight](https://en.wikipedia.org/wiki/Weight) | wikidata | 10 | 4/12 | 33.3% | yes |
| units/yard | en | [Yard](https://en.wikipedia.org/wiki/Yard) | wikidata | 17 | 13/41 | 31.7% | yes |
| units/minute | en | [Minute](https://en.wikipedia.org/wiki/Minute) | wikidata | 19 | 15/49 | 30.6% | yes |
| constants/speed-of-light | en | [Speed of light](https://en.wikipedia.org/wiki/Speed_of_light) | wikidata | 27 | 22/72 | 30.6% | yes |
| units/long-ton | en | [Long ton](https://en.wikipedia.org/wiki/Long_ton) | wikidata | 25 | 19/64 | 29.7% | yes |
| magnitudes/angular-momentum | en | [Angular momentum](https://en.wikipedia.org/wiki/Angular_momentum) | wikidata | 21 | 26/91 | 28.6% | yes |
| units/watt | en | [Watt](https://en.wikipedia.org/wiki/Watt) | wikidata | 14 | 15/53 | 28.3% | yes |
| units/pascal | en | [Pascal (unit)](https://en.wikipedia.org/wiki/Pascal_(unit)) | wikidata | 20 | 13/48 | 27.1% | yes |
| units/litre | en | [Litre](https://en.wikipedia.org/wiki/Litre) | wikidata | 13 | 12/50 | 24.0% | yes |
| constants/pi | en | [Pi](https://en.wikipedia.org/wiki/Pi) | wikidata | 19 | 18/78 | 23.1% | yes |
| units/short-ton | en | [Short ton](https://en.wikipedia.org/wiki/Short_ton) | wikidata | 13 | 6/27 | 22.2% | yes |
| units/hour | en | [Hour](https://en.wikipedia.org/wiki/Hour) | wikidata | 13 | 7/35 | 20.0% | yes |
| units/ampere | en | [Ampere](https://en.wikipedia.org/wiki/Ampere) | wikidata | 13 | 7/36 | 19.4% | yes |
| prefixes/micro | en | [Micro-](https://en.wikipedia.org/wiki/Micro-) | wikidata | 15 | 20/104 | 19.2% | yes |
| units/lumen | en | [Lumen (unit)](https://en.wikipedia.org/wiki/Lumen_(unit)) | wikidata | 20 | 14/73 | 19.2% | yes |
| categories/physics | en | [Physics](https://en.wikipedia.org/wiki/Physics) | wikidata | 16 | 10/53 | 18.9% | yes |
| units/hertz | en | [Hertz](https://en.wikipedia.org/wiki/Hertz) | wikidata | 10 | 5/27 | 18.5% | yes |
| magnitudes/electric-potential-difference | en | [Voltage](https://en.wikipedia.org/wiki/Voltage) | wikidata | 16 | 12/71 | 16.9% | yes |
| magnitudes/luminous-efficacy | en | [Luminous efficacy](https://en.wikipedia.org/wiki/Luminous_efficacy) | wikidata | 12 | 5/32 | 15.6% | yes |
| magnitudes/frequency | en | [Frequency](https://en.wikipedia.org/wiki/Frequency) | wikidata | 14 | 7/48 | 14.6% | yes |
| units/metre | en | [Metre](https://en.wikipedia.org/wiki/Metre) | wikidata | 13 | 6/42 | 14.3% | yes |
| units/second | en | [Second](https://en.wikipedia.org/wiki/Second) | wikidata | 11 | 6/42 | 14.3% | yes |
| magnitudes/capacitance | en | [Capacitance](https://en.wikipedia.org/wiki/Capacitance) | wikidata | 12 | 7/50 | 14.0% | yes |
| units/newton | en | [Newton (unit)](https://en.wikipedia.org/wiki/Newton_(unit)) | wikidata | 14 | 7/51 | 13.7% | yes |
| categories/chemistry | en | [Chemistry](https://en.wikipedia.org/wiki/Chemistry) | wikidata | 10 | 3/25 | 12.0% | yes |
| branches/si-system | en | [International System of Units](https://en.wikipedia.org/wiki/International_System_of_Units) | wikidata | 11 | 4/38 | 10.5% | yes |
| units/radian | en | [Radian](https://en.wikipedia.org/wiki/Radian) | wikidata | 14 | 7/67 | 10.4% | yes |
| prefixes/kilo | en | [Kilo-](https://en.wikipedia.org/wiki/Kilo-) | wikidata | 11 | 4/39 | 10.3% | yes |
| units/steradian | en | [Steradian](https://en.wikipedia.org/wiki/Steradian) | wikidata | 17 | 13/127 | 10.2% | yes |
| units/volt | en | [Volt](https://en.wikipedia.org/wiki/Volt) | wikidata | 9 | 2/21 | 9.5% | yes |
| magnitudes/electromotive-force | en | [Electromotive force](https://en.wikipedia.org/wiki/Electromotive_force) | wikidata | 13 | 6/72 | 8.3% | yes |
| magnitudes/energy | en | [Energy](https://en.wikipedia.org/wiki/Energy) | wikidata | 13 | 6/75 | 8.0% | yes |
| units/erg | en | [Erg (unit)](https://en.wikipedia.org/wiki/Erg_(unit)) | wikidata | 9 | 2/25 | 8.0% | yes |
| prefixes/tera | en | [Tera-](https://en.wikipedia.org/wiki/Tera-) | wikidata | 10 | 5/69 | 7.2% | yes |
| units/imperial-gallon | en | [Gallon](https://en.wikipedia.org/wiki/Gallon) | wikidata | 8 | 1/15 | 6.7% | yes |
| magnitudes/electric-current | en | [Electric current](https://en.wikipedia.org/wiki/Electric_current) | wikidata | 8 | 2/34 | 5.9% | yes |
| units/gram | en | [Gram](https://en.wikipedia.org/wiki/Gram) | wikidata | 9 | 2/52 | 3.8% | yes |
| units/kelvin | en | [Kelvin](https://en.wikipedia.org/wiki/Kelvin) | wikidata | 8 | 1/31 | 3.2% | yes |
| units/week | en | [Week](https://en.wikipedia.org/wiki/Week) | wikidata | 8 | 1/31 | 3.2% | yes |
| units/celsius | en | [Celsius](https://en.wikipedia.org/wiki/Celsius) | wikidata | 8 | 1/39 | 2.6% | yes |
| constants/avogadro-constant | en | [Avogadro constant](https://en.wikipedia.org/wiki/Avogadro_constant) | wikidata | 8 | 1/63 | 1.6% | yes |

## Below the threshold (42)

| Entry | Lang | Article | Via | Longest run (words) | Shared shingles | Overlap | Attributed |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| units/mole | en | [Mole (unit)](https://en.wikipedia.org/wiki/Mole_(unit)) | wikidata | 7 | 0/25 | 0.0% | no |
| units/us-gallon | en | [Gallon](https://en.wikipedia.org/wiki/Gallon) | wikidata | 7 | 0/20 | 0.0% | no |
| constants/elementary-charge | en | [Elementary charge](https://en.wikipedia.org/wiki/Elementary_charge) | wikidata | 6 | 0/49 | 0.0% | no |
| prefixes/exa | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 6 | 0/45 | 0.0% | no |
| prefixes/femto | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 6 | 0/45 | 0.0% | no |
| prefixes/peta | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 6 | 0/76 | 0.0% | no |
| prefixes/pico | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 6 | 0/52 | 0.0% | no |
| prefixes/zepto | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 6 | 0/31 | 0.0% | no |
| prefixes/zetta | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 6 | 0/37 | 0.0% | no |
| units/coulomb | en | [Coulomb](https://en.wikipedia.org/wiki/Coulomb) | wikidata | 6 | 0/48 | 0.0% | no |
| units/kilogram | en | [Kilogram](https://en.wikipedia.org/wiki/Kilogram) | wikidata | 6 | 0/57 | 0.0% | no |
| units/micrometre | en | [Micrometre](https://en.wikipedia.org/wiki/Micrometre) | wikidata | 6 | 0/31 | 0.0% | no |
| branches/atomic-structure | en | [Atom](https://en.wikipedia.org/wiki/Atom) | wikidata | 5 | 0/35 | 0.0% | no |
| branches/electromagnetism | en | [Electromagnetism](https://en.wikipedia.org/wiki/Electromagnetism) | wikidata | 5 | 0/31 | 0.0% | no |
| branches/geometry | en | [Geometry](https://en.wikipedia.org/wiki/Geometry) | wikidata | 5 | 0/28 | 0.0% | no |
| branches/geometry | es | [Geometría](https://es.wikipedia.org/wiki/Geometr%C3%ADa) | wikidata | 5 | 0/35 | 0.0% | no |
| branches/modern-physics | es | [Física moderna](https://es.wikipedia.org/wiki/F%C3%ADsica_moderna) | wikidata | 5 | 0/48 | 0.0% | no |
| branches/si-system | es | [Sistema Internacional de Unidades](https://es.wikipedia.org/wiki/Sistema_Internacional_de_Unidades) | wikidata | 5 | 0/37 | 0.0% | no |
| branches/thermodynamics | en | [Thermodynamics](https://en.wikipedia.org/wiki/Thermodynamics) | wikidata | 5 | 0/34 | 0.0% | no |
| constants/planck-constant | en | [Planck constant](https://en.wikipedia.org/wiki/Planck_constant) | wikidata | 5 | 0/88 | 0.0% | no |
| magnitudes/thermodynamic-temperature | en | [Thermodynamic temperature](https://en.wikipedia.org/wiki/Thermodynamic_temperature) | wikidata | 5 | 0/56 | 0.0% | no |
| units/centimetre | en | [Centimetre](https://en.wikipedia.org/wiki/Centimetre) | wikidata | 5 | 0/39 | 0.0% | no |
| units/imperial-pint | en | [Pint](https://en.wikipedia.org/wiki/Pint) | wikidata | 5 | 0/15 | 0.0% | no |
| branches/amount-of-substance | en | [Amount of substance](https://en.wikipedia.org/wiki/Amount_of_substance) | wikidata | 4 | 0/39 | 0.0% | no |
| branches/amount-of-substance | es | [Cantidad de sustancia](https://es.wikipedia.org/wiki/Cantidad_de_sustancia) | wikidata | 4 | 0/43 | 0.0% | no |
| branches/atomic-structure | es | [Átomo](https://es.wikipedia.org/wiki/%C3%81tomo) | wikidata | 4 | 0/37 | 0.0% | no |
| branches/electromagnetism | es | [Electromagnetismo](https://es.wikipedia.org/wiki/Electromagnetismo) | wikidata | 4 | 0/43 | 0.0% | no |
| branches/measurement | en | [Metrology](https://en.wikipedia.org/wiki/Metrology) | wikidata | 4 | 0/40 | 0.0% | no |
| branches/measurement | es | [Metrología](https://es.wikipedia.org/wiki/Metrolog%C3%ADa) | wikidata | 4 | 0/49 | 0.0% | no |
| branches/mechanics | es | [Mecánica](https://es.wikipedia.org/wiki/Mec%C3%A1nica) | wikidata | 4 | 0/59 | 0.0% | no |
| branches/modern-physics | en | [Modern physics](https://en.wikipedia.org/wiki/Modern_physics) | wikidata | 4 | 0/34 | 0.0% | no |
| branches/thermodynamics | es | [Termodinámica](https://es.wikipedia.org/wiki/Termodin%C3%A1mica) | wikidata | 4 | 0/44 | 0.0% | no |
| constants/boltzmann-constant | en | [Boltzmann constant](https://en.wikipedia.org/wiki/Boltzmann_constant) | wikidata | 4 | 0/50 | 0.0% | no |
| magnitudes/speed | en | [Speed](https://en.wikipedia.org/wiki/Speed) | wikidata | 4 | 0/41 | 0.0% | no |
| prefixes/atto | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 4 | 0/36 | 0.0% | no |
| prefixes/yocto | en | [Metric prefix](https://en.wikipedia.org/wiki/Metric_prefix) | wikidata | 4 | 0/42 | 0.0% | no |
| units/microgram | en | [Microgram](https://en.wikipedia.org/wiki/Microgram) | wikidata | 4 | 0/35 | 0.0% | no |
| branches/mechanics | en | [Mechanics](https://en.wikipedia.org/wiki/Mechanics) | wikidata | 3 | 0/40 | 0.0% | no |
| magnitudes/mass | en | [Mass](https://en.wikipedia.org/wiki/Mass) | wikidata | 3 | 0/9 | 0.0% | no |
| prefixes/yotta | en | [Orders of magnitude (numbers)](https://en.wikipedia.org/wiki/Orders_of_magnitude_(numbers)) | wikidata | 3 | 0/51 | 0.0% | no |
| units/day | en | [Day](https://en.wikipedia.org/wiki/Day) | wikidata | 3 | 0/20 | 0.0% | no |
| units/unitless | en | [1](https://en.wikipedia.org/wiki/1) | wikidata | 3 | 0/82 | 0.0% | no |

## Not checkable (28)

| Entry | Lang | Reason |
| --- | --- | --- |
| branches/arithmetic-and-algebra | en | no externalIds.wikidata, no phrase-search match |
| branches/arithmetic-and-algebra | es | no externalIds.wikidata, no phrase-search match |
| branches/optics-and-photometry | en | no externalIds.wikidata, no phrase-search match |
| branches/optics-and-photometry | es | no externalIds.wikidata, no phrase-search match |
| branches/waves-and-oscillations | en | no externalIds.wikidata, no phrase-search match |
| branches/waves-and-oscillations | es | no externalIds.wikidata, no phrase-search match |
| categories/universal | en | no externalIds.wikidata, no phrase-search match |
| constants/luminous-efficacy-of-radiation | en | no enwiki article for Q94199486, no phrase-search match |
| equations/area-square | en | no externalIds.wikidata, no phrase-search match |
| equations/mass-energy-equivalence | en | no externalIds.wikidata, no phrase-search match |
| equations/pythagorean-theorem | en | no externalIds.wikidata, no phrase-search match |
| magnitudes/plane-angle | en | no enwiki article for Q2849635, no phrase-search match |
| paths/energy-work-heat | en | no externalIds.wikidata, no phrase-search match |
| paths/energy-work-heat | es | no externalIds.wikidata, no phrase-search match |
| paths/geometry-of-circles-and-triangles | en | no externalIds.wikidata, no phrase-search match |
| paths/geometry-of-circles-and-triangles | es | no externalIds.wikidata, no phrase-search match |
| paths/si-base-units | en | no externalIds.wikidata, no phrase-search match |
| paths/si-base-units | es | no externalIds.wikidata, no phrase-search match |
| paths/temperature-scales | en | no externalIds.wikidata, no phrase-search match |
| paths/temperature-scales | es | no externalIds.wikidata, no phrase-search match |
| units/delisle | en | no enwiki article for Q68726230, no phrase-search match |
| units/imperial-quart | en | no enwiki article for Q98793302, no phrase-search match |
| units/joule-per-kelvin | en | no enwiki article for Q21393312, no phrase-search match |
| units/joule-per-second | en | no enwiki article for Q92711514, no phrase-search match |
| units/rankine | en | no enwiki article for Q37732658, no phrase-search match |
| units/reaumur | en | no enwiki article for Q68725243, no phrase-search match |
| units/reciprocal-mole | en | no enwiki article for Q68712008, no phrase-search match |
| units/romer | en | no enwiki article for Q68725821, no phrase-search match |
