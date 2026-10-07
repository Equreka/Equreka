import { FACTORIAL_MAX, type SolutionAst, type SolutionFunction } from '../solution-grammar.js';

const FUNCTION_TARGET: Record<SolutionFunction, string> = {
	sqrt: 'Math.sqrt',
	abs: 'Math.abs',
	ln: 'Math.log',
	exp: 'Math.exp',
	sin: 'Math.sin',
	cos: 'Math.cos',
	tan: 'Math.tan',
	asin: 'Math.asin',
	acos: 'Math.acos',
	atan: 'Math.atan',
	log10: 'Math.log10',
	log2: 'Math.log2',
	cbrt: 'Math.cbrt',
	sinh: 'Math.sinh',
	cosh: 'Math.cosh',
	tanh: 'Math.tanh',
	asinh: 'Math.asinh',
	acosh: 'Math.acosh',
	atanh: 'Math.atanh',
	factorial: 'factorial',
};

/**
 * The generated module's `factorial`, emitted only when a solution calls
 * it: the grammar's `factorial` restated as source, because a function's
 * runtime `toString()` depends on the transpiler. The codegen tests pin
 * the two to the same values.
 */
const FACTORIAL_HELPER = [
	'function factorial(n) {',
	`\tif (!Number.isInteger(n) || n < 0 || n > ${FACTORIAL_MAX}) return Number.NaN;`,
	'\tlet product = 1;',
	'\tfor (let factor = 2; factor <= n; factor += 1) product *= factor;',
	'\treturn product;',
	'}',
	'',
];

export interface SolutionsModule {
	js: string;
	dts: string;
}

const SOLUTION_FN_DTS =
	'export type SolutionFn = (values: Record<string, number>) => number | readonly number[] | null;';

/**
 * The file name `dist/solutions/index.js` takes, so no equation slug may
 * take it.
 */
export const SOLUTIONS_LOADER_NAME = 'index';

interface SolvedEquation {
	slug: string;
	terms: [string, readonly SolutionAst[]][];
}

function solvedEquations(
	equations: ReadonlyMap<string, ReadonlyMap<string, readonly SolutionAst[]>>,
): SolvedEquation[] {
	return [...equations.keys()]
		.sort()
		.map((slug) => ({
			slug,
			terms: [...(equations.get(slug) ?? new Map<string, readonly SolutionAst[]>())]
				.filter(([, roots]) => roots.length > 0)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
		}))
		.filter((equation) => equation.terms.length > 0);
}

function equationCallsFactorial(equation: SolvedEquation): boolean {
	return equation.terms.some(([, roots]) => roots.some(callsFactorial));
}

function termFunctionLines(
	termKey: string,
	roots: readonly SolutionAst[],
	indent: string,
): string[] {
	const [first] = roots;
	if (first === undefined) {
		return [];
	}
	const body =
		roots.length === 1
			? [
					`${indent}\tconst value = ${generateExpression(first)};`,
					`${indent}\treturn Number.isFinite(value) ? value : null;`,
				]
			: [
					`${indent}\tconst roots = [${roots.map(generateExpression).join(', ')}];`,
					`${indent}\treturn roots.some(Number.isFinite) ? roots.map((root) => (Number.isFinite(root) ? root : Number.NaN)) : null;`,
				];
	return [`${indent}${JSON.stringify(termKey)}: (v) => {`, ...body, `${indent}},`];
}

/**
 * Codegen from verified solution ASTs to a plain ESM module — no eval, no
 * runtime parser (ADR 0002). The module is `solutions[slug][termKey]`, the
 * shape the engine looks up (ADR 0009); each function reads its arguments
 * by identifier. Keys are emitted as JSON string literals because a term key
 * is arbitrary TeX (`\theta`, `v_{0}`). Domain violations surface as NaN
 * under IEEE 754 (sqrt of a negative, asin beyond ±1, factorial of a
 * fraction). A single-root solution returns its value or null when it is
 * not finite; a multi-root one returns every root in authored order, NaN
 * for each root that is not finite, or null when none is. Mobile bundles
 * this aggregate; the web loads one `generateEquationSolutionModules`
 * module per calculator page instead.
 */
