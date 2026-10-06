import type {
	CompiledDimension,
	CompiledMagnitude,
	CompiledUnit,
	EngineSlice,
} from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { HAND_SLICE } from '../../__tests__/hand-slice.js';
import { unwrap } from '../../__tests__/support.js';
import {
	createUnitRegistry,
	kindAncestors,
	kindDescendants,
	kindFamily,
	kindRelations,
} from '../index.js';

const ENERGY: CompiledDimension = [2, 1, -2, 0, 0, 0, 0, 0];

function magnitude(slug: string, kindOf?: string): CompiledMagnitude {
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		baseUnit: 'joule',
		dimension: ENERGY,
		...(kindOf === undefined ? {} : { kindOf }),
		nonNegative: false,
	};
}

function unit(slug: string, magnitudes: string[], factor: string): CompiledUnit {
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		symbolText: slug,
		magnitudes,
		system: 'other',
		dimension: ENERGY,
		factor,
		offset: '0',
		exact: true,
		affine: false,
	};
}

/**
 * The energy dimension-collision cluster from ADR 0003 backlog item 2:
 * work and heat specialize energy, torque shares the dimension as an
 * unrelated kind, and kilowatt-hour is a magnitude-less compound unit.
 */
const KIND_SLICE: EngineSlice = {
	...HAND_SLICE,
	magnitudes: {
		...HAND_SLICE.magnitudes,
		energy: magnitude('energy'),
		work: magnitude('work', 'energy'),
		heat: magnitude('heat', 'energy'),
		'latent-heat': magnitude('latent-heat', 'heat'),
		torque: { ...magnitude('torque'), baseUnit: 'newton-metre' },
	},
	units: {
		...HAND_SLICE.units,
		joule: unit('joule', ['energy', 'work', 'heat'], '1'),
		erg: unit('erg', ['energy'], '1e-7'),
		calorie: unit('calorie', ['heat'], '4.184'),
		'newton-metre': unit('newton-metre', ['torque'], '1'),
		'kilowatt-hour': unit('kilowatt-hour', [], '3600000'),
	},
};

const slugs = (units: readonly CompiledUnit[]): string[] => units.map((u) => u.slug).sort();

describe('kind graph walks', () => {
	const graph = KIND_SLICE.magnitudes;

	it('lists ancestors nearest first and descendants transitively', () => {
		expect(kindAncestors(graph, 'latent-heat')).toEqual(['heat', 'energy']);
		expect(kindAncestors(graph, 'energy')).toEqual([]);
		expect(kindDescendants(graph, 'energy')).toEqual(['heat', 'latent-heat', 'work']);
		expect(kindDescendants(graph, 'work')).toEqual([]);
	});

	it('builds the family from self, ancestors and descendants — never siblings', () => {
		expect(kindFamily(graph, 'work')).toEqual(['work', 'energy']);
		expect(kindFamily(graph, 'heat')).toEqual(['heat', 'energy', 'latent-heat']);
		expect(kindFamily(graph, 'torque')).toEqual(['torque']);
		expect(kindFamily(graph, 'ghost')).toEqual([]);
	});

	it('separates kind relations from mere dimension equality', () => {
		expect(kindRelations(graph, 'work')).toEqual({
			broader: ['energy'],
			narrower: [],
			sameDimension: ['heat', 'latent-heat', 'torque'],
		});
		expect(kindRelations(graph, 'energy')).toEqual({
			broader: [],
			narrower: ['heat', 'latent-heat', 'work'],
			sameDimension: ['torque'],
		});
		expect(kindRelations(graph, 'length').sameDimension).toEqual([]);
	});

	it('terminates on a malformed cyclic or dangling graph', () => {
		const cyclic = {
			a: { slug: 'a', dimension: ENERGY, kindOf: 'b' },
			b: { slug: 'b', dimension: ENERGY, kindOf: 'a' },
			c: { slug: 'c', dimension: ENERGY, kindOf: 'ghost' },
		};
		expect(kindAncestors(cyclic, 'a')).toEqual(['b']);
		expect(kindAncestors(cyclic, 'c')).toEqual([]);
		expect(kindFamily(cyclic, 'a')).toEqual(['a', 'b']);
	});
});

describe('unitsForMagnitude', () => {
	const registry = createUnitRegistry(KIND_SLICE);

	it('scopes to the kind family by default', () => {
		expect(slugs(registry.unitsForMagnitude('energy'))).toEqual(['calorie', 'erg', 'joule']);
		expect(slugs(registry.unitsForMagnitude('work'))).toEqual(['erg', 'joule']);
		expect(slugs(registry.unitsForMagnitude('heat'))).toEqual(['calorie', 'erg', 'joule']);
		expect(slugs(registry.unitsForMagnitude('torque'))).toEqual(['newton-metre']);
	});

	it('widens to every same-dimension unit on the dimension scope', () => {
		const all = ['calorie', 'erg', 'joule', 'kilowatt-hour', 'newton-metre'];
		expect(slugs(registry.unitsForMagnitude('work', 'dimension'))).toEqual(all);
		expect(slugs(registry.unitsForMagnitude('torque', 'dimension'))).toEqual(all);
		expect(slugs(registry.compatibleUnits(ENERGY))).toEqual(all);
	});

	it('keeps the kind scope a subset of the dimension scope for every magnitude', () => {
		for (const slug of Object.keys(KIND_SLICE.magnitudes)) {
			const wide = new Set(slugs(registry.unitsForMagnitude(slug, 'dimension')));
			expect(slugs(registry.unitsForMagnitude(slug)).every((u) => wide.has(u))).toBe(true);
		}
	});

	it('returns nothing for an unknown magnitude', () => {
		expect(registry.unitsForMagnitude('ghost')).toEqual([]);
		expect(registry.unitsForMagnitude('ghost', 'dimension')).toEqual([]);
	});

	it('leaves convert() dimension-keyed across kinds', () => {
		expect(unwrap(registry.convert(1, 'newton-metre', 'joule'))).toBe(1);
		expect(unwrap(registry.convert(1, 'kilowatt-hour', 'joule'))).toBe(3600000);
	});

	it('matches the dimension scope where no kindOf is authored', () => {
		expect(slugs(registry.unitsForMagnitude('frequency'))).toEqual(['becquerel', 'hertz']);
	});
});
