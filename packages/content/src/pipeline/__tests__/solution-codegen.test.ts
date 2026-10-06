import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { termIdentifier } from '../../rich-text.js';
import { generateSolutionsModule } from '../solution-codegen.js';
import { type EquationSolutionInput, verifyEquation } from '../solution-verify.js';

type SolutionFn = (values: Record<string, number>) => number | null;

const arcLength: EquationSolutionInput = {
	slug: 'arc-length',
	expression: '\\var{s}=\\var{r}\\var{\\theta}',
	terms: {
		s: { kind: 'symbol' },
		r: { kind: 'symbol', identifier: 'radius' },
		'\\theta': { kind: 'symbol' },
	},
	solutions: { s: 'radius * theta', '\\theta': 's / radius' },
	constantValues: {},
};

/**
 * The engine's half of the contract (solveEquation): the function is
 * looked up by the unknown's term key and receives every other term's
 * value keyed by identifier.
 */
function solveLikeEngine(
	solutions: Record<string, Record<string, SolutionFn>>,
	input: EquationSolutionInput,
	knowns: Record<string, number>,
	unknown: string,
): number | null | undefined {
	const args = Object.fromEntries(
		Object.entries(input.terms)
			.filter(([key]) => key !== unknown)
			.map(([key, term]) => [termIdentifier(key, term.identifier), knowns[key] ?? Number.NaN]),
	);
	return solutions[input.slug]?.[unknown]?.(args);
}

describe('generateSolutionsModule', () => {
	it('emits solutions[slug][termKey] reading arguments by identifier, so a TeX key solves', async () => {
		const verification = verifyEquation(arcLength);
		expect(verification.messages).toEqual([]);
		const { js } = generateSolutionsModule(new Map([[arcLength.slug, verification.asts]]));
		const dir = mkdtempSync(join(tmpdir(), 'equreka-codegen-'));
		try {
			writeFileSync(join(dir, 'solutions.js'), js);
			const { solutions } = (await import(pathToFileURL(join(dir, 'solutions.js')).href)) as {
				solutions: Record<string, Record<string, SolutionFn>>;
			};
			expect(Object.keys(solutions[arcLength.slug] ?? {}).sort()).toEqual(['\\theta', 's']);
			expect(solveLikeEngine(solutions, arcLength, { s: 3, r: 2 }, '\\theta')).toBeCloseTo(1.5, 12);
			expect(solveLikeEngine(solutions, arcLength, { r: 2, '\\theta': 1.5 }, 's')).toBeCloseTo(
				3,
				12,
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
