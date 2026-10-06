import type { SolutionAst, SolutionFunction } from './solution-parser.js';

const FUNCTION_TARGET: Record<SolutionFunction, string> = {
	abs: 'Math.abs',
	cos: 'Math.cos',
	exp: 'Math.exp',
	ln: 'Math.log',
	sin: 'Math.sin',
	sqrt: 'Math.sqrt',
	tan: 'Math.tan',
};

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
 * under IEEE 754 (sqrt of negative, division by zero times zero) and are
 * mapped to null.
 */
export function generateSolutionsModule(
	equations: ReadonlyMap<string, ReadonlyMap<string, SolutionAst>>,
): SolutionsModule {
	const lines: string[] = ['export const solutions = {'];
	const slugs = [...equations.keys()].sort();
	for (const slug of slugs) {
		const byTermKey = equations.get(slug);
		if (byTermKey === undefined || byTermKey.size === 0) {
			continue;
		}
		lines.push(`\t${JSON.stringify(slug)}: {`);
		for (const termKey of [...byTermKey.keys()].sort()) {
			const ast = byTermKey.get(termKey);
			if (ast === undefined) {
				continue;
			}
			lines.push(`\t\t${JSON.stringify(termKey)}: (v) => {`);
			lines.push(`\t\t\tconst value = ${generateExpression(ast)};`);
			lines.push('\t\t\treturn Number.isFinite(value) ? value : null;');
			lines.push('\t\t},');
		}
		lines.push('\t},');
	}
	lines.push('};');
	lines.push('');
	const dts = [
		'export type SolutionFn = (values: Record<string, number>) => number | null;',
		'export declare const solutions: Record<string, Record<string, SolutionFn>>;',
		'',
	].join('\n');
	return { js: lines.join('\n'), dts };
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
