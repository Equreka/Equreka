import type { CompiledEquationMeta, CompiledUnit } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import {
	type CalculatorFieldUnit,
	calculatorField,
	calculatorUnitSymbol,
	convertibleFieldUnit,
	displayFieldUnit,
	NO_FIELD_UNIT,
	termIdFragment,
} from '../calculator-fields';

const convertible = (symbol: string): CalculatorFieldUnit => ({ symbol, convertible: true });

const PROJECTILE: CompiledEquationMeta = {
	slug: 'projectile-range',
	kind: 'formula',
	name: { en: 'Projectile range' },
	calculatorEnabled: true,
	terms: {
		R: { kind: 'magnitude', ref: 'length', identifier: 'R' },
		'v_{0}': { kind: 'magnitude', ref: 'speed', identifier: 'v_0' },
		'\\theta': { kind: 'magnitude', ref: 'plane-angle', identifier: 'theta' },
		g: { kind: 'constant', ref: 'standard-gravity', identifier: 'g' },
	},
	solvable: ['R', '\\theta'],
};

describe('calculatorField', () => {
	it('labels a TeX term key with its plain-text symbol, never the raw TeX', () => {
		expect(calculatorField(PROJECTILE, '\\theta', 'Launch angle', convertible('rad'))).toEqual({
			key: '\\theta',
			label: 'Launch angle',
			symbolText: 'θ',
			unitSymbol: 'rad',
			convertible: true,
			solvable: true,
		});
		expect(calculatorField(PROJECTILE, 'v_{0}', 'Speed', convertible('m/s')).symbolText).toBe('v₀');
		expect(calculatorField(PROJECTILE, 'R', 'Range', convertible('m')).symbolText).toBe('R');
	});

	it('marks a term outside the solvable set as one the reader must fill', () => {
		expect(calculatorField(PROJECTILE, 'v_{0}', 'Speed', convertible('m/s')).solvable).toBe(false);
		expect(calculatorField(PROJECTILE, 'R', 'Range', convertible('m')).solvable).toBe(true);
	});
});

function dimensionOne(slug: string, symbolText: string, factor: string): CompiledUnit {
	return {
		slug,
		name: { en: slug },
		symbolTex: symbolText,
		symbolText,
		magnitudes: ['test-ratio'],
		system: 'other',
		dimension: [0, 0, 0, 0, 0, 0, 0, 0],
		factor,
		offset: '0',
		exact: true,
		affine: false,
	};
}

describe('calculator field units', () => {
	const one = dimensionOne('test-one', '1', '1');
	const percent = dimensionOne('test-percent', '%', '0.01');

	it('prints no symbol for the unit one and the symbol of any other unit', () => {
		expect(calculatorUnitSymbol(one)).toBe('');
		expect(calculatorUnitSymbol(percent)).toBe('%');
	});

	it('keeps a unit-one term convertible, so the picker can still offer %', () => {
		expect(convertibleFieldUnit(one)).toEqual({ symbol: '', convertible: true });
		expect(convertibleFieldUnit(percent)).toEqual({ symbol: '%', convertible: true });
		expect(convertibleFieldUnit(undefined)).toEqual(NO_FIELD_UNIT);
	});

	it('fixes a display unit: its symbol prints and nothing converts', () => {
		expect(
			displayFieldUnit({
				slug: 'test-bel',
				name: { en: 'Test bel' },
				symbolTex: 'dB',
				symbolText: 'dB',
			}),
		).toEqual({ symbol: 'dB', convertible: false });
	});
});

describe('termIdFragment', () => {
	it('takes the compiled identifier of a TeX term key', () => {
		expect(termIdFragment(PROJECTILE, '\\theta')).toBe('theta');
		expect(termIdFragment(PROJECTILE, 'v_{0}')).toBe('v_0');
		expect(termIdFragment(PROJECTILE, 'R')).toBe('R');
	});

	it('escapes a key without a compiled term injectively, apart from every identifier', () => {
		const keys = ['\\theta', 'v_{0}', 'v_0', 'v0', 'F_\\mathrm{N}', '[\\mathrm{H}^{+}]', '_5c_'];
		const fragments = keys.map((key) => termIdFragment({ ...PROJECTILE, terms: {} }, key));
		expect(fragments[0]).toBe('__5c_theta');
		for (const fragment of fragments) expect(fragment).toMatch(/^_[A-Za-z0-9_]+$/);
		expect(new Set(fragments).size).toBe(keys.length);
		const identifiers = Object.values(PROJECTILE.terms).map((term) => term.identifier);
		expect(fragments.filter((fragment) => identifiers.includes(fragment))).toEqual([]);
	});
});
