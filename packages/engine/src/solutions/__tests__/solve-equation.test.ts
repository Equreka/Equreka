import type { CompiledEquationMeta } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { unwrap, unwrapErr } from '../../__tests__/support.js';
import { type SolutionsModule, solveEquation } from '../index.js';

const massEnergy: CompiledEquationMeta = {
	slug: 'mass-energy-equivalence',
	kind: 'equation',
	name: { en: 'Mass–energy equivalence' },
	calculatorEnabled: true,
	terms: {
		E: { kind: 'magnitude', ref: 'energy', identifier: 'E' },
		m: { kind: 'magnitude', ref: 'mass', identifier: 'm' },
		c: { kind: 'constant', ref: 'speed-of-light-vacuum', identifier: 'c' },
	},
	solvable: ['E', 'm'],
};

const massEnergyFns: SolutionsModule = {
	'mass-energy-equivalence': {
		E: (v) => Number(v.m) * Number(v.c) ** 2,
		m: (v) => Number(v.E) / Number(v.c) ** 2,
	},
};

const pythagorean: CompiledEquationMeta = {
	slug: 'pythagorean-theorem',
	kind: 'equation',
	name: { en: 'Pythagorean theorem' },
	calculatorEnabled: true,
	terms: {
		a: { kind: 'magnitude', ref: 'length', identifier: 'a' },
		b: { kind: 'magnitude', ref: 'length', identifier: 'b' },
		c: { kind: 'magnitude', ref: 'length', identifier: 'c' },
	},
	solvable: ['a', 'b', 'c'],
};

const pythagoreanFns: SolutionsModule = {
	'pythagorean-theorem': {
		a: (v) => {
			const square = Number(v.c) ** 2 - Number(v.b) ** 2;
			if (square < 0) return null;
			const root = Math.sqrt(square);
			return [root, -root];
		},
		b: (v) => {
			const square = Number(v.c) ** 2 - Number(v.a) ** 2;
			if (square < 0) return null;
			const root = Math.sqrt(square);
			return [root, -root];
		},
		c: (v) => Math.sqrt(Number(v.a) ** 2 + Number(v.b) ** 2),
	},
};

const SPEED_OF_LIGHT = 299792458;

describe('solveEquation — solving', () => {
	it('solves for E when m is known (constant injected by the caller)', () => {
		const solved = unwrap(solveEquation(massEnergy, massEnergyFns, { m: 2, c: SPEED_OF_LIGHT }));
		expect(solved.symbol).toBe('E');
		expect(solved.value).toBe(2 * SPEED_OF_LIGHT ** 2);
		expect(solved.allRoots).toBeUndefined();
		expect(solved.root).toBe(0);
	});

	it('solves for m when E is known', () => {
		const solved = unwrap(solveEquation(massEnergy, massEnergyFns, { E: 9e16, m: null, c: 3e8 }));
		expect(solved).toEqual({ symbol: 'm', value: 1, root: 0 });
	});

	it('treats the empty string as not provided', () => {
		const solved = unwrap(
			solveEquation(massEnergy, massEnergyFns, { E: '', m: 2, c: SPEED_OF_LIGHT }),
		);
		expect(solved.symbol).toBe('E');
	});
});

