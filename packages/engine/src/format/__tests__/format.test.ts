import { describe, expect, it } from 'vitest';
import {
	DEFAULT_NUMBER_FORMAT,
	formatExponential,
	formatResult,
	formatSigFigs,
	READABLE_SIG_FIGS,
	resultText,
	toSuperscript,
} from '../index.js';

describe('formatSigFigs — 6 significant figures by default', () => {
	it('kills float64 noise: 0.1 + 0.2 → "0.3"', () => {
		expect(formatSigFigs(0.1 + 0.2)).toBe('0.3');
	});

	it('rounds to 6 sig figs', () => {
		expect(formatSigFigs(Math.PI)).toBe('3.14159');
		expect(formatSigFigs(1234.5678)).toBe('1234.57');
		expect(formatSigFigs(123456789)).toBe('123457000');
	});

	it('drops trailing zeros after rounding', () => {
		expect(formatSigFigs(123)).toBe('123');
		expect(formatSigFigs(1.5)).toBe('1.5');
		expect(formatSigFigs(0.25)).toBe('0.25');
	});

	it('keeps significant trailing zeros left of the decimal point', () => {
		expect(formatSigFigs(1000)).toBe('1000');
		expect(formatSigFigs(999999.9)).toBe('1000000');
	});

	it('honors a custom sig-fig count', () => {
		expect(formatSigFigs(Math.PI, 3)).toBe('3.14');
		expect(formatSigFigs(0.456, 1)).toBe('0.5');
		expect(formatSigFigs(299792458, 4)).toBe('299800000');
	});
});

