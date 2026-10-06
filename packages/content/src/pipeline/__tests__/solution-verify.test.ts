import { describe, expect, it } from 'vitest';
import { type EquationSolutionInput, verifyEquation } from '../solution-verify.js';

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

describe('verifyEquation — complex samples', () => {
	it('skips a sample whose side is complex instead of comparing its real part', () => {
		const result = verifyEquation({
			slug: 'imaginary-agreement',
			expression: '\\var{y}+\\sqrt{\\var{x}}=\\var{y}',
			terms: symbols('y', 'x'),
			solutions: { x: '-4' },
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
			"solution for 'x' root 2 of 2 produced only 0/20 valid samples in 400 attempts",
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
		expect(verifyEquation(signedSquare(['x', 'sqrt(a - b)'])).messages).toEqual([
			"solution for 'x' root 1 of 2 references its own target 'x'",
		]);
	});
});