describe('solveEquation — term keys that are not identifiers', () => {
	const arcLength: CompiledEquationMeta = {
		slug: 'arc-length',
		kind: 'formula',
		name: { en: 'Arc length' },
		calculatorEnabled: true,
		terms: {
			s: { kind: 'symbol', identifier: 's' },
			'r_{0}': { kind: 'symbol', identifier: 'r_0' },
			'\\theta': { kind: 'symbol', identifier: 'theta' },
		},
		solvable: ['\\theta', 'r_{0}', 's'],
	};

	const arcLengthFns: SolutionsModule = {
		'arc-length': {
			'\\theta': (v) => Number(v.s) / Number(v.r_0),
			'r_{0}': (v) => Number(v.s) / Number(v.theta),
			s: (v) => Number(v.r_0) * Number(v.theta),
		},
	};

	it('looks the solution up by term key and passes arguments by identifier', () => {
		const solved = unwrap(solveEquation(arcLength, arcLengthFns, { s: 3, 'r_{0}': 2 }));
		expect(solved).toEqual({ symbol: '\\theta', value: 1.5, root: 0 });
	});

	it('solves for a braced key', () => {
		const solved = unwrap(solveEquation(arcLength, arcLengthFns, { s: 3, '\\theta': 1.5 }));
		expect(solved).toEqual({ symbol: 'r_{0}', value: 2, root: 0 });
	});

	it('does not find a module keyed by identifier', () => {
		const byIdentifier: SolutionsModule = {
			'arc-length': { theta: (v) => Number(v.s) / Number(v.r_0) },
		};
		expect(unwrapErr(solveEquation(arcLength, byIdentifier, { s: 3, 'r_{0}': 2 })).code).toBe(
			'internal/unsupported',
		);
	});
});

describe('solveEquation — unknown inference error paths', () => {
	it('all solvable terms empty → inputs/empty', () => {
		const error = unwrapErr(solveEquation(massEnergy, massEnergyFns, { c: SPEED_OF_LIGHT }));
		expect(error.code).toBe('inputs/empty');
	});

	it('no solvable term empty → inputs/overdetermined', () => {
		const error = unwrapErr(
			solveEquation(massEnergy, massEnergyFns, { E: 1, m: 1, c: SPEED_OF_LIGHT }),
		);
		expect(error.code).toBe('inputs/overdetermined');
	});

	it('two of three solvable terms empty → inputs/underdetermined', () => {
		const error = unwrapErr(solveEquation(pythagorean, pythagoreanFns, { a: 3 }));
		expect(error.code).toBe('inputs/underdetermined');
		expect(error.details).toMatchObject({ missing: ['b', 'c'] });
	});

	it('non-finite inputs → inputs/not-a-number', () => {
		expect(
			unwrapErr(solveEquation(massEnergy, massEnergyFns, { m: Number.NaN, c: SPEED_OF_LIGHT }))
				.code,
		).toBe('inputs/not-a-number');
		expect(
			unwrapErr(
				solveEquation(massEnergy, massEnergyFns, {
					m: 2,
					c: Number.POSITIVE_INFINITY,
				}),
			).code,
		).toBe('inputs/not-a-number');
	});

	it('missing constant injection → internal/unsupported (caller contract)', () => {
		const error = unwrapErr(solveEquation(massEnergy, massEnergyFns, { m: 2 }));
		expect(error.code).toBe('internal/unsupported');
		expect(error.details).toMatchObject({ term: 'c', kind: 'constant' });
	});

	it('missing solution implementation → internal/unsupported', () => {
		const error = unwrapErr(solveEquation(massEnergy, {}, { m: 2, c: SPEED_OF_LIGHT }));
		expect(error.code).toBe('internal/unsupported');
	});

	it('throwing implementation is contained → internal/unsupported', () => {
		const throwing: SolutionsModule = {
			'mass-energy-equivalence': {
				E: () => {
					throw new Error('boom');
				},
			},
		};
		const error = unwrapErr(solveEquation(massEnergy, throwing, { m: 2, c: SPEED_OF_LIGHT }));
		expect(error.code).toBe('internal/unsupported');
		expect(error.details).toMatchObject({ thrown: 'Error: boom' });
	});
});

