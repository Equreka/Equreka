import { collectionSchemas } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { checkIntegrity } from '../integrity.js';
import { checkSolutionDimensions } from '../solution-dimension.js';
import {
	type EquationSolutionInput,
	verifyCorpusSolutions,
	verifyEquation,
} from '../solution-verify.js';
import { lintTex } from '../tex-lint.js';
import { type Corpus, emptyCorpus } from '../validate.js';

const baseInput: Omit<EquationSolutionInput, 'solutions'> = {
	slug: 'mass-energy-equivalence',
	expression: '\\mag{E}=\\mag{m}\\const{c}^{2}',
	terms: {
		E: { kind: 'magnitude' },
		m: { kind: 'magnitude' },
		c: { kind: 'constant' },
	},
	constantValues: { c: 299792458 },
};

const symbols = (...keys: string[]): EquationSolutionInput['terms'] =>
	Object.fromEntries(keys.map((key) => [key, { kind: 'symbol' as const }]));

describe('verifyEquation', () => {
	it('accepts the authored mass-energy solutions', () => {
		const result = verifyEquation({
			...baseInput,
			solutions: { E: 'm * c^2', m: 'E / c^2' },
		});
		expect(result.messages).toEqual([]);
		expect(result.samples).toEqual({ E: [20], m: [20] });
	});

	it('rejects a wrong solved form, naming equation and symbol', () => {
		const result = verifyEquation({
			...baseInput,
			solutions: { E: 'm * c^3' },
		});
		expect(result.messages.length).toBeGreaterThan(0);
		expect(result.messages[0]).toContain("'E'");
		expect(result.messages[0]).toContain('disagrees');
	});

	it('rejects a solution that references an unknown identifier', () => {
		const result = verifyEquation({
			...baseInput,
			solutions: { E: 'm * x^2' },
		});
		expect(result.messages.some((message) => message.includes("unknown identifier 'x'"))).toBe(
			true,
		);
	});

	it('rejects a solution that references its own target', () => {
		const result = verifyEquation({
			...baseInput,
			solutions: { E: 'E' },
		});
		expect(result.messages.some((message) => message.includes('its own target'))).toBe(true);
	});

	it('verifies solutions with domain restrictions by resampling (pythagorean a)', () => {
		const result = verifyEquation({
			slug: 'pythagorean-theorem',
			expression: '\\var{a}^{2}+\\var{b}^{2}=\\var{c}^{2}',
			terms: symbols('a', 'b', 'c'),
			solutions: { a: 'sqrt(c^2 - b^2)' },
			constantValues: {},
		});
		expect(result.messages).toEqual([]);
		expect(result.samples.a).toEqual([20]);
	});

	it('keys verified solution ASTs by term key, never by identifier', () => {
		const result = verifyEquation({
			slug: 'arc-length',
			expression: '\\var{s}=\\var{r}\\var{\\theta}',
			terms: symbols('s', 'r', '\\theta'),
			solutions: { s: 'r * theta', '\\theta': 's / r' },
			constantValues: {},
		});
		expect(result.messages).toEqual([]);
		expect([...result.asts.keys()].sort()).toEqual(['\\theta', 's']);
	});

	it('refuses to verify when term identity is broken, pointing at the integrity issues', () => {
		const result = verifyEquation({
			slug: 'collision',
			expression: '\\var{v_0}=\\var{v_{0}}',
			terms: symbols('v_0', 'v_{0}'),
			solutions: { v_0: 'v_0' },
			constantValues: {},
		});
		expect(result.messages).toEqual([expect.stringContaining('identity contract')]);
		expect(result.asts.size).toBe(0);
	});
});

