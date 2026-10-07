import { describe, expect, it } from 'vitest';
import {
	RAT_ONE,
	RAT_ZERO,
	rat,
	ratAdd,
	ratDiv,
	ratFromDecimal,
	ratFromExact,
	ratMul,
	ratNeg,
	ratPow,
	ratRoundSignificant,
	ratToDecimal,
} from '../rational.js';

describe('ratFromDecimal', () => {
	it('parses plain, fractional, and scientific decimal strings exactly', () => {
		expect(ratFromDecimal('0.3048')).toEqual(rat(381n, 1250n));
		expect(ratFromDecimal('299792458')).toEqual(rat(299792458n, 1n));
		expect(ratFromDecimal('1e-19')).toEqual(rat(1n, 10n ** 19n));
		expect(ratFromDecimal('3.154e+9')).toEqual(rat(3154000000n, 1n));
		expect(ratFromDecimal('1380649e-23')).toEqual(rat(1380649n, 10n ** 23n));
	});

	it('rejects non-decimal input', () => {
		expect(() => ratFromDecimal('1/3')).toThrow(RangeError);
	});
});

describe('ratToDecimal', () => {
	it('renders terminating expansions exactly', () => {
		expect(ratToDecimal(ratFromExact({ num: '5463', den: '20' }))).toEqual({
			text: '273.15',
			exact: true,
		});
		expect(ratToDecimal(rat(1n, 1n))).toEqual({ text: '1', exact: true });
		expect(ratToDecimal(rat(0n, 1n))).toEqual({ text: '0', exact: true });
		expect(ratToDecimal(rat(1n, 10n ** 9n))).toEqual({ text: '0.000000001', exact: true });
	});

	it('rounds non-terminating expansions half-even at 36 significant digits', () => {
		expect(ratToDecimal(rat(5n, 9n))).toEqual({
			text: '0.555555555555555555555555555555555556',
			exact: false,
		});
		expect(ratToDecimal(rat(-2n, 3n))).toEqual({
			text: '-0.666666666666666666666666666666666667',
			exact: false,
		});
		expect(ratToDecimal(rat(1n, 3n))).toEqual({
			text: '0.333333333333333333333333333333333333',
			exact: false,
		});
		expect(ratToDecimal(ratFromExact({ num: '45967', den: '180' }))).toEqual({
			text: '255.372222222222222222222222222222222',
			exact: false,
		});
	});
});

describe('rational arithmetic', () => {
	it('composes the fahrenheit mapping exactly: 212°F lands on 373.15K', () => {
		const factor = ratFromExact({ num: '5', den: '9' });
		const offset = ratFromExact({ num: '45967', den: '180' });
		const scaled = ratMul(factor, rat(212n, 1n));
		const kelvin = rat(scaled.num * offset.den + offset.num * scaled.den, scaled.den * offset.den);
		expect(kelvin).toEqual(ratFromDecimal('373.15'));
	});

	it('handles negative exponents', () => {
		expect(ratPow(rat(1000n, 1n), -1)).toEqual(rat(1n, 1000n));
		expect(ratPow(rat(2n, 3n), 2)).toEqual(rat(4n, 9n));
	});

	it('adds, negates and divides exactly', () => {
		expect(ratAdd(rat(1n, 6n), rat(1n, 3n))).toEqual(rat(1n, 2n));
		expect(ratNeg(rat(-5n, 9n))).toEqual(rat(5n, 9n));
		expect(ratDiv(rat(1n, 2n), rat(-3n, 4n))).toEqual(rat(-2n, 3n));
		expect(() => ratDiv(RAT_ONE, RAT_ZERO)).toThrow(RangeError);
	});
});

describe('ratRoundSignificant', () => {
	it('rounds half to even at the requested significant digit', () => {
		expect(ratRoundSignificant(ratFromDecimal('2.5'), 1)).toBe('2');
		expect(ratRoundSignificant(ratFromDecimal('3.5'), 1)).toBe('4');
		expect(ratRoundSignificant(ratFromDecimal('-2.5'), 1)).toBe('-2');
		expect(ratRoundSignificant(ratFromDecimal('0.0012345'), 3)).toBe('0.00123');
		expect(ratRoundSignificant(ratFromDecimal('0.0012355'), 4)).toBe('0.001236');
		expect(ratRoundSignificant(ratFromDecimal('123456'), 2)).toBe('120000');
		expect(ratRoundSignificant(ratFromDecimal('9.96'), 2)).toBe('10');
		expect(ratRoundSignificant(ratFromDecimal('1.20'), 3)).toBe('1.2');
		expect(ratRoundSignificant(rat(2n, 3n), 3)).toBe('0.667');
		expect(ratRoundSignificant(RAT_ZERO, 3)).toBe('0');
	});

	it('refuses a significant-digit count that is not a positive integer', () => {
		expect(() => ratRoundSignificant(RAT_ONE, 0)).toThrow(RangeError);
		expect(() => ratRoundSignificant(RAT_ONE, 1.5)).toThrow(RangeError);
	});
});
