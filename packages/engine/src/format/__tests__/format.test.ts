import { describe, expect, it } from 'vitest';
import { formatExponential, formatSigFigs } from '../index.js';

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
