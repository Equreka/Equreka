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

/**
 * Codegen from verified solution ASTs to a plain ESM module — no eval, no
 * runtime parser (ADR 0002). The module is `solutions[slug][termKey]`, the
 * shape the engine looks up (ADR 0009); each function reads its arguments
 * by identifier. Keys are emitted as JSON string literals because a term key
 * is arbitrary TeX (`\theta`, `v_{0}`). Domain violations surface as NaN
 * under IEEE 754 (sqrt of a negative, asin beyond ±1, factorial of a
 * fraction). A single-root solution returns its value or null when it is
 * not finite; a multi-root one returns every root in authored order, NaN
 * for each root that is not finite, or null when none is.
 */
export function generateSolutionsModule(
	equations: ReadonlyMap<string, ReadonlyMap<string, readonly SolutionAst[]>>,
): SolutionsModule {
	const body: string[] = ['export const solutions = {'];
	const slugs = [...equations.keys()].sort();
	let usesFactorial = false;
	for (const slug of slugs) {
		const byTermKey = equations.get(slug);
		if (byTermKey === undefined || byTermKey.size === 0) {
			continue;
		}
		body.push(`\t${JSON.stringify(slug)}: {`);
		for (const termKey of [...byTermKey.keys()].sort()) {
			const roots = byTermKey.get(termKey) ?? [];
			const [first] = roots;
			if (first === undefined) {
				continue;
			}
			usesFactorial ||= roots.some(callsFactorial);
			body.push(`\t\t${JSON.stringify(termKey)}: (v) => {`);
			if (roots.length === 1) {
				body.push(`\t\t\tconst value = ${generateExpression(first)};`);
				body.push('\t\t\treturn Number.isFinite(value) ? value : null;');
			} else {
				body.push(`\t\t\tconst roots = [${roots.map(generateExpression).join(', ')}];`);
				body.push(
					'\t\t\treturn roots.some(Number.isFinite) ? roots.map((root) => (Number.isFinite(root) ? root : Number.NaN)) : null;',
				);
			}
			body.push('\t\t},');
		}
		body.push('\t},');
	}
	body.push('};');
	body.push('');
	const dts = [
		'export type SolutionFn = (values: Record<string, number>) => number | readonly number[] | null;',
		'export declare const solutions: Record<string, Record<string, SolutionFn>>;',
		'',
	].join('\n');
	return { js: [...(usesFactorial ? FACTORIAL_HELPER : []), ...body].join('\n'), dts };
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
