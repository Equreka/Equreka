import type { CalculatorSolution } from '@equreka/core/hooks/use-calculator-units';
import { describe, expect, it } from 'vitest';
import { legacyResultText, legacyValueParts } from '../calculator-island';

function solution(overrides: Partial<CalculatorSolution> = {}): CalculatorSolution {
	const value = 2 / 299_792_458 ** 2;
	return {
		symbol: 'm',
		value,
		baseValue: value,
		root: 0,
		unit: 'kilogram',
		exact: true,
		...overrides,
	};
}

describe('legacy calculator result format', () => {
	it('prints every round-trip digit in scientific notation', () => {
		expect(legacyValueParts(2 / 299_792_458 ** 2)).toEqual({
			mantissa: '2.225300112107237',
			exponent: { sign: '-', digits: '17' },
		});
	});

	it('keeps the plus sign of a positive exponent', () => {
		expect(legacyValueParts(5000)).toEqual({ mantissa: '5', exponent: { sign: '+', digits: '3' } });
	});

	it('falls back to plain digits when the exponent is 0', () => {
		expect(legacyValueParts(2.5)).toEqual({ mantissa: '2.5', exponent: null });
		expect(legacyValueParts(0)).toEqual({ mantissa: '0', exponent: null });
		expect(legacyValueParts(-7)).toEqual({ mantissa: '-7', exponent: null });
	});

	it('passes non-finite values through', () => {
		expect(legacyValueParts(Number.POSITIVE_INFINITY)).toEqual({
			mantissa: 'Infinity',
			exponent: null,
		});
	});

	it('copies the digits the card shows', () => {
		expect(legacyResultText('m', solution(), 'kg')).toBe('m = 2.225300112107237 × 10⁻¹⁷ kg');
		expect(legacyResultText('c', solution({ value: 5, exact: false }), '')).toBe('c ≈ 5');
	});
});
