import { collectionSchemas } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { checkSolutionDimensions } from '../solution-dimension.js';
import { verifyCorpusSolutions } from '../solution-verify.js';
import type { Corpus } from '../validate.js';
import { corpusWith } from './corpus-with.js';

const MAGNITUDES: Record<string, Record<string, unknown>> = {
	length: { dimension: { L: '1' } },
	area: { dimension: { L: '2' } },
	volume: { dimension: { L: '3' } },
	time: { dimension: { T: '1' } },
	speed: { dimension: { L: '1', T: '-1' } },
	acceleration: { dimension: { L: '1', T: '-2' } },
	frequency: { dimension: { T: '-1' } },
	'plane-angle': { dimension: { A: '1' } },
	'angular-velocity': { dimension: { T: '-1', A: '1' } },
	intensity: { dimension: { M: '1', T: '-3' } },
};

/**
 * A corpus holding only what stages 4b (dimensions) and verify read:
 * magnitudes by dimension and the equations under test, parsed through the
 * authored schema so defaults and coercions apply as they do for YAML.
 */
function corpusOf(equations: Record<string, Record<string, unknown>>): Corpus {
	return corpusWith({
		magnitudes: Object.fromEntries(
			Object.entries(MAGNITUDES).map(([slug, { dimension }]) => [
				slug,
				{ name: { en: slug }, symbol: { tex: 'x' }, baseUnit: 'unit', dimension },
			]),
		),
		equations: Object.fromEntries(
			Object.entries(equations).map(([slug, equation]) => [
				slug,
				{ name: { en: slug }, level: 'intro', ...equation },
			]),
		),
	});
}

const magnitude = (ref: string) => ({ kind: 'magnitude', ref });
const symbol = (extra: Record<string, unknown> = {}) => ({
	kind: 'symbol',
	label: { en: 'Symbol' },
	...extra,
});

const QUADRATIC_DISPLACEMENT = {
	expression: '\\mag{x}=\\mag{v_{0}}\\mag{t}+\\frac{1}{2}\\mag{a}\\mag{t}^{2}',
	terms: {
		x: magnitude('length'),
		'v_{0}': magnitude('speed'),
		t: magnitude('time'),
		a: magnitude('acceleration'),
	},
};

const PROJECTILE_RANGE = {
	expression: '\\mag{R}=\\frac{\\mag{v}^{2}\\sin\\left(2\\mag{\\theta}\\right)}{\\mag{g}}',
	terms: {
		R: magnitude('length'),
		v: magnitude('speed'),
		'\\theta': magnitude('plane-angle'),
		g: magnitude('acceleration'),
	},
};

const FORWARD_ROOT = '(-v_0 + sqrt(v_0^2 + 2 * a * x)) / a';
const BACKWARD_ROOT = '(-v_0 - sqrt(v_0^2 + 2 * a * x)) / a';

/**
 * The equations grammar v2 exists for, each solved the way a textbook
 * solves it. Every one must pass both the dimension stage and the numeric
 * verifier.
 */
const CORPUS = {
	'snell-law': {
		expression: '\\var{n_{1}}\\sin\\mag{\\theta_{1}}=\\var{n_{2}}\\sin\\mag{\\theta_{2}}',
		terms: {
			'n_{1}': symbol(),
			'\\theta_{1}': magnitude('plane-angle'),
			'n_{2}': symbol(),
			'\\theta_{2}': magnitude('plane-angle'),
		},
		solutions: {
			'\\theta_{2}': 'asin(n_1 * sin(theta_1) / n_2)',
			'n_{2}': 'n_1 * sin(theta_1) / sin(theta_2)',
		},
	},
	ph: {
		expression: '\\var{\\mathrm{pH}}=-\\log_{10}\\var{[\\mathrm{H}^{+}]}',
		terms: { '\\mathrm{pH}': symbol(), '[\\mathrm{H}^{+}]': symbol({ identifier: 'cH' }) },
		solutions: { '\\mathrm{pH}': '-log10(cH)', '[\\mathrm{H}^{+}]': '10^(-pH)' },
	},
	'sound-intensity-level': {
		expression: '\\var{L}=10\\log_{10}\\left(\\frac{\\mag{I}}{\\mag{I_{0}}}\\right)',
		terms: { L: symbol(), I: magnitude('intensity'), 'I_{0}': magnitude('intensity') },
		solutions: {
			L: '10 * log10(I / I_0)',
			I: 'I_0 * 10^(L / 10)',
			'I_{0}': 'I / 10^(L / 10)',
		},
	},
	'cube-volume': {
		expression: '\\mag{V}=\\mag{a}^{3}',
		terms: { V: magnitude('volume'), a: magnitude('length') },
		solutions: { V: 'a^3', a: 'cbrt(V)' },
	},
	'arc-length': {
		expression: '\\mag{s}=\\mag{r}\\mag{\\theta}',
		terms: { s: magnitude('length'), r: magnitude('length'), '\\theta': magnitude('plane-angle') },
		solutions: { s: 'r * theta', '\\theta': 's / r', r: 's / theta' },
	},
	'angular-frequency': {
		expression: '\\mag{\\omega}=2\\pi\\mag{f}',
		terms: { '\\omega': magnitude('angular-velocity'), f: magnitude('frequency') },
		solutions: { '\\omega': '2 * pi * f', f: 'omega / (2 * pi)' },
	},
	'uniformly-accelerated-displacement': {
		...QUADRATIC_DISPLACEMENT,
		solutions: { x: 'v_0 * t + 0.5 * a * t^2', t: [FORWARD_ROOT, BACKWARD_ROOT] },
	},
	'projectile-range': {
		...PROJECTILE_RANGE,
		solutions: {
			R: 'v^2 * sin(2 * theta) / g',
			'\\theta': ['asin(g * R / v^2) / 2', 'pi / 2 - asin(g * R / v^2) / 2'],
		},
	},
	combinations: {
		expression: '\\var{C}=\\frac{\\var{n}!}{\\var{k}!\\left(\\var{n}-\\var{k}\\right)!}',
		terms: { C: symbol(), n: symbol({ integer: 'true' }), k: symbol({ integer: 'true' }) },
		solutions: { C: 'factorial(n) / (factorial(k) * factorial(n - k))' },
	},
};

