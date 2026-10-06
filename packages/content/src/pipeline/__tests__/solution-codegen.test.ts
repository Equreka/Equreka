import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	type SolutionsModule as EngineSolutions,
	type SolveSuccess,
	solveEquation,
} from '@equreka/engine/solutions';
import type { CompiledEquationMeta } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { termIdentifier } from '../../rich-text.js';
import { factorial, parseSolution, type SolutionAst } from '../../solution-grammar.js';
import { generateSolutionsModule } from '../solution-codegen.js';
import { type EquationSolutionInput, verifyEquation } from '../solution-verify.js';

type SolutionFn = (values: Record<string, number>) => number | readonly number[] | null;
type GeneratedSolutions = Record<string, Record<string, SolutionFn>>;

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
 * Imports generated module source the way an app bundles `solutions.js`:
 * as a real ES module file, never through eval.
 */
async function importGenerated(js: string): Promise<GeneratedSolutions> {
	const dir = mkdtempSync(join(tmpdir(), 'equreka-codegen-'));
	try {
		writeFileSync(join(dir, 'solutions.js'), js);
		const module = (await import(pathToFileURL(join(dir, 'solutions.js')).href)) as {
			solutions: GeneratedSolutions;
		};
		return module.solutions;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

async function generatedFrom(
	byTermKey: Record<string, readonly string[]>,
	slug = 'sample',
): Promise<Record<string, SolutionFn>> {
	const asts = new Map<string, readonly SolutionAst[]>(
		Object.entries(byTermKey).map(([key, roots]) => [key, roots.map(parseSolution)]),
	);
	const { js } = generateSolutionsModule(new Map([[slug, asts]]));
	return (await importGenerated(js))[slug] ?? {};
}

/**
 * The engine's half of the contract (solveEquation): the function is
 * looked up by the unknown's term key and receives every other term's
 * value keyed by identifier.
 */
function solveLikeEngine(
	solutions: GeneratedSolutions,
	input: EquationSolutionInput,
	knowns: Record<string, number>,
	unknown: string,
): number | readonly number[] | null | undefined {
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
		const solutions = await importGenerated(js);
		expect(Object.keys(solutions[arcLength.slug] ?? {}).sort()).toEqual(['\\theta', 's']);
		expect(solveLikeEngine(solutions, arcLength, { s: 3, r: 2 }, '\\theta')).toBeCloseTo(1.5, 12);
		expect(solveLikeEngine(solutions, arcLength, { r: 2, '\\theta': 1.5 }, 's')).toBeCloseTo(3, 12);
	});

	it('returns a single root as a number, or null outside its domain', async () => {
		const fns = await generatedFrom({ x: ['asin(y)'] });
		expect(fns.x?.({ y: 1 })).toBe(Math.PI / 2);
		expect(fns.x?.({ y: 2 })).toBeNull();
	});

	it('returns every root in authored order, NaN where one is not real, null when none is', async () => {
		const fns = await generatedFrom({ x: ['sqrt(y)', '-sqrt(y)', 'acosh(y)'] });
		expect(fns.x?.({ y: 4 })).toEqual([2, -2, Math.acosh(4)]);
		expect(fns.x?.({ y: 0.25 })).toEqual([0.5, -0.5, Number.NaN]);
		expect(fns.x?.({ y: -1 })).toBeNull();
	});

	it('maps a non-finite root to NaN, as it maps a non-finite single root to null', async () => {
		const fns = await generatedFrom({ x: ['1 / y', 'y'] });
		expect(fns.x?.({ y: 0 })).toEqual([Number.NaN, 0]);
	});

	it('calls the same Math function for every grammar function the evaluator does', async () => {
		const fns = await generatedFrom({
			x: ['log10(y) + log2(y) + cbrt(y) + atan(y) + sinh(y) + cosh(y) + tanh(y) + asinh(y)'],
			z: ['asin(1 / y) + acos(1 / y) + atanh(1 / y) + acosh(y) + exp(y) + ln(y) + abs(-y)'],
		});
		const y = 2;
		expect(fns.x?.({ y })).toBe(
			Math.log10(y) +
				Math.log2(y) +
				Math.cbrt(y) +
				Math.atan(y) +
				Math.sinh(y) +
				Math.cosh(y) +
				Math.tanh(y) +
				Math.asinh(y),
		);
		expect(fns.z?.({ y })).toBe(
			Math.asin(1 / y) +
				Math.acos(1 / y) +
				Math.atanh(1 / y) +
				Math.acosh(y) +
				Math.exp(y) +
				Math.log(y) +
				Math.abs(-y),
		);
	});

	it('emits a factorial helper only when a solution calls it, agreeing with the grammar', async () => {
		const without = generateSolutionsModule(
			new Map([['sample', new Map([['x', [parseSolution('sqrt(y)')]]])]]),
		);
		expect(without.js).not.toContain('function factorial');
		const fns = await generatedFrom({ x: ['factorial(y)'] });
		expect(generateSolutionsModule(new Map()).js).not.toContain('factorial');
		for (const n of [-2, -1, 0, 1, 2, 2.5, 5, 20, 22, 23, 170, 171, Number.NaN]) {
			const expected = factorial(n);
			expect(fns.x?.({ y: n }), String(n)).toBe(Number.isFinite(expected) ? expected : null);
		}
	});

	it('types a solution function as returning a number, a readonly root list or null', () => {
		expect(generateSolutionsModule(new Map()).dts).toContain(
			'export type SolutionFn = (values: Record<string, number>) => number | readonly number[] | null;',
		);
	});
});

