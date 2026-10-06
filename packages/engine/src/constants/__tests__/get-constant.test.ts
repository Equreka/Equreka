import { describe, expect, it } from 'vitest';
import { HAND_SLICE } from '../../__tests__/hand-slice.js';
import { expectClose, unwrap, unwrapErr } from '../../__tests__/support.js';
import { createUnitRegistry } from '../../units/index.js';
import { getConstant } from '../index.js';

describe('getConstant — native unit', () => {
	it('returns the float64 value with the verbatim decimal string display', () => {
		const c = unwrap(getConstant(HAND_SLICE, 'speed-of-light-vacuum'));
		expect(c).toEqual({
			value: 299792458,
			display: '299792458',
			unit: 'metre-per-second',
			exact: true,
		});
	});

	it('preserves scientific-notation display strings verbatim', () => {
		const mass = unwrap(getConstant(HAND_SLICE, 'electron-mass'));
		expect(mass.display).toBe('9.1093837139e-31');
		expect(mass.value).toBe(9.1093837139e-31);
		expect(mass.exact).toBe(false);
	});

	it('requesting the native unit explicitly is a passthrough', () => {
		const c = unwrap(
			getConstant(HAND_SLICE, 'speed-of-light-vacuum', { unit: 'metre-per-second' }),
		);
		expect(c.display).toBe('299792458');
	});
});

describe('getConstant — requested unit (float64 conversion path)', () => {
	it('converts c to km/h and re-derives the display at 15 sig figs', () => {
		const c = unwrap(
			getConstant(HAND_SLICE, 'speed-of-light-vacuum', { unit: 'kilometre-per-hour' }),
		);
		expectClose(c.value, 1079252848.8);
		expect(c.unit).toBe('kilometre-per-hour');
		expect(c.exact).toBe(true);
		expectClose(Number(c.display), 1079252848.8);
	});

	it('an inexact constant stays inexact through an exact path', () => {
		const mass = unwrap(getConstant(HAND_SLICE, 'electron-mass', { unit: 'gram' }));
		expectClose(mass.value, 9.1093837139e-28, 1e-12);
		expect(mass.exact).toBe(false);
	});

	it('accepts a prebuilt registry', () => {
		const registry = createUnitRegistry(HAND_SLICE);
		const c = unwrap(
			getConstant(HAND_SLICE, 'speed-of-light-vacuum', { unit: 'kilometre-per-hour', registry }),
		);
		expectClose(c.value, 1079252848.8);
	});

	it('propagates dimension mismatches', () => {
		const error = unwrapErr(getConstant(HAND_SLICE, 'speed-of-light-vacuum', { unit: 'kelvin' }));
		expect(error.code).toBe('units/incompatible-dimensions');
	});

	it('propagates unknown target units', () => {
		const error = unwrapErr(getConstant(HAND_SLICE, 'speed-of-light-vacuum', { unit: 'warp' }));
		expect(error.code).toBe('units/unknown');
	});
});

describe('getConstant — unknown constant', () => {
	it('errors with units/unknown and kind: constant in details', () => {
		const error = unwrapErr(getConstant(HAND_SLICE, 'no-such-constant'));
		expect(error.code).toBe('units/unknown');
		expect(error.details).toMatchObject({ kind: 'constant', slug: 'no-such-constant' });
	});
});
