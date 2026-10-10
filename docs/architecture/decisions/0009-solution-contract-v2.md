# 0009 — Solution contract v2: term identity and scale-free verification

Date: 2026-10-06 · Status: accepted · Amended 2026-10-06 (grammar v2 and multi-root solutions; coverage and calculator rules) · Amended 2026-10-10 (side precision, the wide sampling box and ill-conditioned samples)

## Context

ADR 0002 makes equation solving a build-time contract: authored solved forms, verified by random substitution, codegen'd to plain functions. The corpus is about to grow from 4 equations to roughly 390. An audit of the contract against that scale found defects that would ship wrong answers or reject correct content without anyone noticing, all masked today because every solvable term key in the 4 equations is already a plain identifier and no constant is tiny:

1. **Codegen and engine disagreed on the module's key.** The verifier stored solution ASTs by identifier, so `solutions.js` was `solutions[slug][identifier]`. The engine looks up `solutions[slug][termKey]`, as its types and the engine-slice schema document. Any solvable term whose key is not its identifier (`\theta`, `v_{0}`, `\lambda`) would fail at runtime with `internal/unsupported`.
2. **Compute-engine read term keys as TeX.** The verifier parsed the expression with macros merely stripped, so `KE` became K·E, `e` Euler's number, `i` the imaginary unit, `\Delta x` a product, `v_{0}` a subscripted symbol. It then demanded that every parsed symbol be a term identifier, which rejected valid keys and could not tell a bare authored letter from a term.
3. **One engine was shared across the corpus.** Compute-engine keeps declarations between parses: after `\bar{x}` (parsed as `Mean`, declaring `x` a collection), `a x^2 + b x + c = 0` parses with a `Tuple`. A verdict depended on which equations were parsed earlier, and therefore on the verify cache.
4. **The tolerance had an absolute floor.** `|lhs − rhs| ≤ 1e-9 · max(1, |lhs|, |rhs|)` accepts anything below 1e-9. With h ≈ 6.6e-34, `E = 2 h f` passed.
5. **Complex samples were compared on their real part.** `.N().re` drops the imaginary part (`sqrt(-4)` has re 0), so a side that is complex at a sample could agree by accident. `y + sqrt(x) = y` with the solution `x = -4` passed every sample.

The annotation-macro regex was also copied in four places with `[^{}]*` arguments, so no key could contain braces.

## Decision

### Term identity

