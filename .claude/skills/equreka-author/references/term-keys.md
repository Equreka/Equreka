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

Rules: braces nest at most one level, so a braced upright subscript (`E_{\mathrm{k}}`, `t_{\mathrm{r}}`, `h_{\mathrm{max}}`) is rejected by the integrity stage: write `E_\mathrm{k}`, or a standard upright operator such as `h_{\max}`; no `$`, line breaks or edge spaces; identifiers unique within the equation (`v_0` and `v_{0}` collide); never a grammar function name (`sqrt abs ln exp sin cos tan asin acos atan log10 log2 cbrt sinh cosh tanh asinh acosh atanh factorial`), never an `Object.prototype` name, and `pi` only for the constant term `ref: 'pi'`.

## Choosing term kinds and anchors

| The term is | Kind | Anchor |
| --- | --- | --- |
| a quantity with a wiki magnitude of exactly that meaning | `magnitude` | the magnitude's `baseUnit` |
| a physical or mathematical constant entry | `constant` | the constant's `unit` (SI-coherent) |
| a wiki variable (`radius`) | `variable` | its `defaultUnit` |
| anything else (legs, coefficients, rates, counts) | `symbol` with `label` | `unit`: the SI-coherent unit of its dimension; omit for dimensionless |

Anchors are always factor 1, offset 0: radian not degree, kelvin not Celsius, metre not kilometre, joule not electronvolt, `unitless` not percent. Readers still type any unit; the calculator converts. A symbol term's unit that does not exist yet is a `missingPrereq`.

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

**Several roots (`MR`).** Solving a quadratic or an inverse trigonometric relation yields more than one root. List all real ones as a YAML list, the physical root first; two roots that never differ are rejected.

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
