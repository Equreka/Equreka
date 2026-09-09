import type { CompiledDimension, EquationTerm } from '@equreka/schema';
import {
	DIMENSION_ZERO,
	dimensionAdd,
	dimensionScale,
	dimensionSubtract,
	dimensionsEqual,
	formatDimension,
	isDimensionless,
	magnitudeDimension,
	unitDimension,
} from './dimension.js';
import { type Rat, ratFromDecimal, ratToDecimal } from './rational.js';
import { parseSolution, type SolutionAst } from './solution-parser.js';
import { buildIdentifierMap } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

class DimensionError extends Error {}

/**
 * Stage 4b: every authored solution must be dimensionally consistent with
 * the term it solves for. The solution AST is walked with dimension
 * algebra — `*` adds exponent vectors, `/` subtracts, `^` by a literal
 * scales (non-integral results are errors, so sqrt of an odd power fails),
 * `+`/`-` require equal operands, transcendental functions require and
 * yield dimensionless, `abs` preserves its argument. A wrong solved form
 * that happens to balance numerically at the sampled points still fails
 * here when its units do not.
 */
export function checkSolutionDimensions(corpus: Corpus): Issue[] {
	const issues: Issue[] = [];
	for (const [slug, equation] of corpus.equations) {
		const file = fileOf('equations', slug);
		const identifierMap = buildIdentifierMap(Object.keys(equation.terms));
		if (identifierMap.errors.length > 0) {
			continue;
		}
		const env: Record<string, CompiledDimension> = {};
		let complete = true;
		for (const [key, term] of Object.entries(equation.terms)) {
			const dimension = termDimension(term, corpus);
			const identifier = identifierMap.byTermKey[key];
			if (dimension === undefined || identifier === undefined) {
				complete = false;
				continue;
			}
			env[identifier] = dimension;
		}
		if (!complete) {
			continue;
		}
		for (const [targetKey, source] of Object.entries(equation.solutions)) {
			const targetId = identifierMap.byTermKey[targetKey];
			const target = targetId === undefined ? undefined : env[targetId];
			if (target === undefined) {
				continue;
			}
			let ast: SolutionAst;
			try {
				ast = parseSolution(source);
			} catch {
				continue;
			}
			try {
				const result = dimensionOf(ast, env);
				if (!dimensionsEqual(result, target)) {
					issues.push(
						issue(
							'error',
							'dimensions',
							file,
							`solution for '${targetKey}' has dimension ${formatDimension(result)} but the term has ${formatDimension(target)}`,
						),
					);
				}
			} catch (error) {
				if (!(error instanceof DimensionError)) {
					throw error;
				}
				issues.push(
					issue('error', 'dimensions', file, `solution for '${targetKey}': ${error.message}`),
				);
			}
		}
	}
	return issues;
}

/**
 * A term's dimension: magnitude → its vector; constant → its unit's;
 * variable → its defaultUnit's (dimensionless without one); symbol → its
 * unit's (dimensionless without one). Undefined only for dangling refs,
 * which the integrity stage already reports.
 */
export function termDimension(term: EquationTerm, corpus: Corpus): CompiledDimension | undefined {
	const viaUnit = (unitSlug: string | undefined): CompiledDimension | undefined => {
		if (unitSlug === undefined) {
			return DIMENSION_ZERO;
		}
		const unit = corpus.units.get(unitSlug);
		return unit === undefined ? undefined : unitDimension(unit, corpus);
	};
	switch (term.kind) {
		case 'magnitude': {
			const magnitude = corpus.magnitudes.get(term.ref);
			return magnitude === undefined ? undefined : magnitudeDimension(magnitude);
		}
		case 'constant': {
			const constant = corpus.constants.get(term.ref);
			return constant === undefined ? undefined : viaUnit(constant.unit);
		}
		case 'variable': {
			const variable = corpus.variables.get(term.ref);
			return variable === undefined ? undefined : viaUnit(variable.defaultUnit);
		}
		case 'symbol':
			return viaUnit(term.unit);
	}
}

export function dimensionOf(
	ast: SolutionAst,
	env: Record<string, CompiledDimension>,
): CompiledDimension {
	switch (ast.kind) {
		case 'number':
		case 'pi':
			return DIMENSION_ZERO;
		case 'identifier': {
			const dimension = env[ast.name];
			if (dimension === undefined) {
				throw new DimensionError(`unknown identifier '${ast.name}'`);
			}
			return dimension;
		}
		case 'unary':
			return dimensionOf(ast.operand, env);
		case 'binary': {
			const left = dimensionOf(ast.left, env);
			if (ast.op === '^') {
				return power(left, ast.right, env);
			}
			const right = dimensionOf(ast.right, env);
			if (ast.op === '*') {
				return dimensionAdd(left, right);
			}
			if (ast.op === '/') {
				return dimensionSubtract(left, right);
			}
			if (!dimensionsEqual(left, right)) {
				throw new DimensionError(
					`'${ast.op}' combines incompatible dimensions ${formatDimension(left)} and ${formatDimension(right)}`,
				);
			}
			return left;
		}
		case 'call': {
			const arg = dimensionOf(ast.arg, env);
			if (ast.fn === 'sqrt') {
				const half = dimensionScale(arg, 1n, 2n);
				if (half === undefined) {
					throw new DimensionError(
						`sqrt of ${formatDimension(arg)} yields non-integral dimension exponents`,
					);
				}
				return half;
			}
			if (ast.fn === 'abs') {
				return arg;
			}
			if (!isDimensionless(arg)) {
				throw new DimensionError(
					`${ast.fn}() requires a dimensionless argument, got ${formatDimension(arg)}`,
				);
			}
			return DIMENSION_ZERO;
		}
	}
}

function power(
	base: CompiledDimension,
	exponentAst: SolutionAst,
	env: Record<string, CompiledDimension>,
): CompiledDimension {
	const literal = literalExponent(exponentAst);
	if (literal === undefined) {
		const exponent = dimensionOf(exponentAst, env);
		if (!isDimensionless(base) || !isDimensionless(exponent)) {
			throw new DimensionError(
				`'^' with a non-literal exponent requires a dimensionless base and exponent, got base ${formatDimension(base)} and exponent ${formatDimension(exponent)}`,
			);
		}
		return DIMENSION_ZERO;
	}
	const scaled = dimensionScale(base, literal.num, literal.den);
	if (scaled === undefined) {
		throw new DimensionError(
			`raising ${formatDimension(base)} to the power ${ratToDecimal(literal).text} yields non-integral dimension exponents`,
		);
	}
	return scaled;
}

function literalExponent(ast: SolutionAst): Rat | undefined {
	if (ast.kind === 'number') {
		return ratFromDecimal(ast.text);
	}
	if (ast.kind === 'unary') {
		const inner = literalExponent(ast.operand);
		return inner === undefined ? undefined : { num: -inner.num, den: inner.den };
	}
	return undefined;
}
