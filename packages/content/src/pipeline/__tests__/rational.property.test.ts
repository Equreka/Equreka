import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	type Rat,
	rat,
	ratAdd,
	ratDiv,
	ratFromDecimal,
	ratMul,
	ratNeg,
	ratRoundSignificant,
	ratToDecimal,
} from '../rational.js';

const LIMIT = 10n ** 24n;

const anyRat = fc
	.tuple(fc.bigInt({ min: -LIMIT, max: LIMIT }), fc.bigInt({ min: 1n, max: LIMIT }))
	.map(([num, den]) => rat(num, den));

const nonZeroRat = anyRat.filter((value) => value.num !== 0n);

/**
 * Short decimals (a few digits over a power of ten) land exactly on
 * rounding ties far more often than arbitrary fractions do.
 */
const shortDecimal = fc
	.tuple(fc.bigInt({ min: -999_999n, max: 999_999n }), fc.integer({ min: 0, max: 12 }))
	.map(([digits, scale]) => rat(digits, 10n ** BigInt(scale)));

const roundable = fc.oneof(anyRat, shortDecimal).filter((value) => value.num !== 0n);

/**
 * ±(kept + ½) · 10^(1 − scale): exactly halfway between two neighbours with
 * as many significant digits as `kept` has.
 */
const exactTie = fc
	.tuple(fc.bigInt({ min: 1n, max: 999_999n }), fc.integer({ min: 0, max: 12 }), fc.boolean())
	.map(([kept, scale, negative]) => ({
		kept,
		scale,
		negative,
		value: rat((negative ? -1n : 1n) * (kept * 10n + 5n), 10n ** BigInt(scale)),
	}));

const sigFigs = fc.integer({ min: 1, max: 20 });

function gcd(a: bigint, b: bigint): bigint {
	return b === 0n ? a : gcd(b, a % b);
}

function abs(value: bigint): bigint {
	return value < 0n ? -value : value;
}

function isNormalized(value: Rat): boolean {
	return value.den > 0n && gcd(abs(value.num), value.den) === 1n;
}

/**
 * Sign of a − b, by cross-multiplication over positive denominators.
 */
function compare(a: Rat, b: Rat): number {
	const difference = a.num * b.den - b.num * a.den;
	return difference === 0n ? 0 : difference < 0n ? -1 : 1;
}

function pow10(exponent: number): Rat {
	return exponent >= 0 ? rat(10n ** BigInt(exponent), 1n) : rat(1n, 10n ** BigInt(-exponent));
}

/**
 * The e with 10^(e−1) ≤ |value| < 10^e, found by stepping powers of ten.
 */
function magnitudeOf(value: Rat): number {
	const size = rat(abs(value.num), value.den);
	let exponent = 0;
	while (compare(size, pow10(exponent)) >= 0) {
		exponent += 1;
	}
	while (compare(size, pow10(exponent - 1)) < 0) {
		exponent -= 1;
	}
	return exponent;
}

function significantDigitCount(text: string): number {
	return text.replace(/[-.]/g, '').replace(/^0+/, '').replace(/0+$/, '').length;
}

describe('rational arithmetic against BigInt cross-multiplication', () => {
	it('ratAdd is the exact normalized sum', () => {
		fc.assert(
			fc.property(anyRat, anyRat, (a, b) => {
				const sum = ratAdd(a, b);
				expect(isNormalized(sum)).toBe(true);
				expect(sum.num * a.den * b.den).toBe((a.num * b.den + b.num * a.den) * sum.den);
			}),
		);
	});

	it('ratNeg is the additive inverse', () => {
		fc.assert(
			fc.property(anyRat, (a) => {
				const negated = ratNeg(a);
				expect(isNormalized(negated)).toBe(true);
				expect(ratAdd(a, negated)).toEqual(rat(0n, 1n));
				expect(ratNeg(negated)).toEqual(a);
			}),
		);
	});

	it('ratDiv is the exact normalized quotient and undoes ratMul', () => {
		fc.assert(
			fc.property(anyRat, nonZeroRat, (a, b) => {
				const quotient = ratDiv(a, b);
				expect(isNormalized(quotient)).toBe(true);
				expect(quotient.num * a.den * b.num).toBe(a.num * b.den * quotient.den);
				expect(ratMul(quotient, b)).toEqual(a);
			}),
		);
	});

	it('ratDiv refuses a zero divisor', () => {
		fc.assert(
			fc.property(anyRat, (a) => {
				expect(() => ratDiv(a, rat(0n, 1n))).toThrow(RangeError);
			}),
		);
	});
});

describe('ratRoundSignificant against BigInt arithmetic', () => {
	it('returns the nearest value with that many significant digits, ties to even', () => {
		fc.assert(
			fc.property(roundable, sigFigs, (value, digits) => {
				const text = ratRoundSignificant(value, digits);
				const rounded = ratFromDecimal(text);
				expect(significantDigitCount(text)).toBeLessThanOrEqual(digits);
				const step = pow10(magnitudeOf(value) - digits);
				const error = ratAdd(value, ratNeg(rounded));
				const twiceError = rat(abs(error.num) * 2n, error.den);
				const tie = compare(twiceError, step);
				expect(tie).toBeLessThanOrEqual(0);
				const multiple = ratDiv(rounded, step);
				expect(multiple.den).toBe(1n);
				if (tie === 0) {
					expect(multiple.num % 2n).toBe(0n);
				}
			}),
			{ numRuns: 500 },
		);
	});

	it('breaks an exact tie toward the even neighbour', () => {
		fc.assert(
			fc.property(exactTie, ({ kept, scale, negative, value }) => {
				const even = kept % 2n === 0n ? kept : kept + 1n;
				const expected = ratMul(rat(negative ? -even : even, 1n), pow10(1 - scale));
				expect(ratFromDecimal(ratRoundSignificant(value, kept.toString().length))).toEqual(
					expected,
				);
			}),
		);
	});

	it('writes a canonical decimal string with the sign of the value', () => {
		fc.assert(
			fc.property(roundable, sigFigs, (value, digits) => {
				const text = ratRoundSignificant(value, digits);
				expect(text).toMatch(/^-?(0|[1-9]\d*)(\.\d*[1-9])?$/);
				expect(text.startsWith('-')).toBe(value.num < 0n);
			}),
		);
	});

	it('is idempotent and exact on a value that already fits', () => {
		fc.assert(
			fc.property(shortDecimal, sigFigs, (value, digits) => {
				const text = ratRoundSignificant(value, digits);
				expect(ratRoundSignificant(ratFromDecimal(text), digits)).toBe(text);
				const exact = ratToDecimal(value).text;
				if (significantDigitCount(exact) <= digits) {
					expect(text).toBe(exact);
				}
			}),
		);
	});

	it('agrees with ratToDecimal on every non-terminating expansion', () => {
		fc.assert(
			fc.property(roundable, sigFigs, (value, digits) => {
				const rendering = ratToDecimal(value, digits);
				if (!rendering.exact) {
					expect(ratRoundSignificant(value, digits)).toBe(rendering.text);
				}
			}),
		);
	});
});