export function generateSolutionsModule(
	equations: ReadonlyMap<string, ReadonlyMap<string, readonly SolutionAst[]>>,
): SolutionsModule {
	const solved = solvedEquations(equations);
	const body = [
		'export const solutions = {',
		...solved.flatMap((equation) => [
			`\t${JSON.stringify(equation.slug)}: {`,
			...equation.terms.flatMap(([termKey, roots]) => termFunctionLines(termKey, roots, '\t\t')),
			'\t},',
		]),
		'};',
		'',
	];
	const dts = [
		SOLUTION_FN_DTS,
		'export declare const solutions: Record<string, Record<string, SolutionFn>>;',
		'',
	].join('\n');
	const usesFactorial = solved.some(equationCallsFactorial);
	return { js: [...(usesFactorial ? FACTORIAL_HELPER : []), ...body].join('\n'), dts };
}

/**
 * One module per solved equation, keyed by slug, whose default export is
 * the aggregate's `solutions[slug]` generated again, so a web calculator
 * page downloads only its own equation's functions (ADR 0010).
 */
export function generateEquationSolutionModules(
	equations: ReadonlyMap<string, ReadonlyMap<string, readonly SolutionAst[]>>,
): Map<string, string> {
	return new Map(
		solvedEquations(equations).map((equation) => [
			equation.slug,
			[
				...(equationCallsFactorial(equation) ? FACTORIAL_HELPER : []),
				'export default {',
				...equation.terms.flatMap(([termKey, roots]) => termFunctionLines(termKey, roots, '\t')),
				'};',
				'',
			].join('\n'),
		]),
	);
}

/**
 * `loadSolutions(slug)` over the per-equation modules: one literal
 * `import()` per slug, because bundlers split only static specifiers into
 * chunks, inside a `switch`, so no slug can resolve to an Object.prototype
 * member. Resolves to undefined for a slug without solutions.
 */
export function generateSolutionsLoader(slugs: readonly string[]): SolutionsModule {
	const js = [
		'function termSolutionsOf(module) {',
		'\treturn module.default;',
		'}',
		'',
		'export function loadSolutions(slug) {',
		'\tswitch (slug) {',
		...[...slugs]
			.sort()
			.flatMap((slug) => [
				`\t\tcase ${JSON.stringify(slug)}:`,
				`\t\t\treturn import(${JSON.stringify(`./${slug}.js`)}).then(termSolutionsOf);`,
			]),
		'\t\tdefault:',
		'\t\t\treturn Promise.resolve(undefined);',
		'\t}',
		'}',
		'',
	].join('\n');
	const dts = [
		SOLUTION_FN_DTS,
		'export declare function loadSolutions(slug: string): Promise<Record<string, SolutionFn> | undefined>;',
		'',
	].join('\n');
	return { js, dts };
}

function callsFactorial(ast: SolutionAst): boolean {
	switch (ast.kind) {
		case 'unary':
			return callsFactorial(ast.operand);
		case 'binary':
			return callsFactorial(ast.left) || callsFactorial(ast.right);
		case 'call':
			return ast.fn === 'factorial' || callsFactorial(ast.arg);
		default:
			return false;
	}
}

function generateExpression(ast: SolutionAst): string {
	switch (ast.kind) {
		case 'number':
			return ast.text;
		case 'identifier':
			return `v.${ast.name}`;
		case 'pi':
			return 'Math.PI';
		case 'unary':
			return `-(${generateExpression(ast.operand)})`;
		case 'binary':
			if (ast.op === '^') {
				return `Math.pow(${generateExpression(ast.left)}, ${generateExpression(ast.right)})`;
			}
			return `(${generateExpression(ast.left)} ${ast.op} ${generateExpression(ast.right)})`;
		case 'call':
			return `${FUNCTION_TARGET[ast.fn]}(${generateExpression(ast.arg)})`;
	}
}
