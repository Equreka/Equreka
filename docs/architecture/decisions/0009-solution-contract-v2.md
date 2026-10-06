# 0009 — Solution contract v2: term identity and scale-free verification

Date: 2026-10-06 · Status: accepted

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
- **Identifier.** The effective identifier is the authored `identifier` override (new, optional on every term kind) or else the key with every character outside `[A-Za-z0-9_]` dropped (`termIdentifier`). It must match `^[A-Za-z][A-Za-z0-9_]*$` and be unique within the equation. It must not be a grammar function name, current or announced (`RESERVED_FUNCTION_NAMES` in the solution parser: `sqrt abs ln exp sin cos tan asin acos atan log10 log2 cbrt sinh cosh tanh asinh acosh atanh factorial`), so extending the grammar can never reinterpret an authored identifier. It must not be an `Object.prototype` property name. `pi` is allowed only on the constant term with `ref: 'pi'`: the grammar reads `pi` as π, which is correct only where the values coincide.
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

Defined in a follow-up change (Part 2: grammar v2 and multi-root solutions), which amends this ADR.

## Consequences

- Authors may use the TeX a textbook uses for a term key. The derivation stays lossy (`\mathrm{KE}` derives `mathrmKE`), and the `identifier` override is the escape hatch.
- A bare letter in an expression is now an error rather than an accident: `\mag{F}=m\var{a}` fails until `m` is annotated.
- Verification is order-independent and cache-independent, and a wrong coefficient on a quantity of order 1e-34 fails like any other.
- Every expression is still parsed by compute-engine, whether or not it has solutions, as before. Non-algebraic notation (∇, ∂, ∫) will need a decision before such equations enter the corpus.
- Cold verification costs one engine and two parses per equation, plus one evaluation per additive operand per sample.