const messagesOf = (corpus: Corpus): string[] => [
	...checkSolutionDimensions(corpus).map((entry) => `${entry.file}: ${entry.message}`),
	...verifyCorpusSolutions(corpus, [], null).issues.map(
		(entry) => `${entry.file}: ${entry.message}`,
	),
];

describe('grammar v2 over textbook equations', () => {
	it('passes the dimension stage and the numeric verifier for every equation', () => {
		expect(messagesOf(corpusOf(CORPUS))).toEqual([]);
	});

	it('verifies every root of a multi-root solution with its own 20 samples', () => {
		const { equations } = verifyCorpusSolutions(corpusOf(CORPUS), [], null);
		expect(equations.get('uniformly-accelerated-displacement')?.samples).toEqual({
			x: [20],
			t: [20, 20],
		});
		expect(equations.get('projectile-range')?.samples).toEqual({ R: [20], '\\theta': [20, 20] });
		expect(equations.get('projectile-range')?.asts.get('\\theta')).toHaveLength(2);
		expect(equations.get('combinations')?.samples).toEqual({ C: [20] });
	});
});

describe('grammar v2 rejections', () => {
	const only = (slug: string, equation: Record<string, unknown>): string[] =>
		messagesOf(corpusOf({ [slug]: equation }));

	it('fails cbrt of a dimension that is not a perfect cube', () => {
		expect(
			only('square-area', {
				expression: '\\mag{A}=\\mag{s}^{2}',
				terms: { A: magnitude('area'), s: magnitude('length') },
				solutions: { s: 'cbrt(A)' },
			}),
		).toEqual([
			"equations/square-area.yaml: solution for 's': cbrt of [2, 0, 0, 0, 0, 0, 0, 0] yields non-integral dimension exponents",
			expect.stringContaining("equations/square-area.yaml: solution for 's' disagrees"),
		]);
	});

	it('rejects two roots that are the same root', () => {
		expect(
			only('uniformly-accelerated-displacement', {
				...QUADRATIC_DISPLACEMENT,
				solutions: { t: [FORWARD_ROOT, '(sqrt(2 * a * x + v_0^2) - v_0) / a'] },
			}),
		).toEqual([
			"equations/uniformly-accelerated-displacement.yaml: solution for 't': roots 1 and 2 are duplicate roots, equal at every sample where both are real",
		]);
	});

	it('rejects a wrong root, naming its position', () => {
		expect(
			only('uniformly-accelerated-displacement', {
				...QUADRATIC_DISPLACEMENT,
				solutions: { t: [FORWARD_ROOT, '(v_0 + sqrt(v_0^2 + 2 * a * x)) / a'] },
			}),
		).toEqual([
			expect.stringContaining("solution for 't' root 2 of 2 disagrees with the equation"),
		]);
	});

	it('checks the dimension of each root separately', () => {
		expect(
			only('projectile-range', {
				...PROJECTILE_RANGE,
				solutions: { '\\theta': ['asin(g * R / v^2) / 2', 'pi / 2 - asin(g * R / v) / 2'] },
			}),
		).toEqual([
			"equations/projectile-range.yaml: solution for '\\theta' root 2 of 2: asin() requires a dimensionless argument, got [1, 0, -1, 0, 0, 0, 0, 0]",
			expect.stringContaining("solution for '\\theta' root 2 of 2 disagrees"),
		]);
	});

	it('finds no valid sample for a factorial over a term not declared integer', () => {
		expect(
			only('factorial', {
				expression: '\\var{y}=\\var{n}!',
				terms: { y: symbol(), n: symbol() },
				solutions: { y: 'factorial(n)' },
			}),
		).toEqual([expect.stringContaining("solution for 'y' produced only 0/20 valid samples")]);
	});

	it('rejects a constant term flagged integer at the schema', () => {
		expect(
			collectionSchemas.equations.safeParse({
				name: { en: 'x' },
				expression: '\\var{x}=\\const{\\pi}',
				terms: { x: symbol(), '\\pi': { kind: 'constant', ref: 'pi', integer: 'true' } },
			}).success,
		).toBe(false);
	});
});