describe('verifyEquation — synthetic term symbols', () => {
	it.each<[string, EquationSolutionInput]>([
		[
			'a bare multi-letter key (KE)',
			{
				slug: 'kinetic-energy',
				expression: '\\mag{KE}=\\frac{1}{2}\\mag{m}\\var{v_{0}}^{2}',
				terms: { KE: { kind: 'magnitude' }, m: { kind: 'magnitude' }, 'v_{0}': { kind: 'symbol' } },
				solutions: { KE: '0.5 * m * v_0^2', 'v_{0}': 'sqrt(2 * KE / m)' },
				constantValues: {},
			},
		],
		[
			'an upright key with an identifier override (\\mathrm{KE})',
			{
				slug: 'kinetic-energy-upright',
				expression: '\\mag{\\mathrm{KE}}=\\frac{1}{2}\\mag{m}\\var{v}^{2}',
				terms: {
					'\\mathrm{KE}': { kind: 'magnitude', identifier: 'KE' },
					m: { kind: 'magnitude' },
					v: { kind: 'symbol' },
				},
				solutions: { '\\mathrm{KE}': '0.5 * m * v^2', m: '2 * KE / v^2' },
				constantValues: {},
			},
		],
		[
			'keys compute-engine reads as Euler and imaginary (e, i)',
			{
				slug: 'ohm-emf',
				expression: '\\var{e}=\\var{i}\\var{R}',
				terms: symbols('e', 'i', 'R'),
				solutions: { e: 'i * R', i: 'e / R' },
				constantValues: {},
			},
		],
		[
			'a control-word constant key (\\hbar) with a tiny value',
			{
				slug: 'planck-angular',
				expression: '\\mag{E}=\\const{\\hbar}\\var{\\omega}',
				terms: {
					E: { kind: 'magnitude' },
					'\\hbar': { kind: 'constant' },
					'\\omega': { kind: 'symbol' },
				},
				solutions: { E: 'hbar * omega', '\\omega': 'E / hbar' },
				constantValues: { '\\hbar': 1.054571817e-34 },
			},
		],
		[
			'a key with a control word and a letter (\\Delta x)',
			{
				slug: 'average-speed',
				expression: '\\var{v}=\\frac{\\var{\\Delta x}}{\\var{\\Delta t}}',
				terms: symbols('v', '\\Delta x', '\\Delta t'),
				solutions: { v: 'Deltax / Deltat', '\\Delta x': 'v * Deltat' },
				constantValues: {},
			},
		],
		[
			'a nested-brace key with an identifier override ([\\mathrm{H}^{+}])',
			{
				slug: 'water-ion-product',
				expression: '\\var{K}=\\var{[\\mathrm{H}^{+}]}\\var{[\\mathrm{OH}^{-}]}',
				terms: {
					K: { kind: 'symbol' },
					'[\\mathrm{H}^{+}]': { kind: 'symbol', identifier: 'cH' },
					'[\\mathrm{OH}^{-}]': { kind: 'symbol', identifier: 'cOH' },
				},
				solutions: { K: 'cH * cOH', '[\\mathrm{H}^{+}]': 'K / cOH' },
				constantValues: {},
			},
		],
	])('verifies %s', (_label, input) => {
		const result = verifyEquation(input);
		expect(result.messages).toEqual([]);
		for (const key of Object.keys(input.solutions)) {
			expect(result.samples[key], key).toEqual([20]);
		}
	});

	it('rejects a symbol written outside every macro', () => {
		const result = verifyEquation({
			slug: 'newton-second',
			expression: '\\mag{F}=m\\var{a}',
			terms: { F: { kind: 'magnitude' }, a: { kind: 'symbol' } },
			solutions: { F: 'a' },
			constantValues: {},
		});
		expect(result.messages).toEqual([expect.stringContaining("unannotated symbol 'm'")]);
	});

	it('names a subscript written outside its macro in authored terms', () => {
		const result = verifyEquation({
			slug: 'uniform-motion',
			expression: '\\var{x}=\\var{v}_{0}\\var{t}',
			terms: symbols('x', 'v', 't'),
			solutions: { x: 'v * t' },
			constantValues: {},
		});
		expect(result.messages).toEqual([expect.stringContaining("unannotated symbol 'v_0'")]);
	});

	it('does not let authored text spell a placeholder and pose as a term', () => {
		const result = verifyEquation({
			slug: 'spoof',
			expression: '\\mag{F}=\\mathrm{q1}\\var{a}',
			terms: { F: { kind: 'magnitude' }, a: { kind: 'symbol' } },
			solutions: { F: 'a^2' },
			constantValues: {},
		});
		expect(result.messages).toEqual([expect.stringContaining("unannotated symbol 'q1'")]);
	});
});

