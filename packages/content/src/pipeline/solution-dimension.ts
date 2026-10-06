import type { CompiledDimension, EquationTerm } from '@equreka/schema';
import { parseSolution, type SolutionAst, solutionRoots } from '../solution-grammar.js';
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
	withoutAngle,
} from './dimension.js';
import { type Rat, ratFromDecimal, ratToDecimal } from './rational.js';
import { solutionLabel } from './solution-verify.js';
import { buildIdentifierMap } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

class DimensionError extends Error {}

/**
 * Stage 4b: every authored root must be dimensionally consistent with the
 * term it solves for. The solution AST is walked with dimension algebra —
 * `*` adds exponent vectors, `/` subtracts, `^` by a literal scales
 * (non-integral results are errors, so sqrt of an odd power fails), `sqrt`
 * halves and `cbrt` thirds, `+`/`-` require equal operands, `abs` preserves
 * its argument, and every other function requires and yields
 * dimensionless. A wrong solved form that happens to balance numerically
 * at the sampled points still fails here when its units do not.
 */
export function checkSolutionDimensions(corpus: Corpus): Issue[] {
	const issues: Issue[] = [];
	for (const [slug, equation] of corpus.equations) {
		const file = fileOf('equations', slug);
		const identifierMap = buildIdentifierMap(equation.terms);
		if (identifierMap.errors.length > 0) {
			continue;
		}
		const env: Record<string, CompiledDimension> = {};
		let complete = true;
		for (const [key, term] of Object.entries(equation.terms)) {
			const dimension = termDimension(term, corpus);
			const identifier = identifierMap.byTermKey.get(key);
			if (dimension === undefined || identifier === undefined) {
				complete = false;
				continue;
			}
			env[identifier] = dimension;
		}
		if (!complete) {
			continue;
		}
		for (const [targetKey, solution] of Object.entries(equation.solutions)) {
			const targetId = identifierMap.byTermKey.get(targetKey);
			const target = targetId === undefined ? undefined : env[targetId];
			if (target === undefined) {
				continue;
			}
			const roots = solutionRoots(solution);
			for (const [index, source] of roots.entries()) {
				const message = rootDimensionMessage(source, env, target);
				if (message !== undefined) {
					issues.push(
						issue(
							'error',
							'dimensions',
							file,
							`${solutionLabel(targetKey, index, roots.length)}${message}`,
						),
					);
				}
			}
		}
	}
	return issues;
}

/**
 * The tail of a dimension error for one authored root, or undefined when
 * the root is consistent or does not parse (the verify stage reports
 * syntax).
 */
function rootDimensionMessage(
	source: string,
	env: Record<string, CompiledDimension>,
	target: CompiledDimension,
): string | undefined {
	let ast: SolutionAst;
	try {
		ast = parseSolution(source);
	} catch {
		return undefined;
	}
	try {
		const result = dimensionOf(ast, env);
		return dimensionsEqual(result, target)
			? undefined
			: ` has dimension ${formatDimension(result)} but the term has ${formatDimension(target)}`;
	} catch (error) {
		if (!(error instanceof DimensionError)) {
			throw error;
		}
		return `: ${error.message}`;
	}
}

/**
 * A term's dimension as equation checks see it, the angle exponent dropped
 * (`withoutAngle`): magnitude → its vector; constant → its unit's;
 * variable → its defaultUnit's (dimensionless without one); symbol → its
 * unit's (dimensionless without one). Undefined only for dangling refs,
 * which the integrity stage already reports.
 */
export function termDimension(term: EquationTerm, corpus: Corpus): CompiledDimension | undefined {
	const declared = declaredTermDimension(term, corpus);
	return declared === undefined ? undefined : withoutAngle(declared);
}

function declaredTermDimension(term: EquationTerm, corpus: Corpus): CompiledDimension | undefined {
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
			switch (ast.fn) {
				case 'sqrt':
					return rootOf(arg, 2n, ast.fn);
				case 'cbrt':
					return rootOf(arg, 3n, ast.fn);
				case 'abs':
					return arg;
				default:
					if (!isDimensionless(arg)) {
						throw new DimensionError(
							`${ast.fn}() requires a dimensionless argument, got ${formatDimension(arg)}`,
						);
					}
					return DIMENSION_ZERO;
			}
		}
	}
}

function rootOf(arg: CompiledDimension, degree: bigint, fn: string): CompiledDimension {
	const root = dimensionScale(arg, 1n, degree);
	if (root === undefined) {
		throw new DimensionError(
			`${fn} of ${formatDimension(arg)} yields non-integral dimension exponents`,
		);
	}
	return root;
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
