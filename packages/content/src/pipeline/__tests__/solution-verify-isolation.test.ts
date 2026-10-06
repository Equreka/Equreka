import { describe, expect, it } from 'vitest';
import { type EquationSolutionInput, verifyEquation } from '../solution-verify.js';

/**
 * Alone in its file so it is the first equation a module-level engine
 * would ever parse: `\bar{}` over a fresh symbol parses as Mean and
 * declares it a collection, after which `a x^2` reads as a Tuple. Any
 * earlier parse that uses the symbol as a number masks the leak.
 */
const contaminant: EquationSolutionInput = {
	slug: 'contaminant',
	expression: '\\bar{\\var{x}}=\\var{y}',
	terms: { x: { kind: 'symbol' }, y: { kind: 'symbol' } },
	solutions: {},
	constantValues: {},
};

describe('verifyEquation — engine isolation', () => {
	it('verifies a quadratic after an equation that contaminates a shared engine', () => {
		verifyEquation(contaminant);
		const result = verifyEquation({
			slug: 'quadratic',
			expression: '\\var{a}\\var{x}^{2}+\\var{b}\\var{x}+\\var{c}=0',
			terms: {
				a: { kind: 'symbol' },
				x: { kind: 'symbol' },
				b: { kind: 'symbol' },
				c: { kind: 'symbol' },
			},
			solutions: { c: '-(a*x^2 + b*x)' },
			constantValues: {},
		});
		expect(result.messages).toEqual([]);
		expect(result.samples.c).toEqual([20]);
	});
});