describe('verifyEquation — scale-free tolerance', () => {
	const planck = (solution: string): EquationSolutionInput => ({
		slug: 'planck-relation',
		expression: '\\mag{E}=\\const{h}\\var{f}',
		terms: { E: { kind: 'magnitude' }, h: { kind: 'constant' }, f: { kind: 'symbol' } },
		solutions: { E: solution },
		constantValues: { h: 6.62607015e-34 },
	});

	it('rejects a wrong coefficient on a side far below any absolute floor (E = 2 h f)', () => {
		expect(verifyEquation(planck('2 * h * f')).messages).toEqual([
			expect.stringContaining('disagrees'),
		]);
	});

	it('accepts the right one (E = h f)', () => {
		expect(verifyEquation(planck('h * f')).messages).toEqual([]);
	});

	it('accepts a solution against a side that is exactly zero (quadratic)', () => {
		const result = verifyEquation({
			slug: 'quadratic',
			expression: '\\var{a}\\var{x}^{2}+\\var{b}\\var{x}+\\var{c}=0',
			terms: symbols('a', 'x', 'b', 'c'),
			solutions: { c: '-(a*x^2 + b*x)' },
			constantValues: {},
		});
		expect(result.messages).toEqual([]);
		expect(result.samples.c).toEqual([20]);
	});

	it('rejects a wrong solution against a zero side', () => {
		const result = verifyEquation({
			slug: 'quadratic',
			expression: '\\var{a}\\var{x}^{2}+\\var{b}\\var{x}+\\var{c}=0',
			terms: symbols('a', 'x', 'b', 'c'),
			solutions: { c: '-(a*x^2 - b*x)' },
			constantValues: {},
		});
		expect(result.messages).toEqual([expect.stringContaining('disagrees')]);
	});
});

describe('verifyEquation — side precision', () => {
	const kineticEnergy = (solution: string): EquationSolutionInput => ({
		slug: 'relativistic-kinetic-energy',
		expression:
			'\\mag{K}=\\mag{m}\\const{c}^{2}\\left(\\frac{1}{\\sqrt{1-\\frac{\\mag{v}^{2}}{\\const{c}^{2}}}}-1\\right)',
		terms: {
			K: { kind: 'magnitude' },
			m: { kind: 'magnitude' },
			v: { kind: 'magnitude' },
			c: { kind: 'constant' },
		},
		solutions: { K: solution },
		constantValues: { c: 299792458 },
	});

	it('balances a side whose difference is near 1e-16 at sampled speeds', () => {
		const result = verifyEquation(
			kineticEnergy('m * v^2 / (sqrt(1 - v^2 / c^2) * (1 + sqrt(1 - v^2 / c^2)))'),
		);
		expect(result.messages).toEqual([]);
		expect(result.samples.K).toEqual([20]);
	});

	it('rejects a root that cancels catastrophically in float64', () => {
		expect(
			verifyEquation(kineticEnergy('m * c^2 * (1 / sqrt(1 - v^2 / c^2) - 1)')).messages,
		).toEqual([expect.stringContaining('disagrees')]);
	});
});

