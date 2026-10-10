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
| logarithmic levels | the level is a magnitude on the `unitless` anchor (listed in `units/unitless` `unitOf`; the decibel is `nonConvertible`) entered as a plain number of decibels; the reference is a constant term never solved for (`I_{0}`, `threshold-of-hearing-intensity`, exact by convention); roots use `log10`, the inverse written `I_0 * 10^(L_I / 10)` | `sound-intensity-level-formula` |
| inverse-square spreading | one source distance is symbol `r` (`metre`); two distances are `r_{1}`, `r_{2}` with role labels, two intensities `I_{1}`, `I_{2}` (`watt-per-square-metre`); `d` stays free for slit and grating spacing; aliases qualify the bare law name per entry (*... del sonido*, *... de la luz*) | `inverse-square-law`, `illuminance-inverse-square` |
| geometric optics | the real-is-positive convention of OpenStax, stated in each prose: `metre` symbols `d_\mathrm{o}`, `d_\mathrm{i}`, `f`, `R` (*Object distance*, *Image distance*, *Focal length*, *Radius of curvature*), positive for real objects and images and for converging lenses and concave mirrors; magnification `m` a symbol with no unit; optical power is the `optical-power` magnitude `P` (base unit `dioptre`, EU-permitted under Directive 80/181/EEC, not SI-accepted: the SI Brochure omits it), and the prose says it is not a power in watts | `thin-lens-equation`, `mirror-equation`, `magnification`, `lens-power` |
| refractive index and angles | a single index is the `refractive-index` magnitude `n`; two media are symbols `n_{1}`, `n_{2}` with no unit; a single angle (`\theta_\mathrm{c}`, a grating angle `\theta`) is the `plane-angle` magnitude, two angles are `radian` symbols `\theta_{1}`, `\theta_{2}` with role labels | `refractive-index-formula`, `snells-law`, `critical-angle` |
| interference and gratings | slit or grating spacing `d` and slit-to-screen distance `D` are `metre` symbols; the order `m` is a symbol with no unit and `integer: true`; the wavelength is the `wavelength` magnitude | `double-slit-fringe-spacing`, `diffraction-grating` |
| photometry | `E_\mathrm{v}`, `I_\mathrm{v}`, `\Phi_\mathrm{v}` are the `illuminance`, `luminous-intensity` and `luminous-flux` magnitudes; the efficacy of a source is symbol `\eta_\mathrm{v}` (`lumen-per-watt`), never the `luminous-efficacy` magnitude (efficacy of radiation) and not the efficiency `\eta` of the efficiency row; the inverse-square form assumes normal incidence, the cosine factor in prose | `illuminance-inverse-square`, `luminous-efficacy-of-a-source` |
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
