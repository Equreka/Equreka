import { describe, expect, it } from 'vitest';
import { FREQUENCY, HAND_SLICE, LENGTH } from '../../__tests__/hand-slice.js';
import { expectClose, unwrap, unwrapErr } from '../../__tests__/support.js';
import { createUnitRegistry } from '../index.js';

const registry = createUnitRegistry(HAND_SLICE);

describe('convert — linear units (NIST SP 811 exact factors)', () => {
	it('metre → foot', () => {
		expectClose(unwrap(registry.convert(1, 'metre', 'foot')), 1 / 0.3048);
	});

	it('foot → inch is exactly 12', () => {
		expectClose(unwrap(registry.convert(1, 'foot', 'inch')), 12);
	});

	it('mile → foot is exactly 5280', () => {
		expectClose(unwrap(registry.convert(1, 'mile', 'foot')), 5280);
	});

	it('inch → metre hits the defining factor', () => {
		expect(unwrap(registry.convert(1, 'inch', 'metre'))).toBe(0.0254);
	});

	it('identity conversion returns the input', () => {
		expect(unwrap(registry.convert(123.456, 'metre', 'metre'))).toBe(123.456);
	});
});

describe('convert — affine temperature anchors', () => {
	it('0 °C = 273.15 K', () => {
		expect(unwrap(registry.convert(0, 'celsius', 'kelvin'))).toBe(273.15);
	});

	it('273.15 K = 0 °C', () => {
		expect(unwrap(registry.convert(273.15, 'kelvin', 'celsius'))).toBe(0);
	});

	it('0 °C = 32 °F', () => {
		expectClose(unwrap(registry.convert(0, 'celsius', 'fahrenheit')), 32);
	});

	it('32 °F = 0 °C', () => {
		expectClose(unwrap(registry.convert(32, 'fahrenheit', 'celsius')), 0);
	});

	it('100 °C = 212 °F', () => {
		expectClose(unwrap(registry.convert(100, 'celsius', 'fahrenheit')), 212);
	});

	it('−40 °C = −40 °F, both directions', () => {
		expectClose(unwrap(registry.convert(-40, 'celsius', 'fahrenheit')), -40);
		expectClose(unwrap(registry.convert(-40, 'fahrenheit', 'celsius')), -40);
	});

	it('491.67 °R = 273.15 K (rankine is linear: offset 0)', () => {
		expectClose(unwrap(registry.convert(491.67, 'rankine', 'kelvin')), 273.15);
	});

	it('0 °De = 373.15 K and 100 °C = 0 °De (delisle runs backwards)', () => {
		expectClose(unwrap(registry.convert(0, 'delisle', 'kelvin')), 373.15);
		expectClose(unwrap(registry.convert(100, 'celsius', 'delisle')), 0);
	});

	it('1 °C = 148.5 °De (legacy fixture anchor)', () => {
		expectClose(unwrap(registry.convert(1, 'celsius', 'delisle')), 148.5);
	});
});

describe('convertDelta — temperature intervals ignore offsets', () => {
	it('ΔT 1 K = 1 °C', () => {
		expect(unwrap(registry.convertDelta(1, 'kelvin', 'celsius'))).toBe(1);
	});

	it('ΔT 1 K = 1.8 °F', () => {
		expectClose(unwrap(registry.convertDelta(1, 'kelvin', 'fahrenheit')), 1.8);
	});

	it('ΔT 5 °C = 9 °F', () => {
		expectClose(unwrap(registry.convertDelta(5, 'celsius', 'fahrenheit')), 9);
	});

	it('differs from convert for affine units', () => {
		expectClose(unwrap(registry.convert(1, 'celsius', 'fahrenheit')), 33.8);
		expectClose(unwrap(registry.convertDelta(1, 'celsius', 'fahrenheit')), 1.8);
	});
});

describe('dimension gating', () => {
	it('metre → kelvin errors with units/incompatible-dimensions', () => {
		const error = unwrapErr(registry.convert(1, 'metre', 'kelvin'));
		expect(error.code).toBe('units/incompatible-dimensions');
		expect(error.details).toMatchObject({ from: 'metre', to: 'kelvin' });
	});

	it('hertz → becquerel converts: identical dimension vectors', () => {
		expect(unwrap(registry.convert(1, 'hertz', 'becquerel'))).toBe(1);
	});

	it('radian/second → hertz does NOT convert: angle dimension differs', () => {
		const error = unwrapErr(registry.convert(1, 'radian-per-second', 'hertz'));
		expect(error.code).toBe('units/incompatible-dimensions');
	});

	it('areCompatible mirrors convertibility', () => {
		expect(registry.areCompatible('hertz', 'becquerel')).toBe(true);
		expect(registry.areCompatible('radian-per-second', 'hertz')).toBe(false);
		expect(registry.areCompatible('metre', 'kelvin')).toBe(false);
		expect(registry.areCompatible('metre', 'no-such-unit')).toBe(false);
	});
});

describe('unknown units and invalid values', () => {
	it('unknown target unit', () => {
		const error = unwrapErr(registry.convert(1, 'metre', 'furlong'));
		expect(error.code).toBe('units/unknown');
		expect(error.details).toMatchObject({ slug: 'furlong' });
	});

	it('unknown source unit', () => {
		expect(unwrapErr(registry.convert(1, 'furlong', 'metre')).code).toBe('units/unknown');
	});

	it('NaN and Infinity inputs error with inputs/not-a-number', () => {
		expect(unwrapErr(registry.convert(Number.NaN, 'metre', 'foot')).code).toBe(
			'inputs/not-a-number',
		);
		expect(
			unwrapErr(registry.convertDelta(Number.POSITIVE_INFINITY, 'kelvin', 'celsius')).code,
		).toBe('inputs/not-a-number');
	});
});

describe('compatibleUnits', () => {
	it('by unit slug: all length units, nothing else', () => {
		const slugs = registry.compatibleUnits('metre').map((unit) => unit.slug);
		expect(slugs.sort()).toEqual(['cubit', 'foot', 'inch', 'metre', 'mile']);
	});

	it('by dimension tuple: same bucket', () => {
		const slugs = registry.compatibleUnits(LENGTH).map((unit) => unit.slug);
		expect(slugs.sort()).toEqual(['cubit', 'foot', 'inch', 'metre', 'mile']);
	});

	it('frequency bucket excludes angular speed', () => {
		const slugs = registry.compatibleUnits(FREQUENCY).map((unit) => unit.slug);
		expect(slugs.sort()).toEqual(['becquerel', 'hertz']);
	});

	it('unknown slug yields an empty list', () => {
		expect(registry.compatibleUnits('no-such-unit')).toEqual([]);
	});

	it('returns a defensive copy', () => {
		registry.compatibleUnits('metre').pop();
		expect(registry.compatibleUnits('metre')).toHaveLength(5);
	});
});

describe('getUnit and isExactPath', () => {
	it('getUnit returns the compiled unit or undefined', () => {
		expect(registry.getUnit('foot')?.factor).toBe('0.3048');
		expect(registry.getUnit('no-such-unit')).toBeUndefined();
	});

	it('exactness flags: exact ↔ exact is exact, inexact taints the path', () => {
		expect(registry.isExactPath('metre', 'foot')).toBe(true);
		expect(registry.isExactPath('foot', 'mile')).toBe(true);
		expect(registry.isExactPath('metre', 'cubit')).toBe(false);
		expect(registry.isExactPath('cubit', 'foot')).toBe(false);
	});

	it('isExactPath is false for unknown units', () => {
		expect(registry.isExactPath('metre', 'no-such-unit')).toBe(false);
	});
});