describe('verifyEquation — wide sampling box', () => {
	const energyMomentum = (
		solutions: EquationSolutionInput['solutions'],
	): EquationSolutionInput => ({
		slug: 'relativistic-energy-momentum',
		expression:
			'\\mag{E}^{2}=\\left(\\mag{p}\\const{c}\\right)^{2}+\\left(\\mag{m}\\const{c}^{2}\\right)^{2}',
		terms: {
			E: { kind: 'magnitude' },
			p: { kind: 'magnitude' },
			m: { kind: 'magnitude' },
			c: { kind: 'constant' },
		},
		solutions,
		constantValues: { c: 299792458 },
	});

	it('verifies roots real only where E exceeds m c², which the unit box never reaches', () => {
		const result = verifyEquation(
			energyMomentum({
				E: 'sqrt((p * c)^2 + (m * c^2)^2)',
				p: 'sqrt(E^2 - (m * c^2)^2) / c',
				m: 'sqrt(E^2 - (p * c)^2) / c^2',
			}),
		);
		expect(result.messages).toEqual([]);
		expect(result.samples).toEqual({ E: [20], p: [20], m: [20] });
	});

	it('still rejects a wrong root it can only sample in the wide box', () => {
		expect(
			verifyEquation(energyMomentum({ p: 'sqrt(E^2 - (m * c^2)^2) / (2 * c)' })).messages,
		).toEqual([expect.stringContaining("solution for 'p' disagrees")]);
	});
});

describe('verifyEquation — ill-conditioned samples', () => {
	const nernst = (quotient: string): EquationSolutionInput => ({
		slug: 'nernst-equation',
		expression:
			'\\var{E_\\mathrm{cell}}=\\var{E^{\\circ}_\\mathrm{cell}}-\\frac{\\const{R}\\mag{T}}{\\var{z}\\const{F}}\\ln\\var{Q}',
		terms: {
			'E_\\mathrm{cell}': { kind: 'symbol', identifier: 'E_cell_cond' },
			'E^{\\circ}_\\mathrm{cell}': { kind: 'symbol', identifier: 'E_cell' },
			R: { kind: 'constant' },
			T: { kind: 'magnitude' },
			z: { kind: 'symbol', integer: true },
			F: { kind: 'constant' },
			Q: { kind: 'symbol' },
		},
		solutions: { Q: quotient },
		constantValues: { R: 8.31446261815324, F: 96485.33212 },
	});

	it('skips samples where the target rounding alone breaks the balance', () => {
		const result = verifyEquation(nernst('exp(z * F * (E_cell - E_cell_cond) / (R * T))'));
		expect(result.messages).toEqual([]);
		expect(result.samples.Q).toEqual([20]);
	});

	it('still rejects a wrong root at a well-conditioned sample', () => {
		expect(
			verifyEquation(nernst('exp(2 * z * F * (E_cell - E_cell_cond) / (R * T))')).messages,
		).toEqual([expect.stringContaining("solution for 'Q' disagrees")]);
	});
});

describe('verifyEquation — complex samples', () => {
	it('skips a sample whose side is complex instead of comparing its real part', () => {
		const result = verifyEquation({
			slug: 'imaginary-agreement',
			expression: '\\var{y}+\\sqrt{\\var{x}}=\\var{y}',
			terms: symbols('y', 'x'),
			solutions: { x: 'y - y - 4' },
			constantValues: {},
		});
		expect(result.messages).toEqual([expect.stringContaining('0/20 valid samples')]);
		expect(result.samples.x).toEqual([0]);
	});
});

describe('verifyEquation — base-10 and base-2 logarithms', () => {
	const logInput = (expression: string, solution: string): EquationSolutionInput => ({
		slug: 'logarithm',
		expression,
		terms: symbols('y', 'x'),
		solutions: { y: solution },
		constantValues: {},
	});

	it('rejects a bare \\log, whose base readers and compute-engine disagree on', () => {
		expect(verifyEquation(logInput('\\var{y}=\\log\\var{x}', 'log10(x)')).messages).toEqual([
			'expression uses \\log without a base: write \\ln or \\log_{10}',
		]);
		expect(
			verifyEquation(logInput('\\var{y}=\\log\\left(\\var{x}\\right)', 'log10(x)')).messages,
		).toEqual([expect.stringContaining('\\log without a base')]);
	});

	it.each<[string, string]>([
		['\\var{y}=\\log_{10}\\var{x}', 'log10(x)'],
		['\\var{y}=\\log_{10} \\var{x}', 'log10(x)'],
		['\\var{y}=\\log_{2}\\left(\\var{x}\\right)', 'log2(x)'],
		['\\var{y}=\\log_2\\var{x}', 'log2(x)'],
		['\\var{y}=\\ln\\var{x}', 'ln(x)'],
	])('verifies %s', (expression, solution) => {
		expect(verifyEquation(logInput(expression, solution)).messages).toEqual([]);
	});

	it('rejects a base mismatch between expression and solution', () => {
		expect(verifyEquation(logInput('\\var{y}=\\log_{10}\\var{x}', 'ln(x)')).messages).toEqual([
			expect.stringContaining('disagrees'),
		]);
	});
});

