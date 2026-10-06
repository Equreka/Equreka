import type { CompiledEquationMeta } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { calculatorField } from '../calculator-fields';

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
