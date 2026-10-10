import type { CompiledEquationMeta } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { calculatorField, termIdFragment } from '../calculator-fields';

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
		expect(calculatorField(PROJECTILE, '\\theta', 'Launch angle', 'rad')).toEqual({
			key: '\\theta',
			label: 'Launch angle',
			symbolText: 'θ',
			unitSymbol: 'rad',
			solvable: true,
		});
		expect(calculatorField(PROJECTILE, 'v_{0}', 'Speed', 'm/s').symbolText).toBe('v₀');
		expect(calculatorField(PROJECTILE, 'R', 'Range', 'm').symbolText).toBe('R');
	});

	it('marks a term outside the solvable set as one the reader must fill', () => {
		expect(calculatorField(PROJECTILE, 'v_{0}', 'Speed', 'm/s').solvable).toBe(false);
		expect(calculatorField(PROJECTILE, 'R', 'Range', 'm').solvable).toBe(true);
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