describe('verifyEquation — multi-root solutions', () => {
	const signedSquare = (roots: string[]): EquationSolutionInput => ({
		slug: 'signed-square',
		expression: '\\var{x}\\left|\\var{x}\\right|=\\var{a}-\\var{b}',
		terms: symbols('x', 'a', 'b'),
		solutions: { x: roots },
		constantValues: {},
	});

	it('keeps every root in authored order', () => {
		const result = verifyEquation({
			slug: 'square',
			expression: '\\var{y}=\\var{x}^{2}',
			terms: symbols('y', 'x'),
			solutions: { x: ['sqrt(y)', '-sqrt(y)'] },
			constantValues: {},
		});
		expect(result.messages).toEqual([]);
		expect(result.asts.get('x')).toEqual([
			{ kind: 'call', fn: 'sqrt', arg: { kind: 'identifier', name: 'y' } },
			{
				kind: 'unary',
				operand: { kind: 'call', fn: 'sqrt', arg: { kind: 'identifier', name: 'y' } },
			},
		]);
		expect(result.samples.x).toEqual([20, 20]);
	});

	it('verifies roots real on disjoint domains, which are never duplicates', () => {
		const result = verifyEquation(signedSquare(['sqrt(a - b)', '-sqrt(b - a)']));
		expect(result.messages).toEqual([]);
		expect(result.samples.x).toEqual([20, 20]);
	});

	it('fails a root that is never real at any sample', () => {
		const result = verifyEquation({
			slug: 'square',
			expression: '\\var{y}=\\var{x}^{2}',
			terms: symbols('y', 'x'),
			solutions: { x: ['sqrt(y)', 'sqrt(-y)'] },
			constantValues: {},
		});
		expect(result.messages).toEqual([
			"solution for 'x' root 2 of 2 produced only 0/20 valid samples in 400 attempts per sampling box ([0.1, 10), then log-uniform over 1e-30 to 1e30)",
		]);
	});

	it('rejects a literal repeat of a root', () => {
		expect(verifyEquation(signedSquare(['sqrt(a - b)', 'sqrt(a - b)'])).messages).toEqual([
			"solution for 'x': roots 1 and 2 are duplicate roots, equal at every sample where both are real",
		]);
	});

	it('names an unparsable or self-referencing root by position', () => {
		expect(verifyEquation(signedSquare(['sqrt(a - b)', 'sqrt('])).messages).toEqual([
			"solution for 'x' root 2 of 2: unexpected end of input",
		]);
		expect(verifyEquation(signedSquare(['x * (a - b)', 'sqrt(a - b)'])).messages).toEqual([
			"solution for 'x' root 1 of 2 references its own target 'x'",
		]);
	});
});

