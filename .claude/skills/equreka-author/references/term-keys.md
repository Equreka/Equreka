# Term keys, identifiers and solutions

The contract is ADR 0009 and the *equations* section of `docs/guides/authoring-content.md`; this is the working cookbook.

## Keys and identifiers

A term key is the term's symbol as it should render (strict KaTeX), used as the macro argument in `expression` and as the key of `terms` and `solutions`. The identifier is what solutions use: wrappers (`\mathrm \text \mathit \mathbf \boldsymbol \operatorname \mathsf \mathtt \textrm`) unwrapped, then everything outside `[A-Za-z0-9_]` dropped.

| Key | Identifier | Note |
| --- | --- | --- |
| `v` | `v` | |
| `v_{0}` | `v_0` | never `\var{v}_{0}`: the subscript belongs inside the macro |
| `t_{1/2}` | `t_12` | half-life |
| `\theta` | `theta` | angle: `plane-angle` magnitude or a symbol with `unit: 'radian'` |
| `\Delta T` | `DeltaT` | a difference: `delta: true` |
| `E_\mathrm{k}` | `E_k` | descriptive subscripts upright, written without the outer braces |
| `c_\mathrm{A}` | `c_A` | concentrations are `c_\mathrm{A}`, never `[A]` in kinetics |
| `K_\mathrm{a}` | `K_a` | |
| `v_\mathrm{AB}` | `v_AB` | a multi-letter upright subscript; the italic `v_{AB}` warns |
| `\mathrm{pH}` | `pH` | |
| `\mathrm{KE}` | `KE` | a bare `KE` warns (it typesets as K times E) |
| `'[\mathrm{H}^{+}]'` | override `identifier: 'cH'` | derives a bare `H`; quote keys starting with `[` or `{` |

Rules: braces nest at most one level, so a braced upright subscript (`E_{\mathrm{k}}`, `t_{\mathrm{r}}`, `h_{\mathrm{max}}`) is rejected by the integrity stage: write `E_\mathrm{k}`, or a standard command in one brace level such as `h_{\max}` or `F_{\parallel}`; no `$`, line breaks or edge spaces; identifiers unique within the equation (`v_0` and `v_{0}` collide); never a grammar function name (`sqrt abs ln exp sin cos tan asin acos atan log10 log2 cbrt sinh cosh tanh asinh acosh atanh factorial`), never an `Object.prototype` name, and `pi` only for the constant term `ref: 'pi'`.

## Choosing term kinds and anchors

| The term is | Kind | Anchor |
| --- | --- | --- |
| a quantity with a wiki magnitude of exactly that meaning | `magnitude` | the magnitude's `baseUnit` |
| a physical or mathematical constant entry | `constant` | the constant's `unit` (SI-coherent) |
| a wiki variable (`radius`) | `variable` | its `defaultUnit` |
| anything else (legs, coefficients, rates, counts) | `symbol` with `label` | `unit`: the SI-coherent unit of its dimension; omit for dimensionless |

Anchors are always factor 1, offset 0: radian not degree, kelvin not Celsius, metre not kilometre, joule not electronvolt, `unitless` not percent. Readers still type any unit; the calculator converts. A symbol term's unit that does not exist yet is a `missingPrereq`.

- A magnitude term takes the magnitude's name as its label, so use one only when that name is the right label and no other term of the equation has the same magnitude. Two masses, an initial and a final velocity, a normal and a friction force are symbol terms with role labels.
- Only magnitude terms carry the magnitude's `nonNegative`, and the calculator uses it to skip negative roots. An unknown whose physical root depends on the signs of the inputs (elapsed time in a quadratic) should therefore be the magnitude term (`time`).
- A ratio readers think of in percent (efficiency) is a symbol with `unit: 'unitless'`, which makes the calculator offer percent. A pure coefficient (a coefficient of friction) is a symbol with no unit.

## Expression ↔ solution

