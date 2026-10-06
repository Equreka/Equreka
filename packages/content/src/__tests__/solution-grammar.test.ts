import { describe, expect, it } from 'vitest';
import {
	collectIdentifiers,
	evaluateSolution,
	FACTORIAL_MAX,
	factorial,
	parseSolution,
	RESERVED_FUNCTION_NAMES,
	SOLUTION_FUNCTION_IMPL,
	SOLUTION_FUNCTIONS,
	solutionRoots,
	tokenizeSolution,
} from '../solution-grammar.js';

describe('solution grammar v2', () => {
	it('reserves exactly the implemented functions', () => {
		expect([...RESERVED_FUNCTION_NAMES]).toEqual([...SOLUTION_FUNCTIONS]);
		expect([...SOLUTION_FUNCTIONS].sort()).toEqual(
			[
				'abs',
				'acos',
				'acosh',
				'asin',
				'asinh',
				'atan',
				'atanh',
				'cbrt',
				'cos',
				'cosh',
				'exp',
				'factorial',
				'ln',
				'log10',
				'log2',
				'sin',
				'sinh',
				'sqrt',
				'tan',
				'tanh',
			].sort(),
		);
	});

	it.each(SOLUTION_FUNCTIONS)('parses %s(x) as a call and evaluates it', (fn) => {
		const ast = parseSolution(`${fn}(x / 4)`);
		expect(ast).toMatchObject({ kind: 'call', fn });
		expect(Object.is(evaluateSolution(ast, { x: 2 }), SOLUTION_FUNCTION_IMPL[fn](0.5))).toBe(true);
	});

	it('evaluates the new functions with their Math definitions', () => {
		const at = (source: string, x: number) => evaluateSolution(parseSolution(source), { x });
		expect(at('asin(x)', 0.5)).toBeCloseTo(Math.PI / 6, 15);
		expect(at('acos(x)', 0.5)).toBeCloseTo(Math.PI / 3, 15);
		expect(at('atan(x)', 1)).toBeCloseTo(Math.PI / 4, 15);
		expect(at('log10(x)', 1000)).toBe(3);
		expect(at('log2(x)', 8)).toBe(3);
		expect(at('cbrt(x)', -27)).toBe(-3);
		expect(at('asinh(sinh(x))', 0.75)).toBeCloseTo(0.75, 15);
		expect(at('acosh(cosh(x))', 0.75)).toBeCloseTo(0.75, 15);
		expect(at('atanh(tanh(x))', 0.75)).toBeCloseTo(0.75, 15);
		expect(at('asin(x)', 2)).toBeNaN();
		expect(at('log10(x)', -1)).toBeNaN();
	});

	it('reads a function name only as a call', () => {
		expect(() => parseSolution('log10 * 2')).toThrow(/expected '\('/);
		expect(collectIdentifiers(parseSolution('factorial(n) / factorial(k)'))).toEqual(
			new Set(['n', 'k']),
		);
	});

	it('tokenizes positions so an identifier can be substituted in place', () => {
		expect(tokenizeSolution('cbrt(V) + a_1')).toEqual([
			{ type: 'identifier', text: 'cbrt', pos: 0 },
			{ type: 'op', text: '(', pos: 4 },
			{ type: 'identifier', text: 'V', pos: 5 },
			{ type: 'op', text: ')', pos: 6 },
			{ type: 'op', text: '+', pos: 8 },
			{ type: 'identifier', text: 'a_1', pos: 10 },
		]);
	});
});

describe('factorial', () => {
	it('is the exact product on the integers 0 through FACTORIAL_MAX', () => {
		expect(factorial(0)).toBe(1);
		expect(factorial(1)).toBe(1);
		expect(factorial(5)).toBe(120);
		expect(factorial(20)).toBe(2432902008176640000);
		expect(Number.isFinite(factorial(FACTORIAL_MAX))).toBe(true);
	});

	it('is NaN outside its domain instead of extending to the gamma function', () => {
		for (const n of [-1, 2.5, FACTORIAL_MAX + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(factorial(n), String(n)).toBeNaN();
		}
	});
});

describe('solutionRoots', () => {
	it('reads a single solved form as one root and keeps authored root order', () => {
		expect(solutionRoots('sqrt(A)')).toEqual(['sqrt(A)']);
		expect(solutionRoots(['asin(s) / 2', 'pi / 2 - asin(s) / 2'])).toEqual([
			'asin(s) / 2',
			'pi / 2 - asin(s) / 2',
		]);
	});
});