describe('verifyEquation — non-algebraic equations', () => {
	const FIELD_TERMS: EquationSolutionInput['terms'] = {
		'\\vec{E}': { kind: 'symbol' },
		'\\vec{B}': { kind: 'symbol' },
		'\\vec{l}': { kind: 'symbol' },
		'\\rho': { kind: 'symbol' },
		t: { kind: 'symbol' },
		I: { kind: 'symbol' },
		'\\varepsilon_0': { kind: 'constant' },
		'\\mu_0': { kind: 'constant' },
	};
	const field = (expression: string, algebraic: boolean): EquationSolutionInput => ({
		slug: 'maxwell',
		expression,
		algebraic,
		terms: FIELD_TERMS,
		solutions: {},
		constantValues: { '\\varepsilon_0': 8.8541878188e-12, '\\mu_0': 1.25663706127e-6 },
	});

	it.each([
		['Gauss (nabla)', '\\nabla\\cdot\\var{\\vec{E}}=\\frac{\\var{\\rho}}{\\const{\\varepsilon_0}}'],
		[
			'Faraday (partial)',
			'\\nabla\\times\\var{\\vec{E}}=-\\frac{\\partial\\var{\\vec{B}}}{\\partial\\var{t}}',
		],
		[
			'Ampere (contour integral)',
			'\\oint\\var{\\vec{B}}\\cdot\\mathrm{d}\\var{\\vec{l}}=\\const{\\mu_0}\\var{I}',
		],
	])('never hands %s notation to compute-engine, which cannot read it', (_name, expression) => {
		expect(verifyEquation(field(expression, true)).messages).toHaveLength(1);
		expect(verifyEquation(field(expression, false)).messages).toEqual([]);
	});

	it('still rejects a bare \\log in a non-algebraic expression', () => {
		expect(
			verifyEquation(
				field('\\var{I}=\\log\\oint\\var{\\vec{B}}\\cdot\\mathrm{d}\\var{\\vec{l}}', false),
			).messages,
		).toEqual(['expression uses \\log without a base: write \\ln or \\log_{10}']);
	});

	it('builds through integrity, dimensions, verification and TeX lint over a corpus', () => {
		const gauss = collectionSchemas.equations.parse({
			name: { en: 'Gauss law' },
			level: 'advanced',
			algebraic: 'false',
			expression: '\\nabla\\cdot\\var{\\vec{E}}=\\frac{\\var{\\rho}}{\\var{\\varepsilon_0}}',
			terms: {
				'\\vec{E}': { kind: 'symbol', label: { en: 'Electric field' } },
				'\\rho': { kind: 'symbol', label: { en: 'Charge density' } },
				'\\varepsilon_0': { kind: 'symbol', label: { en: 'Vacuum permittivity' } },
			},
		});
		const corpus: Corpus = { ...emptyCorpus(), equations: new Map([['gauss-law', gauss]]) };
		const errors = [
			...checkIntegrity(corpus),
			...checkSolutionDimensions(corpus),
			...verifyCorpusSolutions(corpus, [], null).issues,
			...lintTex(corpus, new Set()),
		].filter((entry) => entry.severity === 'error');
		expect(errors).toEqual([]);
	});
});

describe('verifyEquation — influence rule', () => {
	it('rejects a root that ignores a term the equation cancels out', () => {
		expect(
			verifyEquation({
				slug: 'cancelled',
				expression: '\\var{F}=\\var{m}\\var{a}+\\var{b}-\\var{b}',
				terms: symbols('F', 'm', 'a', 'b'),
				solutions: { F: 'm * a', m: 'F / a' },
				constantValues: {},
			}).messages,
		).toEqual([
			"solution for 'F' does not reference 'b'; every root uses every other non-constant term, so a term that cancels out does not belong in the equation",
			"solution for 'm' does not reference 'b'; every root uses every other non-constant term, so a term that cancels out does not belong in the equation",
		]);
	});

	it('names the term a typo drops, root by root', () => {
		const messages = verifyEquation({
			slug: 'pythagorean-theorem',
			expression: '\\var{a}^{2}+\\var{b}^{2}=\\var{c}^{2}',
			terms: symbols('a', 'b', 'c'),
			solutions: { c: 'sqrt(a^2 + a^2)', a: ['sqrt(c^2 - b^2)', '-sqrt(c^2 - c^2)'] },
			constantValues: {},
		}).messages;
		expect(messages).toEqual([
			expect.stringMatching(/^solution for 'c' does not reference 'b';/),
			expect.stringMatching(/^solution for 'a' root 2 of 2 does not reference 'b';/),
		]);
	});

	it('exempts constant terms, whose value never varies', () => {
		const result = verifyEquation({
			...baseInput,
			solutions: { E: 'm * 299792458^2', m: 'E / c^2' },
		});
		expect(result.messages).toEqual([]);
	});
});