| `expression` (TeX) | `solutions` |
| --- | --- |
| `\frac{a}{b}`, juxtaposition, `\cdot` | `a / b`, `a * b` (multiplication always explicit) |
| `x^{2}` | `x^2` |
| `\sqrt{x}`, `\sqrt[3]{x}` | `sqrt(x)`, `cbrt(x)` |
| `\left\|x\right\|` | `abs(x)` |
| `e^{x}`, `\ln x`, `\log_{10} x`, `\log_{2} x` | `exp(x)`, `ln(x)`, `log10(x)`, `log2(x)` |
| `\sin \cos \tan`, `\arcsin \arccos \arctan` | `sin cos tan`, `asin acos atan` (radians) |
| `\operatorname{arsinh}` … | `asinh` … |
| `n!`, `\left(n-k\right)!` | `factorial(n)`, `factorial(n - k)` (declare `integer: true`) |
| `\pi`, Euler's `e` (bare) | `pi`, `exp(1)` |

Never a bare `\log`. Constants are injected, never solved for; refer to them by identifier in roots (`m * c^2`).

## Patterns

**Every non-constant term solved.** With `calculator: { enabled: true }` the calculator may leave any non-constant term empty, so each needs a root. Each root must use every other non-constant term (influence rule).

**Several roots (`MR`).** Solving a quadratic or an inverse trigonometric relation yields more than one root. List all real ones the term can take as a YAML list, the physical root first; two roots that never differ are rejected. A quantity that is never negative (a speed, a length, a mass) lists only its non-negative root, so `sqrt(2 * E_k / m)` alone for a speed; a signed quantity (a 1D velocity, a launch angle with a complementary twin) lists every root.

```yaml
solutions:
  t:
    - '(-v_0 + sqrt(v_0^2 + 2 * a * x)) / a'
    - '(-v_0 - sqrt(v_0^2 + 2 * a * x)) / a'
```

**No closed form (`NC`).** Narrow the calculator to the terms that have one; the others become required inputs:

```yaml
calculator:
  enabled: true
  solveFor: ['A']
```

**Differences (`T2`).** `\Delta T` with `delta: true`: the calculator converts 10 °C of warming to 10 K. An absolute temperature (no flag) is offered linear units only.

**Counts (`INT`).** `integer: true` on `n`, `k`: the verifier samples 0–10 and the calculator rejects fractions. Required wherever `factorial` appears.

**Notation (`NONALG`).** Inequalities and operator notation: `algebraic: false`, no `solutions`, no `calculator`.

## Shared conventions

Settled across waves; an entry that departs from one is a verifier finding. Read the model entry before authoring a related one.

