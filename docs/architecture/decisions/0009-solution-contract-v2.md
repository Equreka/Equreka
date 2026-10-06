# 0009 — Solution contract v2: term identity and scale-free verification

Date: 2026-10-06 · Status: accepted · Amended 2026-10-06 (grammar v2 and multi-root solutions)

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

A sample where any operand is non-finite or has a non-zero imaginary part is invalid: it is skipped and counts toward the 400-attempt cap, never compared. Fewer than 20 valid samples remains an error.

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

## Consequences

- Authors may use the TeX a textbook uses for a term key. The derivation unwraps font and text wrappers but stays lossy for anything else (`[\mathrm{H}^{+}]` derives a bare `H`), and the `identifier` override is the escape hatch.
- A solution's root order is a product decision: the calculator answers with the first admissible root, and the remaining finite roots are listed beside it.
- `integer` is a sampling and input contract only; nothing checks that a solution *for* an integer term yields an integer.
- A bare letter in an expression is now an error rather than an accident: `\mag{F}=m\var{a}` fails until `m` is annotated.
- Verification is order-independent and cache-independent, and a wrong coefficient on a quantity of order 1e-34 fails like any other.
- Every expression is still parsed by compute-engine, whether or not it has solutions, as before. Non-algebraic notation (∇, ∂, ∫) will need a decision before such equations enter the corpus.
- Cold verification costs one engine and two parses per equation, plus one evaluation per additive operand per sample.
