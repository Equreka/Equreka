import { engineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { buildEngineSlice } from '../emit.js';
import { resolveUnits } from '../resolve.js';
import { corpusWith } from './corpus-with.js';

const corpus = corpusWith({
	magnitudes: {
		dimensionless: {
			name: { en: 'Dimensionless' },
			symbol: { tex: '1' },
			baseUnit: 'unitless',
			dimension: {},
		},
		level: {
			name: { en: 'Level' },
			symbol: { tex: 'L' },
			baseUnit: 'unitless',
			displayUnit: 'decibel',
			dimension: {},
		},
	},
	units: {
		unitless: {
			name: { en: 'Unitless' },
			symbol: { tex: '1' },
			unitOf: ['dimensionless', 'level'],
		},
		decibel: {
			name: { en: 'Decibel', es: 'Decibelio' },
			symbol: { tex: '\\mathrm{dB}', text: 'dB' },
			unitOf: ['level'],
			nonConvertible: true,
		},
	},
});

function slice() {
	const resolution = resolveUnits(corpus);
	expect(resolution.issues).toEqual([]);
	return buildEngineSlice({ corpus, resolved: resolution.resolved, contentHash: 'test' });
}

describe('engine slice display units', () => {
	it('carries a magnitude display unit with its name and symbol, within the contract', () => {
		const built = slice();
		expect(engineSlice.safeParse(built).success).toBe(true);
		expect(built.magnitudes.level).toMatchObject({
			baseUnit: 'unitless',
			displayUnit: {
				slug: 'decibel',
				name: { en: 'Decibel', es: 'Decibelio' },
				symbolTex: '\\mathrm{dB}',
				symbolText: 'dB',
			},
		});
	});

	it('keeps the nonConvertible display unit out of the convertible units', () => {
		const built = slice();
		expect(Object.keys(built.units)).toEqual(['unitless']);
		expect(built.magnitudes.dimensionless).not.toHaveProperty('displayUnit');
	});
});
