import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { type EquationSolutionInput, verifyEquation } from '../solution-verify.js';

const ce = new ComputeEngine();

const baseInput: Omit<EquationSolutionInput, 'solutions'> = {
	slug: 'mass-energy-equivalence',
	expression: '\\mag{E}=\\mag{m}\\const{c}^{2}',
	terms: {
		E: { kind: 'magnitude', ref: 'energy' },
		m: { kind: 'magnitude', ref: 'mass' },
		c: { kind: 'constant', ref: 'speed-of-light' },
	},
	constantValues: { c: 299792458 },
};

describe('verifyEquation', () => {
	it('accepts the authored mass-energy solutions', () => {
		const result = verifyEquation(ce, {
			...baseInput,
			solutions: { E: 'm * c^2', m: 'E / c^2' },
		});
		expect(result.messages).toEqual([]);
		expect(result.samples).toEqual({ E: 20, m: 20 });
	});

	it('rejects a wrong solved form, naming equation and symbol', () => {
		const result = verifyEquation(ce, {
			...baseInput,
			solutions: { E: 'm * c^3' },
		});
		expect(result.messages.length).toBeGreaterThan(0);
		expect(result.messages[0]).toContain("'E'");
		expect(result.messages[0]).toContain('disagrees');
	});

	it('rejects a solution that references an unknown identifier', () => {
		const result = verifyEquation(ce, {
			...baseInput,
			solutions: { E: 'm * x^2' },
		});
		expect(result.messages.some((message) => message.includes("unknown identifier 'x'"))).toBe(
			true,
		);
	});

	it('rejects a solution that references its own target', () => {
		const result = verifyEquation(ce, {
			...baseInput,
			solutions: { E: 'E' },
		});
		expect(result.messages.some((message) => message.includes('its own target'))).toBe(true);
	});

	it('verifies solutions with domain restrictions by resampling (pythagorean a)', () => {
		const result = verifyEquation(ce, {
			slug: 'pythagorean-theorem',
			expression: '\\var{a}^{2}+\\var{b}^{2}=\\var{c}^{2}',
			terms: {
				a: { kind: 'variable', ref: 'a' },
				b: { kind: 'variable', ref: 'b' },
				c: { kind: 'variable', ref: 'c' },
			},
			solutions: { a: 'sqrt(c^2 - b^2)' },
			constantValues: {},
		});
		expect(result.messages).toEqual([]);
		expect(result.samples.a).toBe(20);
	});
});
