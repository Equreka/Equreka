import { COLLECTIONS } from '@equreka/schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	isShardedCollection,
	mergePresentationEntry,
	PRESENTATION_SHARDS,
	type PresentationRecord,
	presentationShardOf,
	presentationShardPath,
	readPresentationSlice,
	SHARDED_COLLECTIONS,
	splitPresentationSlice,
} from '../presentation-shards.js';
import { fnv1a32, isValidShardCount } from '../shard-hash.js';

const slugArbitrary = fc.stringMatching(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const entryArbitrary = fc.dictionary(
	fc.constantFrom(
		'name',
		'categories',
		'branches',
		'symbolTex',
		'symbolText',
		'description',
		'terms',
	),
	fc.jsonValue(),
);

const sliceArbitrary = fc.dictionary(slugArbitrary, entryArbitrary, { maxKeys: 40 });

describe('presentation shard configuration', () => {
	it('shards only real collections, by valid counts, keeping a non-empty index', () => {
		expect(SHARDED_COLLECTIONS).toEqual(['equations', 'units']);
		for (const collection of SHARDED_COLLECTIONS) {
			expect(COLLECTIONS, collection).toContain(collection);
			expect(isValidShardCount(PRESENTATION_SHARDS[collection].count), collection).toBe(true);
			expect(PRESENTATION_SHARDS[collection].indexFields.length, collection).toBeGreaterThan(0);
		}
		expect(COLLECTIONS.filter((collection) => !isShardedCollection(collection))).toEqual([
			'categories',
			'branches',
			'magnitudes',
			'prefixes',
			'constants',
			'variables',
			'paths',
		]);
		expect(isShardedCollection('constructor')).toBe(false);
	});

	it('pins the shard of known slugs, so a hash or count change cannot pass unnoticed', () => {
		expect(PRESENTATION_SHARDS.equations.count).toBe(64);
		expect(PRESENTATION_SHARDS.units.count).toBe(16);
		const golden: ['equations' | 'units', string, number, number][] = [
			['equations', 'mass-energy-equivalence', 0x4069e0b9, 57],
			['equations', 'pythagorean-theorem', 0x42d0c1e8, 40],
			['equations', 'area-circle', 0x5879d073, 51],
			['units', 'metre', 0xb085cfac, 12],
			['units', 'kilogram', 0xdc824e23, 3],
			['units', 'nautical-mile', 0xbd537e06, 6],
		];
		for (const [collection, slug, hash, shard] of golden) {
			expect(fnv1a32(slug), slug).toBe(hash);
			expect(presentationShardOf(collection, slug), slug).toBe(shard);
		}
		expect(presentationShardPath('equations', 57)).toBe('presentation/equations/39.json');
		expect(presentationShardPath('units', 3)).toBe('presentation/units/03.json');
	});
});

describe('splitPresentationSlice', () => {
	it('places every slug in the index and in exactly the one shard its slug hashes to', () => {
		fc.assert(
			fc.property(fc.constantFrom(...SHARDED_COLLECTIONS), sliceArbitrary, (collection, slice) => {
				const { index, shards } = splitPresentationSlice(collection, slice);
				expect(shards).toHaveLength(PRESENTATION_SHARDS[collection].count);
				expect(Object.keys(index).sort()).toEqual(Object.keys(slice).sort());
				shards.forEach((shard, position) => {
					for (const slug of Object.keys(shard)) {
						expect(presentationShardOf(collection, slug)).toBe(position);
					}
				});
				expect(shards.flatMap((shard) => Object.keys(shard)).sort()).toEqual(
					Object.keys(slice).sort(),
				);
			}),
		);
	});

	it('splits fields disjointly by indexFields and merges back to the same entry', () => {
		fc.assert(
			fc.property(fc.constantFrom(...SHARDED_COLLECTIONS), sliceArbitrary, (collection, slice) => {
				const indexFields: readonly string[] = PRESENTATION_SHARDS[collection].indexFields;
				const { index, shards } = splitPresentationSlice(collection, slice);
				for (const [slug, entry] of Object.entries(slice)) {
					const indexRow = index[slug] ?? {};
					const detailRow = shards[presentationShardOf(collection, slug)]?.[slug] ?? {};
					expect(Object.keys(indexRow).every((field) => indexFields.includes(field))).toBe(true);
					expect(Object.keys(detailRow).some((field) => indexFields.includes(field))).toBe(false);
					expect(mergePresentationEntry(indexRow, detailRow)).toEqual(entry);
				}
			}),
		);
	});
});

describe('readPresentationSlice', () => {
	function filesOf(collection: 'equations' | 'units', slice: PresentationRecord) {
		const { index, shards } = splitPresentationSlice(collection, slice);
		const files = new Map<string, unknown>([[`presentation/${collection}.json`, index]]);
		shards.forEach((shard, position) => {
			files.set(presentationShardPath(collection, position), shard);
		});
		return files;
	}

	it('reassembles a sharded slice from its index and shards', () => {
		fc.assert(
			fc.property(fc.constantFrom(...SHARDED_COLLECTIONS), sliceArbitrary, (collection, slice) => {
				const files = filesOf(collection, slice);
				expect(readPresentationSlice(collection, (relPath) => files.get(relPath))).toEqual(slice);
			}),
		);
	});

	it('returns a whole slice as read', () => {
		const paths = { 'si-base-units': { name: { en: 'SI base units' }, steps: [] } };
		expect(
			readPresentationSlice('paths', (relPath) =>
				relPath === 'presentation/paths.json' ? paths : undefined,
			),
		).toBe(paths);
	});

	it('throws when an indexed slug is missing from its shard', () => {
		const files = filesOf('units', { metre: { name: { en: 'Metre' }, description: { en: 'm' } } });
		files.set(presentationShardPath('units', presentationShardOf('units', 'metre')), {});
		expect(() => readPresentationSlice('units', (relPath) => files.get(relPath))).toThrow(
			/presentation\/units\/0c\.json has no entry for indexed slug 'metre'/,
		);
	});
});