- **Key.** A term key is any TeX that renders on its own under strict KaTeX (it is the term's displayed symbol). It must be trimmed and non-empty, contain no `$` or line break, not be an `Object.prototype` property name (records are keyed by term key on every platform), and be carriable by the annotation macro: balanced braces nested at most one level. One pattern, `termMacroPattern()` in `@equreka/content/rich-text`, defines the macro for the pipeline, the web renderer and the equation page.
- **Identifier.** The effective identifier is the authored `identifier` override (new, optional on every term kind) or else the key with every character outside `[A-Za-z0-9_]` dropped (`termIdentifier`; since grammar v2, font and text wrappers are unwrapped first, see *Grammar and roots*). It must match `^[A-Za-z][A-Za-z0-9_]*$` and be unique within the equation. It must not be a grammar function name, current or announced (`RESERVED_FUNCTION_NAMES` in the solution grammar: `sqrt abs ln exp sin cos tan asin acos atan log10 log2 cbrt sinh cosh tanh asinh acosh atanh factorial`), so extending the grammar can never reinterpret an authored identifier. It must not be an `Object.prototype` property name. `pi` is allowed only on the constant term with `ref: 'pi'`: the grammar reads `pi` as π, which is correct only where the values coincide.
- **Reporting.** The integrity stage reports every violation (`termKeyIssues`). The dimension and verification stages refuse to run on a broken identity instead of reporting it again. The TeX lint renders every key alone and warns on a bare run of two or more letters (`KE` typesets as K times E).

### Codegen keyed by term key

`solutions.js` is `solutions[slug][termKey]`, with keys emitted as JSON string literals. Each function reads its arguments by identifier, the record `solveEquation` builds from `meta.terms[key].identifier`. The engine slice carries the effective identifier of every term. Both halves are pinned by tests: the content pipeline round-trips a `\theta` target through a generated module, and the engine solves `\theta` and `r_{0}` targets and rejects a module keyed by identifier.

### Synthetic-symbol verification

Before compute-engine parses an expression, every macro becomes `{\mathrm{q<N>}}`, N being the term's position in authored order. This was probed against compute-engine 0.105.0 to parse as the single symbol `q<N>`, so any valid key verifies. The parsed expression's free symbols must be placeholders, `Pi` or `ExponentialE`; anything else is an *unannotated symbol* error, named back in authored terms (`\var{v}_{0}` reports `v_0`). The macro-free residue (every macro replaced by `1`) is parsed too, so authored text that spells a placeholder (`\mathrm{q1}`) cannot pose as a term. Constants are substituted at their compiled values, free terms sampled as before.

### Fresh engine per equation

Every equation is parsed by its own `ComputeEngine`. Construction measured about 4 ms once the module is warm, and the verify cache skips it entirely on warm builds.

### Scale-free tolerance

Both sides are flattened into their additive operands (`Add`, `Subtract`, `Negate`). With `scale` the largest absolute operand value, a sample agrees iff `|lhs − rhs| ≤ 1e-9 · scale`; when `scale` is 0 the residual must be exactly 0. A side that is exactly zero (`a x^2 + b x + c = 0`) still verifies, and tiny constants get no absolute slack.

### Complex samples

A sample where any operand is non-finite or has a non-zero imaginary part is invalid: it is skipped and counts toward the 400-attempt cap, never compared. Fewer than 20 valid samples remains an error (after both sampling boxes since the 2026-10-10 amendment, *Precision and sampling range*).

### Cache

`CONTENT_PIPELINE_VERSION` goes from 2 to 3, invalidating every cached verification and math render.

## Grammar and roots

Amended 2026-10-06 (grammar v2). The school and university corpus needs inverse trigonometry (Snell's law solved for the angle, projectile launch angle), base-10 logarithms (pH, decibels), cube roots (a cube's side), factorials (combinatorics) and solved forms with more than one root (quadratic kinematics).

### One grammar

The parser, evaluator and function table live in one platform-free module, `@equreka/content/solution-grammar` (no imports, so Node, Vite and Metro bundle it as-is). The pipeline parses, verifies and codegens with it; mobile re-parses presentation solutions with it to typeset solved forms, keeping only TeX rendering of its own. The duplicate mobile parser is gone.

### Functions

`sqrt abs ln exp sin cos tan asin acos atan log10 log2 cbrt sinh cosh tanh asinh acosh atanh factorial`. `RESERVED_FUNCTION_NAMES` is exactly this list: every name announced in Part 1 is now implemented, so no authored identifier changed meaning. Each evaluates as its `Math` counterpart; the codegen'd module calls the same `Math` functions. `factorial(n)` is the iterated float64 product for an integer n in [0, 170] and NaN elsewhere (171! overflows; a fractional or negative argument is out of domain, not extended to Γ). The generated module carries an equivalent pure `factorial` helper, emitted only when a solution calls it; a test pins it to the grammar's.

The TeX an expression uses for each, all probed against compute-engine 0.105.0 (exact parse) and strict KaTeX (renders):

| Solution | Expression TeX | compute-engine |
| --- | --- | --- |
| `asin acos atan` | `\arcsin \arccos \arctan` | `Arcsin Arccos Arctan` |
| `log10` | `\log_{10}` | `Log(x)` (base 10) |
| `log2` | `\log_{2}` | `Log(x, 2)` |
| `ln` | `\ln` | `Ln` |
| `cbrt` | `\sqrt[3]{…}` | `Root(x, 3)`, real for a negative radicand |
| `sinh cosh tanh` | `\sinh \cosh \tanh` | `Sinh Cosh Tanh` |
| `asinh acosh atanh` | `\operatorname{arsinh}` `\operatorname{arcosh}` `\operatorname{artanh}` | `Arsinh Arcosh Artanh` |
| `factorial` | `n!`, `\left(n-k\right)!` | `Factorial` |

The inverse hyperbolics take their ISO 80000-2 names (they are area functions, not arc functions). Compute-engine also reads `\operatorname{arcsinh}`, `\sinh^{-1}` and a bare `\arsinh`, but KaTeX has no `\arsinh` and `\sinh^{-1}` reads as a reciprocal, so `\operatorname{ar…}` is the one spelling every renderer and the verifier share.

**Bare `\log` is an error** in an expression (`write \ln or \log_{10}`): compute-engine reads it as base 10 while many readers take it as base e, so the verifier would check a different equation from the one a reader sees. The check runs on the expression with every macro removed, so a term key can never trigger it.

### Angles: rad = 1 in equation checks

The synthetic angle dimension `A` (ADR 0002) exists so 30° never silently converts to a bare number. Equation dimension checks drop it instead: `termDimension` applies `withoutAngle()`, following the SI's treatment of the radian as the number one. Without this, `sin θ` with a plane-angle term, `s = r θ`, `v = ω r` and `ω = 2π f` all fail. Unit conversion is untouched and stays strict on `A`.

Function rules: trigonometric, inverse trigonometric, hyperbolic and inverse hyperbolic functions, `ln log10 log2 exp` and `factorial` take a dimensionless argument and yield dimensionless; `sqrt` halves exponents and `cbrt` thirds them (a non-integral result is an error, so `cbrt` of an area fails); `abs` preserves; `^` is unchanged.

### Integer terms

Magnitude, variable and symbol terms take `integer` (strictBool, default false); a constant has a fixed value and takes none. The verifier samples an integer term uniformly from the integers 0–10 instead of the reals in [0.1, 10); a sample where a root is undefined (`factorial(k - n)` with k > n) is skipped and counts toward the 400-attempt cap as before. The engine slice carries `integer: true` on such terms (absent otherwise) for the calculator's input validation.

### Identifier derivation

`termIdentifier` unwraps the font and text wrappers `\mathrm \text \textrm \mathit \mathbf \boldsymbol \operatorname \mathsf \mathtt` to their content, repeating until stable, before dropping every character outside `[A-Za-z0-9_]`: `\mathrm{KE}` derives `KE`, `\text{pH}` derives `pH`, `E_{\mathrm{k}}` derives `E_k`. Keys without wrappers derive exactly as before, so the identifiers of the existing corpus did not change (the engine slice was byte-identical apart from `schemaVersion`).

### Multi-root solutions

A solution is a string or a list of at least two roots: `solutions: { t: ['(-v_0 + sqrt(v_0^2 + 2*a*x)) / a', '(-v_0 - sqrt(v_0^2 + 2*a*x)) / a'] }`. `SCHEMA_VERSION` goes from 2 to 3.

- **Verification.** Each root is verified on its own: 20 valid samples within 400 attempts, seeded `slug:key#index`, so adding a root never moves the samples of the roots before it. A root is checked only where it is real. Two roots that agree within the relative tolerance at every sample (of either root) where both are real are rejected as *duplicate roots*; roots that are never real at the same sample (disjoint domains) are distinct. Each root is dimension-checked separately, and messages name it by position (`solution for 't' root 2 of 2`).
- **Codegen.** A multi-root function returns every root in authored order, NaN for each root that is not finite, or null when none is. A single-root function is unchanged (number or null). The declared type is `number | readonly number[] | null`, matching the engine's `SolutionFn`.
- **Selection.** Authored order is preference order. `solveEquation` returns the first finite root that `nonNegative` admits, its authored index as `root` (0 for a single root), and, for a multi-root solution only, `allRoots`: the finite roots in authored order. The calculator shows the solved form of `root`, so the displayed formula is the one that produced the value. Authors list the physical root first (the forward time of flight, the low launch angle).

### Cache

`CONTENT_PIPELINE_VERSION` goes from 3 to 4 (sample record shape, seeds and codegen changed).

## Coverage and calculator rules

Amended 2026-10-06. Roughly 390 equations will be authored at scale, largely by AI authors. Verification proves that an authored root agrees with its expression; it does not prove that the equation is usable, that the calculator can answer for every unknown it offers, or that the numbers it receives are in the units its formulas assume. These rules close those gaps, so no wrong or unusable equation ships.

### Non-algebraic equations

`algebraic` (strictBool, default true). `false` marks notation no solver reads: Maxwell's equations, the Schrödinger equation, anything with ∇, ∂ or ∫. Probed against compute-engine 0.105.0, `\nabla` parses as an `unexpected-command` error and `\oint` leaves a `Nothing` symbol, so such an expression could never pass verification. A non-algebraic equation authors no `solutions` and no calculator (both schema errors). The verifier never hands its expression to compute-engine; the bare-`\log` rule (a notation rule, not a parse), strict-KaTeX lint and math rendering still apply. The CLI summary counts non-algebraic equations, so their share of the corpus stays visible.

### At least one solution

Every algebraic equation authors at least one solution (integrity). An algebraic equation without one is unfinished; notation that cannot be solved is `algebraic: false`.

### The solvable set

The terms the calculator may leave unknown are `calculator.solveFor` when authored, else every non-constant term (constants are injected, never unknown). `solveFor` is non-empty and names distinct non-constant terms. When `calculator.enabled`, every member has an authored solution (integrity; previously only an explicit `solveFor` was checked), so no unknown the calculator offers can end in `internal/unsupported`. The engine slice's `solvable` is this set restricted to authored solutions and sorted, which equals the set itself whenever the calculator is enabled. A solution keyed by a constant term is an error. The case `solveFor` exists for: C = n!/(k!(n−k)!) over integer n and k is solved for C only (`solveFor: ['C']`); n and k have no closed form.

### Influence rule

Every root names, by identifier, every other non-constant term of its equation. A root that ignores an input returns the same value whatever that input is, so either the term cancels out of the expression (`F = m a + b − b`: numeric verification passes, because `b` really has no effect) and does not belong in the equation, or the root is mistyped (`c = sqrt(a^2 + a^2)`, which verification reports only as a disagreement). The error names the missing terms. Constants are exempt. The rule is syntactic, so a root that is constant for every input, such as x = 0 of x(ax + b) = 0, cannot be authored; it is no calculator answer.

### SI-coherent anchors

Every term anchors on a unit that resolves to factor 1 and offset 0 (`term-units.ts`, stage `anchors`, after resolution): a constant term on its constant's `unit`, a variable term on its `defaultUnit`, a symbol term on its `unit`. Magnitude terms anchor on their magnitude's `baseUnit`, which resolution already holds to factor 1. A nonConvertible anchor is an error too. The reason is three facts together: solutions are verified as plain numbers, the calculator converts every input to its term's anchor and injects constants exactly as authored, and equation dimension checks treat the angle as dimensionless (rad = 1, *Grammar and roots*). A degree-anchored angle term would pass every check and feed degrees into `sin`; a constant authored in electronvolts would enter a joule formula unconverted.

### Calculator term semantics

- **Delta terms.** `delta` (strictBool, default false) on magnitude, variable and symbol terms marks a difference (ΔT). The engine slice carries `delta: true` only on such terms. The calculator converts a delta term with the registry's `convertDelta` (factors only), for its input and for its solved value, and offers it affine units: 18 °F of warming is 10 K, not 265.37 K. Every other term keeps the linear-only unit list. `convert` would be right for an absolute temperature in °C, but if absolute terms were offered affine units, an interval the content forgot to flag would silently take an offset; with the linear-only list the failure is a missing unit choice, never a wrong answer.
- **Engine input errors**, checked in this order before any solution runs: a non-finite value (`inputs/not-a-number`); a fractional value on an `integer` term (`inputs/not-integer`, details `keys`); no non-constant term filled (`inputs/empty`); a non-constant term outside `solvable` left empty (`inputs/required`, details `keys` and `solvable`; previously `internal/unsupported`); then the fill-all-but-one rule over `solvable`. A missing constant stays `internal/unsupported`: it is a caller bug, not an input. `inputs/required` is guidance, like the other fill-all-but-one codes; `inputs/not-integer` is an alert.
- **Messages and labels.** `engineErrorMessage` in `@equreka/core/i18n` interpolates `{terms}` and `{solvable}` from the error's details, each key rendered by the UI. Every UI string that names a term (field labels, the result line, the copied result, error messages) uses the key's plain-text form from `texToFallbackText` (`\theta` → θ, `v_{0}` → v₀), now `@equreka/content/plain-symbol` and shared by web and mobile; the web calculator previously printed the raw key. Both calculators mark a field outside `solvable` as required and state the solvable set when it is narrower than the fields.

### Truncated constants

`truncated` (strictBool, default false) marks an authored `value` that cuts off a true value with no finite decimal form: an irrational number (π) or an exact value with endless digits (ħ = h/2π, the Stefan–Boltzmann constant, Wien's b, the molar volume). `irrational: true` requires it, and it requires `exact` or `irrational`: a measured value is rounded and carries an uncertainty, it is not truncated (schema rules). The web constant page and mobile constant details print the full-precision value with a trailing ellipsis (before any power of ten). Presentation only: the engine slice and the calculator read `value`.

### Level

Equations take a required `level` on the scale learning paths already use, now one shared enum (`contentLevel`: intro, intermediate, advanced; the i18n keys moved from `path.level.*` to `level.*`). Presentation only: the web equation page and the mobile equation entry show it as a badge.

### Versions

`SCHEMA_VERSION` goes from 3 to 4: the engine slice carries `delta`, which a consumer must honor (ignoring it applies an offset to an interval), and `solvable` changed meaning (scoped by `solveFor`, never a constant). `CONTENT_PIPELINE_VERSION` goes from 4 to 5: verification messages changed (influence rule, non-algebraic skip), so every cached verification is invalid.

## Precision and sampling range

Amended 2026-10-10. The university pass brings relativistic formulas whose checks the verifier could not run. In $K = mc^{2}\left(1/\sqrt{1 - v^{2}/c^{2}} - 1\right)$ the bracket is near 1e-16 at the speeds the unit box samples, and compute-engine's default 21 digits keep about five of them, so a correct root disagreed by 1e-5 against the 1e-9 tolerance. In $E^{2} = (pc)^{2} + (mc^{2})^{2}$ the roots for `p` and `m` are real only where `E` exceeds `mc²`, about 9e16 times the mass in kilograms, which the box [0.1, 10) never reaches. The existing remedy, narrowing `solveFor`, would have dropped the invariant mass, a main use of the relation.

### Side precision

Compute-engine evaluates the sides at 50 significant digits. A side is then exact to well under the tolerance across both boxes, so a disagreement measures the root. The root runs in float64, as the calculator runs it, which turns the check into a numerical-stability gate: a root that cancels catastrophically (`m * c^2 * (1 / sqrt(1 - v^2 / c^2) - 1)` at a few metres per second) fails, and the stable form (`m * v^2 / (sqrt(1 - v^2 / c^2) * (1 + sqrt(1 - v^2 / c^2)))`) passes. A cold verification of the 339 algebraic equations at 50 digits reported no failure, so no existing root was unstable in the unit box.

### Wide sampling box

A root short of 20 valid samples after its 400 unit-box attempts gets a second pass of 400 attempts, with each free real term log-uniform over 1e-30 to 1e30 and integer terms unchanged (0–10). The pass has its own seed (`slug:key#index:wide`). The unit-box seed and samples never move, so every root that passed before passes on the same samples. Wide-box samples face the same balance check, so a wrong root still fails (`p = sqrt(E^2 - (m c^2)^2) / (2 c)` disagrees). A root still short after both passes fails as before, with the message naming both boxes.

### Ill-conditioned samples

Added the same day, from the W16 preflight. The Nernst root `Q = exp(z F (E_cell - E_cell_cond) / (R T))` overflows across most of the unit box, where T runs from 0.1 K to 10 K, and so moves to the wide box. There it met a sample with T near 1e24 K, where Q is 1 + 2e-13. Float64 keeps only three digits of that quotient's logarithm, so the rounding of Q alone breaks the balance, whatever the root.

The verifier now measures that before it fails a sample. It nudges the target by a relative 1e-8, scales the residual's shift down to the 64 units in the last place a stable float64 root may carry, and skips the sample as ill-conditioned when that alone exceeds the tolerance. A nudge that leaves the real domain also counts as ill-conditioned.

The test runs only on a sample that fails, so passing verdicts never change. A wrong root still disagrees at the first well-conditioned sample (`exp(2 z F ...)` does). An unstable root at a well-conditioned sample also still fails: the relativistic kinetic energy at walking speed shifts its residual by the nudge alone, far inside the tolerance.

### Version

`CONTENT_PIPELINE_VERSION` goes from 5 to 6: verdicts and messages changed, so every cached verification is invalid. The ill-conditioning test takes it to 7.

## Consequences

- Authors may use the TeX a textbook uses for a term key. The derivation unwraps font and text wrappers but stays lossy for anything else (`[\mathrm{H}^{+}]` derives a bare `H`), and the `identifier` override is the escape hatch.
- A solution's root order is a product decision: the calculator answers with the first admissible root, and the remaining finite roots are listed beside it.
- `integer` is a sampling and input contract only; nothing checks that a solution *for* an integer term yields an integer.
- A bare letter in an expression is now an error rather than an accident: `\mag{F}=m\var{a}` fails until `m` is annotated.
- Verification is order-independent and cache-independent, and a wrong coefficient on a quantity of order 1e-34 fails like any other.
- Every algebraic expression is parsed by compute-engine, whether or not it has solutions. Non-algebraic notation (∇, ∂, ∫) is declared with `algebraic: false` and is rendered and linted but never parsed, solved or offered to the calculator (*Coverage and calculator rules*).
- An algebraic equation with an enabled calculator answers for every unknown it offers, every root depends on every input, and every number the calculator handles is in SI-coherent units; a degenerate, incomplete or mis-anchored equation fails the build instead of shipping.
- Cold verification costs one engine and two parses per equation, plus one evaluation per additive operand per sample, at 50 digits since the 2026-10-10 amendment (a cold check of the 860-entity corpus took about 9 s when amended).
- A root must be numerically stable in float64 over the sampling box, not only algebraically right; an author rewrites a cancelling difference (`1/sqrt(1 - x) - 1`, `1 - cos(x)` at small x) into a stable equivalent.
- A root whose domain depends on a constant's scale verifies without narrowing `solveFor`; narrowing remains for a root whose domain lies outside both boxes (a negative-only input such as a Bohr energy).