| Quantity | Convention | Model entry |
| --- | --- | --- |
| gravitational acceleration | symbol `g`, unit `metre-per-second-squared`, label *Gravitational acceleration* / *Aceleración de la gravedad*, a positive input, never the `standard-acceleration-of-gravity` constant; the prose gives 9.80665 m/s² as the standard value and says g varies with place and body | `free-fall-distance` |
| elapsed time | the `time` magnitude term `t` | `position-time-constant-acceleration` |
| one body in 1D | signed `v_{0}` (initial) and `v` (final) velocity, signed displacement `\Delta x`; the prose states the positive direction | `velocity-displacement-constant-acceleration` |
| two bodies colliding | `u_{1}`, `u_{2}` before and `v_{1}`, `v_{2}` after; a common final velocity is `v`; never a prime in a key | `momentum-conservation-two-bodies` |
| projectile launch | `v_{0}` is the non-negative launch speed and the angle `\theta` carries the direction; level ground, no air resistance, uniform g, stated in the prose | `projectile-range` |
| spring | symbol `k`, unit `newton-per-metre`, label *Spring constant* / *Constante elástica*; signed extension `x` and the restoring form `F = -kx` | `hookes-law` |
| coefficient of friction | symbol `\mu`, no unit, non-negative; the prose separates static from kinetic | `friction-force` |
| efficiency | symbol `\eta`, unit `unitless`, a ratio from 0 to 1 | `efficiency` |
| lengths, areas, volumes of figures | `metre`-anchored symbols or the `length`/`area`/`volume` magnitudes; Cartesian coordinates are `metre` when both axes are lengths, unitless when the axes may carry different quantities | `distance-between-points`, `slope-of-a-line` |
| angles | the `plane-angle` magnitude term (radian anchor); inverse solutions use `asin`, `acos`, `atan` | `law-of-cosines` |
| gravitation | `G` is the constant term `gravitational-constant`, never solved for; the centre-to-centre distance or circular-orbit radius is symbol `r` (`metre`) labelled *Distance between centres* / *Distancia entre centros*; two masses are symbols `M` (*Mass of the attracting body* / *Masa del cuerpo que atrae*) and `m` (*Mass of the other body* / *Masa del otro cuerpo*); a single mass is the `mass` magnitude term `M`; planet radius is symbol `R` (*Radius of the planet* / *Radio del planeta*), altitude symbol `h` (*Altitude above the surface*) | `newtons-law-of-gravitation`, `orbital-period` |
| gravitational field strength | symbol `g` (`metre-per-second-squared`) labelled *Gravitational field strength*; the altitude form keeps the *Gravitational acceleration* label of the g row, and each description names the other | `gravitational-field-strength`, `gravity-at-altitude` |
| orbital and escape speeds | the `speed` magnitude term `v` (non-negative, single root); the entry name may say *velocity* | `orbital-speed`, `escape-velocity` |
| Kepler's third law | semi-major axes are symbols `a_{1}`, `a_{2}` (`metre`, *Semi-major axis of orbit N* / *Semieje mayor de la órbita N*), periods symbols `T_{1}`, `T_{2}` (`second`); a semi-major axis is not the `r` of the gravitation row | `keplers-third-law-ratio` |
| lever | `F_{1} d_{1} = F_{2} d_{2}`: symbols in `newton` and `metre` labelled *Effort force*, *Effort arm*, *Load force*, *Load arm* / *Potencia (fuerza aplicada)*, *Brazo de potencia*, *Resistencia (fuerza que se vence)*, *Brazo de resistencia*; a perpendicular distance from an axis is the lever arm, *brazo de palanca* | `law-of-the-lever` |
| fluid densities and pressures | the `density` or `pressure` magnitude when only one appears; a fluid and an object (or substance) density are symbols `\rho_\mathrm{f}` and `\rho_\mathrm{o}` (`kilogram-per-cubic-metre`); surface pressure is symbol `p_{0}` (`pascal`); the standard atmosphere, 101 325 Pa, is plain text in the prose like g, never a constant term; `\rho g h` is gauge pressure and the prose says so | `floating-fraction-submerged`, `absolute-pressure-at-depth` |
| wave relations | `v = f\lambda` and `v = \lambda / T` use the `speed`, `frequency`, `wavelength` and `period` magnitude terms; `\omega = 2\pi f` uses the `angular-frequency` magnitude | `wave-speed`, `wave-speed-period`, `angular-frequency-formula` |
| wavenumber | the `wavenumber` magnitude is `\sigma = 1/\lambda` (ISO 80000-3 item 3-20), unit `reciprocal-metre`; the angular wavenumber `k = 2\pi/\lambda` (rad/m) is a separate quantity named only in the prose | `magnitudes/wavenumber` |
| oscillator periods | the `period` magnitude `T`; pendulum length is symbol `L` (`metre`, *Length of the pendulum* / *Longitud del péndulo*), `g` per the g row, small-angle limit stated in the prose; a mass on a spring uses the `mass` magnitude `m` and `k` per the spring row | `simple-pendulum-period`, `mass-spring-period` |
| standing waves | `f_{n}` is the `frequency` magnitude, `n` a symbol with no unit and `integer: true` (*Harmonic number* / *Número de armónico*; *Harmonic number (odd)* / *Número de armónico (impar)* for a pipe closed at one end, oddness stated in the prose because the calculator cannot enforce it), `v` the `speed` magnitude, `L` a `metre` symbol labelled *Length of the string* or *Length of the pipe* | `string-harmonics`, `closed-pipe-harmonics` |
| beats | `f_\mathrm{beat}` is the `frequency` magnitude; the sources are `hertz` symbols `f_{1}`, `f_{2}` (*Frequency of the first/second source*); the beat root uses `abs`, each source root lists `other + f_beat` first, then `other - f_beat` | `beat-frequency` |
| speed of sound in a gas | the physical form `\sqrt{\gamma R T / M}`: `speed` magnitude `v`, `\gamma` a pure-coefficient symbol with no unit, `R` the constant `molar-gas-constant`, `thermodynamic-temperature` and `molar-mass` magnitudes; reference values (1.40 and 0.02897 kg/mol for dry air, the OpenStax figures; 331 m/s at 0 °C) are plain text in the prose, never a dimensioned literal in an expression | `speed-of-sound-air` |
| Doppler effect for sound | `hertz` symbols `f_\mathrm{o}`, `f_\mathrm{s}`; the sound speed `v` and the signed velocities `v_\mathrm{o}`, `v_\mathrm{s}` are `metre-per-second` symbols with role labels, `v` kept a symbol (not the `speed` magnitude) so that the three speeds read alike; velocities are positive when the body moves towards the other, stated in the prose and kept in every root | `doppler-effect` |
| logarithmic levels | the level is a magnitude on the `unitless` anchor (listed in `units/unitless` `unitOf`) with `displayUnit: 'decibel'` (the decibel is `nonConvertible` and lists the level in its `unitOf`; ADR 0014), so the calculator labels and prints it in dB and offers no unit; entered as a plain number of decibels; the reference is a constant term never solved for (`I_{0}`, `threshold-of-hearing-intensity`, exact by convention); roots use `log10`, the inverse written `I_0 * 10^(L_I / 10)`; a dimension-one quantity that is not a field or power level (pH) keeps the unit one and no display unit | `sound-intensity-level-formula` |
| inverse-square spreading | one source distance is symbol `r` (`metre`); two distances are `r_{1}`, `r_{2}` with role labels, two intensities `I_{1}`, `I_{2}` (`watt-per-square-metre`); `d` stays free for slit and grating spacing; aliases qualify the bare law name per entry (*... del sonido*, *... de la luz*) | `inverse-square-law`, `illuminance-inverse-square` |
| geometric optics | the real-is-positive convention of OpenStax, stated in each prose: `metre` symbols `d_\mathrm{o}`, `d_\mathrm{i}`, `f`, `R` (*Object distance*, *Image distance*, *Focal length*, *Radius of curvature*), positive for real objects and images and for converging lenses and concave mirrors; magnification `m` a symbol with no unit; optical power is the `optical-power` magnitude `P` (base unit `dioptre`, EU-permitted under Directive 80/181/EEC, not SI-accepted: the SI Brochure omits it), and the prose says it is not a power in watts | `thin-lens-equation`, `mirror-equation`, `magnification`, `lens-power` |
| refractive index and angles | a single index is the `refractive-index` magnitude `n`; two media are symbols `n_{1}`, `n_{2}` with no unit; a single angle (`\theta_\mathrm{c}`, a grating angle `\theta`) is the `plane-angle` magnitude, two angles are `radian` symbols `\theta_{1}`, `\theta_{2}` with role labels | `refractive-index-formula`, `snells-law`, `critical-angle` |
| interference and gratings | slit or grating spacing `d` and slit-to-screen distance `D` are `metre` symbols; the order `m` is a symbol with no unit and `integer: true`; the wavelength is the `wavelength` magnitude | `double-slit-fringe-spacing`, `diffraction-grating` |
| photometry | `E_\mathrm{v}`, `I_\mathrm{v}`, `\Phi_\mathrm{v}` are the `illuminance`, `luminous-intensity` and `luminous-flux` magnitudes; the efficacy of a source is symbol `\eta_\mathrm{v}` (`lumen-per-watt`), never the `luminous-efficacy` magnitude (efficacy of radiation) and not the efficiency `\eta` of the efficiency row; the inverse-square form assumes normal incidence, the cosine factor in prose | `illuminance-inverse-square`, `luminous-efficacy-of-a-source` |
| temperature difference | a `kelvin` symbol `\Delta T` with `delta: true` (the calculator converts it without the affine offset and offers degC and degF), final minus initial, labelled *Temperature change* / *Variación de temperatura*; Fourier conduction labels it *Temperature difference across the slab* / *Diferencia de temperatura entre las caras*; the prose says the value is the same in K and °C | `sensible-heat`, `heat-capacity-formula`, `fourier-heat-conduction` |
| absolute temperatures | never `delta`; the prose says the formula needs absolute temperature and converts Celsius by adding 273.15; two reservoirs are `kelvin` symbols `T_\mathrm{h}`, `T_\mathrm{c}` (*Temperature of the hot/cold reservoir* / *Temperatura del reservorio caliente/frío*); a two-body mixture uses `kelvin` symbols `T_{1}`, `T_{2}` (*Initial temperature of body N* / *Temperatura inicial del cuerpo N*) and `T_\mathrm{f}` (*Equilibrium temperature* / *Temperatura de equilibrio*), `kilogram` symbols `m_{1}`, `m_{2}` and `joule-per-kilogram-kelvin` symbols `c_{1}`, `c_{2}` | `carnot-efficiency`, `thermal-equilibrium-temperature` |
| first law and pV work | `\Delta U` is a `joule` symbol (*Change in internal energy* / *Variación de la energía interna*), `Q` the `heat` magnitude, `W` the `work` magnitude for the work done BY the system (OpenStax form $\Delta U = Q - W$); the prose names $\Delta U = Q + W$ (work done on the system, IUPAC and chemistry) as the other convention; isobaric work $W = p\Delta V$ uses the `pressure` magnitude and a `cubic-metre` symbol `\Delta V` (*Change in volume* / *Variación de volumen*) with the same sign | `first-law-of-thermodynamics`, `isobaric-work` |
| thermal expansion | linear: the `linear-expansion-coefficient` magnitude `\alpha` with `metre` symbols `\Delta L` (*Change in length*) and `L_{0}` (*Initial length*); volumetric: `\beta` is a `reciprocal-kelvin` symbol (*Volumetric expansion coefficient* / *Coeficiente de dilatación volumétrica*) because no magnitude exists for it (do not create one), with `cubic-metre` symbols `\Delta V`, `V_{0}`; both use the temperature-difference row | `linear-thermal-expansion`, `volumetric-thermal-expansion` |
| heat conduction | Fourier's law gives the heat flow rate as the `power` magnitude `P` with the `thermal-conductivity` magnitude under key `k`, the `area` magnitude `A`, the delta `\Delta T` and a `metre` symbol `d` (*Thickness* / *Espesor*) | `fourier-heat-conduction` |
| heat engines | thermal efficiency $\eta = W / Q_\mathrm{h}$ with the `work` magnitude `W` (net work per cycle) and a `joule` symbol `Q_\mathrm{h}` (*Heat absorbed from the hot reservoir* / *Calor absorbido del reservorio caliente*); Carnot efficiency $\eta = 1 - T_\mathrm{c}/T_\mathrm{h}$ with the reservoirs of the absolute-temperature row; both follow the efficiency row; Spanish prose says *reservorio* (OpenStax), *foco* only in `aliases` | `thermal-efficiency`, `carnot-efficiency` |
| two gas states | symbols `p_{1}`, `V_{1}`, `T_{1}`, `n_{1}` and `p_{2}`, `V_{2}`, `T_{2}`, `n_{2}` (`pascal`, `cubic-metre`, `kelvin`, `mole`) labelled *Initial/Final pressure*, *volume*, *temperature*, *amount of substance* / *Presión*, *Volumen*, *Temperatura*, *Cantidad de sustancia inicial/final*; temperatures absolute, never delta; the prose says the gas laws need kelvin and absolute (not gauge) pressure | `boyles-law`, `combined-gas-law` |
| single-state ideal gas | the ideal gas law and the formulas derived from it use the `pressure`, `volume`, `substance`, `thermodynamic-temperature`, `density`, `molar-mass` and `molar-volume` (key `V_\mathrm{m}`) magnitudes with the constant `molar-gas-constant`; the prose gives R as about 8.314 J/(mol K), exact in the SI | `ideal-gas-law`, `gas-density`, `molar-volume-ideal-gas` |
| gas mixtures | partial pressures are `pascal` symbols `p_\mathrm{A}`, `p_\mathrm{B}` (*Partial pressure of gas A/B* / *Presión parcial del gas A/B*), the total `p_\mathrm{total}` (*Total pressure* / *Presión total*); the mole fraction `x_\mathrm{A}` is a symbol with no unit, entered as a decimal; Dalton's law is authored for two components and the prose states the general sum | `daltons-law-partial-pressures`, `partial-pressure-mole-fraction` |
| Graham's law | effusion rates are `cubic-metre-per-second` symbols `r_{1}`, `r_{2}` (*Effusion rate of gas N* / *Velocidad de efusión del gas N*); the prose says any volume-per-time unit common to both works because only the ratio enters; molar masses are `kilogram-per-mole` symbols `M_{1}`, `M_{2}` | `grahams-law` |
| charges and fields | the Coulomb constant is the constant term `k_\mathrm{e}` (identifier `k_e`, ref `coulomb-constant`), never solved for; the prose gives it as about `$8.99\times10^{9}\,\mathrm{N\,m^{2}/C^{2}}$` (same spelling in every entry) and may name $1/(4\pi\varepsilon_0)$ in words; two charges are `coulomb` symbols `q_{1}`, `q_{2}` (*First charge* / *Primera carga*, *Second charge* / *Segunda carga*), a single charge is the `electric-charge` magnitude `q`; a two-charge separation is `metre` symbol `r` (*Distance between the charges* / *Distancia entre las cargas*), a single-source distance is `metre` symbol `r` (*Distance from the charge* / *Distancia a la carga*); the signed Coulomb force is positive for repulsion and negative for attraction, the point-charge field and potential carry the sign of the source (field positive away from the charge), stated in the prose; the field is the `electric-field-strength` magnitude `E`, the potential the `electric-potential` magnitude `V`; the potential energy of two charges and the energy stored in a capacitor are the `potential-energy` magnitude under key `E_\mathrm{p}`, as in the gravitational and elastic forms | `coulombs-law`, `electric-field-point-charge`, `electric-potential-energy-two-charges` |
| potential differences | the `electric-potential-difference` magnitude; `V = Ed` takes `V` as start minus end (positive along the field) with `metre` symbol `d` (*Distance along the field* / *Distancia a lo largo del campo*); `W = q\Delta V` keys it `\Delta V` (end minus start) with the `work` magnitude `W` done by an outside agent and the field's work $-q\Delta V$ in the prose; each of the two entries names the other's sign; Ohm, power and divider forms take `V` as the fall in potential along the conventional current, signed, so a squared `V` lists both roots | `uniform-field-potential-difference`, `work-moving-charge` |
| capacitors | `C = Q/V` uses the `capacitance` magnitude `C`, the `electric-charge` magnitude under key `Q` (charge on the positive plate) and `V` as positive plate minus negative plate, all non-negative, so capacitor energy lists only the non-negative root for `V`; series and parallel combinations are authored for two capacitors as `farad` symbols `C_{1}`, `C_{2}` (*Capacitance of the first/second capacitor* / *Capacidad del primer/segundo condensador*), the total is the `capacitance` magnitude `C`, and the prose states the two-term scope and the n-capacitor rule | `capacitance-formula`, `capacitor-energy`, `capacitors-in-series`, `capacitors-in-parallel` |
| Ohm's law and resistor power | `V`, `I`, `R`, `P` are the `electric-potential-difference`, `electric-current`, `electrical-resistance` and `power` magnitudes; current is conventional current, positive in the direction positive charge would move, stated where a sign matters; `V` is the fall in potential measured along that current; `P = VI` is the load sign, positive for energy delivered to the element and negative for a source; `P = I^{2}R` and `P = V^{2}/R` solved for `I` or `V` list both roots, positive first | `ohms-law`, `electric-power`, `power-current-resistance`, `power-voltage-resistance` |
| resistor combinations | resistors are `ohm` symbols `R_{1}`, `R_{2}`, `R_{3}` (*Resistance of the first/second/third resistor* / *Resistencia del primer/segundo/tercer resistor*); the equivalent is the `electrical-resistance` magnitude `R`; series and two-branch parallel are authored for two resistors (parallel in reciprocal form, solved `R = R_1*R_2/(R_1+R_2)`), a separate entry covers three in parallel, and each prose states the count and that further resistors extend the sum; two resistances with distinct roles that are not a total (`R` and `R_{0}` of the temperature row) are both `ohm` symbols | `resistors-in-series`, `resistors-in-parallel`, `resistors-in-parallel-three` |
| sources with internal resistance | `V = \mathcal{E} - Ir`: `V` the `electric-potential-difference` magnitude across the terminals, `\mathcal{E}` the `electromotive-force` magnitude with identifier override `emf` (the derived `mathcalE` is unreadable), `I` the `electric-current` magnitude with the source sign, positive when conventional current leaves the positive terminal (charging gives negative `I` and `V` above the emf), `r` an `ohm` symbol (*Internal resistance* / *Resistencia interna*); the prose says that with this sign `VI` is the power the source delivers, opposite to the load sign of the Ohm row | `emf-internal-resistance` |
| resistance and its material | resistivity form `R = \rho L / A` with the `electrical-resistivity` magnitude `\rho` (only the `ohm-metre` unit is offered), a `metre` symbol `L` (*Length of the conductor* / *Longitud del conductor*) and the `area` magnitude `A`; conductance `G = 1/R` with the `electrical-conductance` magnitude (only the `siemens`); temperature dependence `R = R_{0}(1 + \alpha\Delta T)` with `ohm` symbols `R`, `R_{0}` (*Resistance at the final/reference temperature* / *Resistencia a la temperatura final/de referencia*), `\alpha` a `reciprocal-kelvin` symbol (*Temperature coefficient of resistance* / *Coeficiente de temperatura de la resistencia*) and `\Delta T` per the temperature-difference row; the 20 °C reference is stated in the prose | `resistance-resistivity`, `conductance`, `resistance-temperature` |
| voltage divider | `volt` symbols `V_\mathrm{in}`, `V_\mathrm{out}`; `R_{1}` on the input side, `R_{2}` on the output side (`ohm` symbols with those roles in the label); the unloaded assumption and the rule that `R_{2}` below a tenth of the load keeps the output change under about ten percent are in the prose | `voltage-divider` |
| charge, current and energy | `I = q/t` uses the `electric-current`, `electric-charge` (key `q`) and `time` magnitudes, with the battery rating in ampere hours as *carga nominal* in Spanish; `E = Pt` uses the `energy`, `power` and `time` magnitudes, carries the load sign of the Ohm row, gives the kilowatt hour (3.6 MJ) as plain text and names its mechanical twin, power as work over time (`power-work-time`), in the prose | `electric-current-formula`, `electrical-energy` |
| unit backfill (powers and customary compounds) | a power or product of existing units is a `compose` unit (`centimetre^2`, `foot^2`, `foot·second^-1`, `pound-force·foot`), never a hand `toBase`; prefixed operands use the generated slug (`millimetre`, `kilometre`); `system` follows the model (`cgs` for centimetre-based like `cubic-centimetre`, `si-derived` for other prefixed SI powers, as Wikidata files them, `imperial` for customary); every area unit is filed under mathematics and physics, geometry and mechanics, as `acre` and `hectare`; a named non-coherent unit (`gal`, `standard-gravity`) is `toBase` with the NIST SP 811 B.8 row in `source.ref`; `standard-gravity` is the unit for accelerations stated in g and shares Wikidata Q13400897 with the `standard-acceleration-of-gravity` constant, which equations keep (or the g symbol of the g row); `pound-force-foot` (unitOf torque) and `foot-pound` (unitOf energy) share a factor and differ by word order, as NIST names them | `units/cubic-centimetre`, `units/square-foot`, `units/standard-gravity`, `units/pound-force-foot` |
| formula or equation | a result that computes one quantity from others is `kind: 'formula'` even when derived from a law (pendulum period, orbital period, speed of sound in a gas, fringe spacing, mirror focal length, magnification); `kind: 'equation'` is for a law or a relation between peers (Snell's law, the thin-lens and mirror equations, the grating condition, the Doppler effect, the inverse-square laws) | `orbital-period`, `speed-of-sound-air`, `snells-law` |

## Verification, and what it does not prove

`pnpm --filter @equreka/content check` substitutes 20 random samples per root (free terms in [0.1, 10), integers in 0–10) and checks balance relative to the largest additive term, plus dimensions. A root that is real only outside that box fails with *fewer than 20 valid samples*: rewrite it in an equivalent form whose domain overlaps the box, or narrow `solveFor`. A green check proves the roots agree with **your** expression; it does not prove the expression is the physics. Confirm the expression against two fetched sources and recompute one worked example from a source:

```sh
node -e "const v_0=0,a=9.81,x=20; console.log((-v_0+Math.sqrt(v_0**2+2*a*x))/a)"
```

## Pitfalls

- A letter outside every macro (`\mag{F}=m\var{a}`) is an *unannotated symbol* error.
- `\var{v}_{0}` annotates `v`, not `v_{0}`.
- A degree, Celsius or percent anchor passes nothing: the anchors stage rejects it.
- A term that cancels out (`F = m a + b - b`) violates the influence rule: delete it.
- Spanish `label`s live in the sidecar under `terms: { <key>: { label: '…' } }`, keyed by the exact term key.