describe('verify → codegen → engine', () => {
	const range: EquationSolutionInput = {
		slug: 'projectile-range',
		expression: '\\var{R}=\\frac{\\var{v}^{2}\\sin\\left(2\\var{\\theta}\\right)}{\\var{g}}',
		terms: {
			R: { kind: 'symbol' },
			v: { kind: 'symbol' },
			'\\theta': { kind: 'symbol' },
			g: { kind: 'symbol' },
		},
		solutions: {
			R: 'v^2 * sin(2 * theta) / g',
			'\\theta': ['asin(g * R / v^2) / 2', 'pi / 2 - asin(g * R / v^2) / 2'],
		},
		constantValues: {},
	};

	const displacement: EquationSolutionInput = {
		slug: 'displacement',
		expression: '\\var{x}=\\var{v_{0}}\\var{t}+\\frac{1}{2}\\var{a}\\var{t}^{2}',
		terms: {
			x: { kind: 'symbol' },
			'v_{0}': { kind: 'symbol' },
			t: { kind: 'symbol' },
			a: { kind: 'symbol' },
		},
		solutions: {
			t: ['(-v_0 + sqrt(v_0^2 + 2 * a * x)) / a', '(-v_0 - sqrt(v_0^2 + 2 * a * x)) / a'],
		},
		constantValues: {},
	};

	const combinations: EquationSolutionInput = {
		slug: 'combinations',
		expression: '\\var{C}=\\frac{\\var{n}!}{\\var{k}!\\left(\\var{n}-\\var{k}\\right)!}',
		terms: {
			C: { kind: 'symbol' },
			n: { kind: 'symbol', integer: true },
			k: { kind: 'symbol', integer: true },
		},
		solutions: { C: 'factorial(n) / (factorial(k) * factorial(n - k))' },
		constantValues: {},
	};

	function metaOf(input: EquationSolutionInput): CompiledEquationMeta {
		return {
			slug: input.slug,
			kind: 'equation',
			name: { en: input.slug },
			calculatorEnabled: true,
			terms: Object.fromEntries(
				Object.entries(input.terms).map(([key, term]) => [
					key,
					{ kind: term.kind, identifier: termIdentifier(key, term.identifier) },
				]),
			),
			solvable: Object.keys(input.solutions).sort(),
		};
	}

	async function engineSolutions(...inputs: EquationSolutionInput[]): Promise<EngineSolutions> {
		const verified = inputs.map((input) => {
			const verification = verifyEquation(input);
			expect(verification.messages, input.slug).toEqual([]);
			return [input.slug, verification.asts] as const;
		});
		const { js } = generateSolutionsModule(new Map(verified));
		return importGenerated(js);
	}

	it('solves the projectile angle for the low root first and lists both', async () => {
		const fns = await engineSolutions(range);
		const solved = solveEquation(metaOf(range), fns, { R: 5, v: 10, g: 9.8 });
		expect(solved.ok).toBe(true);
		const { value, root, allRoots } = (solved as { value: SolveSuccess }).value;
		const low = Math.asin((9.8 * 5) / 100) / 2;
		expect(root).toBe(0);
		expect(value).toBeCloseTo(low, 12);
		expect(allRoots).toHaveLength(2);
		expect(allRoots?.[1]).toBeCloseTo(Math.PI / 2 - low, 12);
		const outOfRange = solveEquation(metaOf(range), fns, { R: 50, v: 10, g: 9.8 });
		expect(outOfRange.ok ? undefined : outOfRange.error.code).toBe('solve/domain');
	});

	it('solves the displacement time for the forward root, also under nonNegative', async () => {
		const fns = await engineSolutions(displacement);
		const knowns = { x: 1, 'v_{0}': 1, a: 2 };
		const solved = solveEquation(metaOf(displacement), fns, knowns, {
			nonNegative: new Set(['t']),
		});
		expect(solved.ok).toBe(true);
		const success = (solved as { value: SolveSuccess }).value;
		expect(success.root).toBe(0);
		expect(success.value).toBeCloseTo((Math.sqrt(5) - 1) / 2, 12);
		expect(success.allRoots?.[1]).toBeCloseTo((-1 - Math.sqrt(5)) / 2, 12);
	});

	it('solves a binomial coefficient with integer terms', async () => {
		const fns = await engineSolutions(combinations);
		const solved = solveEquation(metaOf(combinations), fns, { n: 5, k: 2 });
		expect(solved.ok ? solved.value : undefined).toEqual({ symbol: 'C', value: 10, root: 0 });
		const fractional = solveEquation(metaOf(combinations), fns, { n: 5.5, k: 2 });
		expect(fractional.ok ? undefined : fractional.error.code).toBe('solve/domain');
	});
});