describe('solveEquation — domain and roots', () => {
	it('null return → solve/domain (hypotenuse shorter than a leg)', () => {
		const error = unwrapErr(solveEquation(pythagorean, pythagoreanFns, { b: 5, c: 3 }));
		expect(error.code).toBe('solve/domain');
	});

	it('non-finite scalar result → solve/no-real-solution', () => {
		const diverging: SolutionsModule = {
			'mass-energy-equivalence': { E: () => Number.POSITIVE_INFINITY },
		};
		const error = unwrapErr(solveEquation(massEnergy, diverging, { m: 2, c: SPEED_OF_LIGHT }));
		expect(error.code).toBe('solve/no-real-solution');
	});

	it('multi-root with nonNegative flag picks the first non-negative root', () => {
		const solved = unwrap(
			solveEquation(pythagorean, pythagoreanFns, { b: 4, c: 5 }, { nonNegative: new Set(['a']) }),
		);
		expect(solved).toEqual({ symbol: 'a', value: 3, root: 0, allRoots: [3, -3] });
	});

	it('multi-root without the flag returns the first root as emitted', () => {
		const negativeFirst: SolutionsModule = {
			'pythagorean-theorem': { a: () => [-3, 3] },
		};
		const solved = unwrap(solveEquation(pythagorean, negativeFirst, { b: 4, c: 5 }));
		expect(solved).toEqual({ symbol: 'a', value: -3, root: 0, allRoots: [-3, 3] });
	});

	it('nonNegative flag skips a leading negative root', () => {
		const negativeFirst: SolutionsModule = {
			'pythagorean-theorem': { a: () => [-3, 3] },
		};
		const solved = unwrap(
			solveEquation(pythagorean, negativeFirst, { b: 4, c: 5 }, { nonNegative: new Set(['a']) }),
		);
		expect(solved.value).toBe(3);
		expect(solved.root).toBe(1);
	});

	it('nonNegative with only negative roots → solve/no-real-solution with allRoots', () => {
		const allNegative: SolutionsModule = {
			'pythagorean-theorem': { a: () => [-3, -5] },
		};
		const error = unwrapErr(
			solveEquation(pythagorean, allNegative, { b: 4, c: 5 }, { nonNegative: new Set(['a']) }),
		);
		expect(error.code).toBe('solve/no-real-solution');
		expect(error.details).toMatchObject({ allRoots: [-3, -5] });
	});

	it('empty root array → solve/no-real-solution', () => {
		const rootless: SolutionsModule = { 'pythagorean-theorem': { a: () => [] } };
		const error = unwrapErr(solveEquation(pythagorean, rootless, { b: 4, c: 5 }));
		expect(error.code).toBe('solve/no-real-solution');
	});
});

describe('solveEquation — authored root order (grammar v2)', () => {
	const roots = (...values: number[]): SolutionsModule => ({
		'pythagorean-theorem': { a: () => values },
	});
	const solve = (fns: SolutionsModule, nonNegative?: Set<string>) =>
		solveEquation(
			pythagorean,
			fns,
			{ b: 4, c: 5 },
			nonNegative === undefined ? {} : { nonNegative },
		);

	it('skips a root outside its domain and reports the authored index of the chosen one', () => {
		expect(unwrap(solve(roots(Number.NaN, 0.5, 2)))).toEqual({
			symbol: 'a',
			value: 0.5,
			root: 1,
			allRoots: [0.5, 2],
		});
	});

	it('lists only the finite roots, in authored order', () => {
		const solved = unwrap(solve(roots(1, Number.NaN, Number.POSITIVE_INFINITY, -1)));
		expect(solved.allRoots).toEqual([1, -1]);
		expect(solved.root).toBe(0);
	});

	it('combines the domain and nonNegative filters, counting skipped roots in the index', () => {
		const solved = unwrap(solve(roots(Number.NaN, -2, 3), new Set(['a'])));
		expect(solved).toEqual({ symbol: 'a', value: 3, root: 2, allRoots: [-2, 3] });
	});

	it('keeps the preference order when a later root is the smaller one', () => {
		expect(unwrap(solve(roots(5, 1), new Set(['a']))).value).toBe(5);
	});

	it('reports the finite roots when none is admissible', () => {
		const error = unwrapErr(solve(roots(Number.NaN, -1), new Set(['a'])));
		expect(error.code).toBe('solve/no-real-solution');
		expect(error.details).toMatchObject({ allRoots: [-1] });
	});
});
