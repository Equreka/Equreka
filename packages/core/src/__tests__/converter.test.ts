import { createUnitRegistry } from '@equreka/engine/units';
import type { CompiledDimension, CompiledUnit, EngineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { converterUnits, pickUnitPair } from '../converter';

const ENERGY: CompiledDimension = [2, 1, -2, 0, 0, 0, 0, 0];

function unit(slug: string, magnitudes: string[]): CompiledUnit {
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		symbolText: slug,
		magnitudes,
		system: 'other',
		dimension: ENERGY,
		factor: '1',
		offset: '0',
		exact: true,
		affine: false,
	};
}

function magnitude(slug: string, baseUnit: string, kindOf?: string) {
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		baseUnit,
		dimension: ENERGY,
		...(kindOf === undefined ? {} : { kindOf }),
		nonNegative: false,
	};
}

const SLICE: EngineSlice = {
	schemaVersion: 2,
	contentHash: 'converter-test',
	magnitudes: {
		energy: magnitude('energy', 'joule'),
		work: magnitude('work', 'joule', 'energy'),
		torque: magnitude('torque', 'newton-metre'),
	},
	units: {
		joule: unit('joule', ['energy', 'work']),
		erg: unit('erg', ['energy']),
		'newton-metre': unit('newton-metre', ['torque']),
	},
	prefixes: {},
	constants: {},
	equations: {},
};

const registry = createUnitRegistry(SLICE);
const slugs = (units: readonly CompiledUnit[]): string[] => units.map((u) => u.slug).sort();

describe('converterUnits', () => {
	it('offers the kind family and counts what the dimension toggle would add', () => {
		const scoped = converterUnits(registry, 'work', false);
		expect(slugs(scoped.units)).toEqual(['erg', 'joule']);
		expect(scoped.hiddenByKind).toBe(1);
		expect(slugs(converterUnits(registry, 'work', true).units)).toEqual([
			'erg',
			'joule',
			'newton-metre',
		]);
	});

	it('reports nothing hidden when the kind family already covers the dimension', () => {
		const single: EngineSlice = {
			...SLICE,
			magnitudes: { energy: magnitude('energy', 'joule') },
			units: { joule: unit('joule', ['energy']) },
		};
		expect(converterUnits(createUnitRegistry(single), 'energy', false).hiddenByKind).toBe(0);
	});
});

describe('pickUnitPair', () => {
	const units = [{ slug: 'erg' }, { slug: 'joule' }, { slug: 'newton-metre' }];

	it('defaults to the base unit and the first other unit', () => {
		expect(pickUnitPair(units, 'joule')).toEqual({ from: 'joule', to: 'erg' });
	});

	it('keeps a preferred pair that is still offered', () => {
		expect(pickUnitPair(units, 'joule', { from: 'newton-metre', to: 'joule' })).toEqual({
			from: 'newton-metre',
			to: 'joule',
		});
	});

	it('repairs a pair the narrowed scope no longer offers', () => {
		const narrowed = [{ slug: 'erg' }, { slug: 'joule' }];
		expect(pickUnitPair(narrowed, 'joule', { from: 'newton-metre', to: 'erg' })).toEqual({
			from: 'joule',
			to: 'erg',
		});
	});

	it('falls back to the first unit without a base and yields empty slugs for no units', () => {
		expect(pickUnitPair(units, 'ghost')).toEqual({ from: 'erg', to: 'joule' });
		expect(pickUnitPair([], 'joule')).toEqual({ from: '', to: '' });
	});
});
