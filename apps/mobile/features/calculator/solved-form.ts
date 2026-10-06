import { texToFallbackText } from '@equreka/content/plain-symbol';
import { parseSolution, solutionRoots } from '@equreka/content/solution-grammar';
import type { CompiledEquationMeta, EquationSolution } from '@equreka/schema';
import { solutionToTex, substituteSolutionText } from '../../shared/math/solution-tex';

export interface SolvedFormLine {
	tex: string;
	text: string;
}

/**
 * The solved-for term's authored solution as two display lines: the
 * symbolic form with identifiers drawn as their term keys, then the same
 * form with every known value substituted (`\pi` stays symbolic). `root` is
 * the authored index of the root the engine chose, so a multi-root solution
 * shows the form that produced the displayed value. `knowns` is keyed by
 * term key and holds decimal literals. Null when the equation carries no
 * such root for the term or the string does not parse — the numeric result
 * never depends on this.
 */
export function buildSolvedForm(
	meta: CompiledEquationMeta,
	solutions: Readonly<Record<string, EquationSolution>>,
	solved: string,
	knowns: Readonly<Record<string, string>>,
	root = 0,
): SolvedFormLine[] | null {
	const solution = solutions[solved];
	const source = solution === undefined ? undefined : solutionRoots(solution)[root];
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