describe('formatSigFigs — zero, negatives, non-finite', () => {
	it('zero and negative zero render as "0"', () => {
		expect(formatSigFigs(0)).toBe('0');
		expect(formatSigFigs(-0)).toBe('0');
	});

	it('negative values keep the sign through rounding and trimming', () => {
		expect(formatSigFigs(-(0.1 + 0.2))).toBe('-0.3');
		expect(formatSigFigs(-1234.5678)).toBe('-1234.57');
		expect(formatSigFigs(-123456789)).toBe('-123457000');
	});

	it('non-finite values stringify without throwing', () => {
		expect(formatSigFigs(Number.NaN)).toBe('NaN');
		expect(formatSigFigs(Number.POSITIVE_INFINITY)).toBe('Infinity');
		expect(formatSigFigs(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
	});
});

describe('formatSigFigs — scientific notation edges', () => {
	it('switches to scientific at |x| ≥ 1e21', () => {
		expect(formatSigFigs(1e21)).toBe('1e+21');
		expect(formatSigFigs(-1.23456789e22)).toBe('-1.23457e+22');
	});

	it('stays fixed just under the upper bound', () => {
		expect(formatSigFigs(9.99e20)).toBe('999000000000000000000');
	});

	it('switches to scientific at |x| ≤ 1e-7', () => {
		expect(formatSigFigs(1e-7)).toBe('1e-7');
		expect(formatSigFigs(1.23456789e-8)).toBe('1.23457e-8');
		expect(formatSigFigs(-1e-7)).toBe('-1e-7');
	});

	it('stays fixed at 1e-6', () => {
		expect(formatSigFigs(0.000001)).toBe('0.000001');
		expect(formatSigFigs(0.0000015)).toBe('0.0000015');
	});

	it('rounds correctly across the boundary', () => {
		expect(formatSigFigs(9.9999999e-8)).toBe('1e-7');
	});
});

describe('formatExponential', () => {
	it('renders scientific notation with trimmed mantissa', () => {
		expect(formatExponential(299792458, 4)).toBe('2.998e+8');
		expect(formatExponential(299792458)).toBe('2.99792e+8');
		expect(formatExponential(0.5, 3)).toBe('5e-1');
	});

	it('handles zero, negatives, and non-finite input', () => {
		expect(formatExponential(0)).toBe('0');
		expect(formatExponential(-31415.9265, 3)).toBe('-3.14e+4');
		expect(formatExponential(Number.NaN)).toBe('NaN');
	});
});

describe('formatResult — readable', () => {
	const readable = (value: number) => resultText(formatResult(value, 'readable'));

	it('is the default format', () => {
		expect(DEFAULT_NUMBER_FORMAT).toBe('readable');
		expect(formatResult(85)).toEqual(formatResult(85, 'readable'));
	});

	it('prints integers in the plain range exactly', () => {
		expect(formatResult(85, 'readable')).toEqual({ mantissa: '85', exponent: null });
		expect(readable(720)).toBe('720');
		expect(readable(10)).toBe('10');
	});

	it('stays plain from 1e-3 up to, not including, 1e6', () => {
		expect(formatResult(0.001, 'readable')).toEqual({ mantissa: '0.001', exponent: null });
		expect(formatResult(999999.5, 'readable')).toEqual({ mantissa: '999999.5', exponent: null });
		expect(readable(-0.25)).toBe('-0.25');
	});

	it('goes scientific below 1e-3 and from 1e6 up', () => {
		expect(formatResult(0.000999, 'readable')).toEqual({
			mantissa: '9.99',
			exponent: { sign: '-', digits: '4' },
		});
		expect(formatResult(1e6, 'readable')).toEqual({
			mantissa: '1',
			exponent: { sign: '+', digits: '6' },
		});
		expect(readable(8.98755e13)).toBe('8.98755 × 10¹³');
	});

	it('picks the notation from the rounded value', () => {
		expect(readable(999999.99999999)).toBe('1 × 10⁶');
		expect(readable(0.00099999999999)).toBe('0.001');
	});

	it('rounds to 10 significant figures and trims trailing zeros', () => {
		expect(READABLE_SIG_FIGS).toBe(10);
		expect(readable(2.9966313365235766e1)).toBe('29.96631337');
		expect(readable(2 / 299_792_458 ** 2)).toBe('2.225300112 × 10⁻¹⁷');
		expect(readable(-1234567.891)).toBe('-1.234567891 × 10⁶');
	});

	it('prints zero as "0" and passes non-finite values through', () => {
		expect(formatResult(0, 'readable')).toEqual({ mantissa: '0', exponent: null });
		expect(readable(-0)).toBe('0');
		expect(readable(Number.NaN)).toBe('NaN');
		expect(readable(Number.POSITIVE_INFINITY)).toBe('Infinity');
		expect(readable(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
	});
});

describe('formatResult — scientific, the original app’s output', () => {
	const scientific = (value: number) => formatResult(value, 'scientific');

	it('prints every shortest round-trip digit in scientific notation', () => {
		expect(scientific(2.9966313365235766e1)).toEqual({
			mantissa: '2.9966313365235766',
			exponent: { sign: '+', digits: '1' },
		});
		expect(scientific(2 / 299_792_458 ** 2)).toEqual({
			mantissa: '2.225300112107237',
			exponent: { sign: '-', digits: '17' },
		});
		expect(scientific(8.98755e13)).toEqual({
			mantissa: '8.98755',
			exponent: { sign: '+', digits: '13' },
		});
	});

	it('goes scientific even inside the readable plain range', () => {
		expect(scientific(85)).toEqual({ mantissa: '8.5', exponent: { sign: '+', digits: '1' } });
		expect(scientific(720)).toEqual({ mantissa: '7.2', exponent: { sign: '+', digits: '2' } });
		expect(scientific(0.001)).toEqual({ mantissa: '1', exponent: { sign: '-', digits: '3' } });
		expect(scientific(0.000999)).toEqual({
			mantissa: '9.99',
			exponent: { sign: '-', digits: '4' },
		});
		expect(scientific(999999.5)).toEqual({
			mantissa: '9.999995',
			exponent: { sign: '+', digits: '5' },
		});
		expect(scientific(1e6)).toEqual({ mantissa: '1', exponent: { sign: '+', digits: '6' } });
		expect(scientific(-0.25)).toEqual({ mantissa: '-2.5', exponent: { sign: '-', digits: '1' } });
	});

	it('falls back to plain digits when the exponent is 0', () => {
		expect(scientific(2.5)).toEqual({ mantissa: '2.5', exponent: null });
		expect(scientific(-7)).toEqual({ mantissa: '-7', exponent: null });
		expect(scientific(0)).toEqual({ mantissa: '0', exponent: null });
	});

	it('passes non-finite values through', () => {
		expect(scientific(Number.NaN)).toEqual({ mantissa: 'NaN', exponent: null });
		expect(scientific(Number.POSITIVE_INFINITY)).toEqual({
			mantissa: 'Infinity',
			exponent: null,
		});
	});
});

describe('resultText', () => {
	it('writes the power of ten in superscript digits, dropping a "+" sign', () => {
		expect(resultText({ mantissa: '8.98755', exponent: { sign: '+', digits: '13' } })).toBe(
			'8.98755 × 10¹³',
		);
		expect(resultText({ mantissa: '2.2253', exponent: { sign: '-', digits: '17' } })).toBe(
			'2.2253 × 10⁻¹⁷',
		);
		expect(resultText({ mantissa: '720', exponent: null })).toBe('720');
	});

	it('has a superscript for every digit and the minus sign', () => {
		expect(toSuperscript(-1234567890)).toBe('⁻¹²³⁴⁵⁶⁷⁸⁹⁰');
	});
});
