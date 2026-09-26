import type { CompiledEquationMeta } from '@equreka/schema';
import { texToFallbackText } from '../../shared/math/plain-symbol';
import {
	parseSolution,
	solutionToTex,
	substituteSolutionText,
} from '../../shared/math/solution-tex';

export interface SolvedFormLine {
	tex: string;
	text: string;
}

/**
 * The solved-for term's authored solution as two display lines: the
 * symbolic form with identifiers drawn as their term keys, then the same
 * form with every known value substituted (`\pi` stays symbolic). `knowns`
 * is keyed by term key and holds decimal literals. Null when the equation
 * carries no solution for the term or the string does not parse — the
 * numeric result never depends on this.
 */
export function buildSolvedForm(
	meta: CompiledEquationMeta,
	solutions: Readonly<Record<string, string>>,
	solved: string,
	knowns: Readonly<Record<string, string>>,
): SolvedFormLine[] | null {
	const source = solutions[solved];
	if (source === undefined) return null;
	const symbols: Record<string, string> = {};
	const values: Record<string, string> = {};
	for (const [key, term] of Object.entries(meta.terms)) {
		symbols[term.identifier] = key;
		const literal = knowns[key];
		if (key !== solved && literal !== undefined) values[term.identifier] = literal;
	}
	let tex: string;
	let substitutedTex: string;
	let substitutedText: string;
	try {
		const ast = parseSolution(source);
		tex = solutionToTex(ast, { symbols });
		substitutedTex = solutionToTex(ast, { symbols, values });
		substitutedText = substituteSolutionText(source, values);
	} catch {
		return null;
	}
	const lhs = texToFallbackText(solved);
	return [
		{ tex: `${solved} = ${tex}`, text: `${lhs} = ${source}` },
		{ tex: `${solved} = ${substitutedTex}`, text: `${lhs} = ${substitutedText}` },
	];
}
