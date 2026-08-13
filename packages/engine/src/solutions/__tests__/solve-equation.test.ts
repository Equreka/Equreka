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
	});

	it('solves for m when E is known', () => {
		const solved = unwrap(solveEquation(massEnergy, massEnergyFns, { E: 9e16, m: null, c: 3e8 }));
		expect(solved).toEqual({ symbol: 'm', value: 1 });
	});

	it('treats the empty string as not provided', () => {
		const solved = unwrap(
			solveEquation(massEnergy, massEnergyFns, { E: '', m: 2, c: SPEED_OF_LIGHT }),
		);
		expect(solved.symbol).toBe('E');
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
		expect(solved).toEqual({ symbol: 'a', value: 3, allRoots: [3, -3] });
	});

	it('multi-root without the flag returns the first root as emitted', () => {
		const negativeFirst: SolutionsModule = {
			'pythagorean-theorem': { a: () => [-3, 3] },
		};
		const solved = unwrap(solveEquation(pythagorean, negativeFirst, { b: 4, c: 5 }));
		expect(solved).toEqual({ symbol: 'a', value: -3, allRoots: [-3, 3] });
	});

	it('nonNegative flag skips a leading negative root', () => {
		const negativeFirst: SolutionsModule = {
			'pythagorean-theorem': { a: () => [-3, 3] },
		};
		const solved = unwrap(
			solveEquation(pythagorean, negativeFirst, { b: 4, c: 5 }, { nonNegative: new Set(['a']) }),
		);
		expect(solved.value).toBe(3);
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
