import { COLLECTIONS, SURFACED_COLLECTIONS, UNSURFACED_COLLECTIONS } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import {
	COLLECTION_INFO,
	COLLECTION_ORDER,
	collectionRank,
	FAVORITE_GROUP_ORDER,
	isCollectionName,
	LISTED_COLLECTIONS,
	MEMBER_LISTING_ORDER,
	SEARCH_GROUP_ORDER,
	TAXONOMY_MEMBERS,
} from '../collections';
import { collectionLabel } from '../i18n/index';

describe('collection registry', () => {
	it('displays the surfaced collections in the schema order', () => {
		const unsurfaced: readonly string[] = UNSURFACED_COLLECTIONS;
		expect(COLLECTION_ORDER).toEqual(COLLECTIONS.filter((c) => !unsurfaced.includes(c)));
	});

	it('keeps each surface order a permutation of its collections', () => {
		for (const order of [
			...Object.values(SEARCH_GROUP_ORDER),
			...Object.values(FAVORITE_GROUP_ORDER),
		]) {
			expect([...order].sort()).toEqual([...SURFACED_COLLECTIONS].sort());
		}
		for (const order of Object.values(MEMBER_LISTING_ORDER)) {
			expect([...order].sort()).toEqual([...TAXONOMY_MEMBERS].sort());
		}
	});

	it('pins each surface order', () => {
		expect(SEARCH_GROUP_ORDER).toEqual({
			web: [
				'equations',
				'constants',
				'magnitudes',
				'variables',
				'units',
				'prefixes',
				'paths',
				'categories',
				'branches',
			],
			mobile: COLLECTION_ORDER,
		});
		expect(FAVORITE_GROUP_ORDER).toEqual({
			web: [
				'equations',
				'constants',
				'magnitudes',
				'variables',
				'units',
				'prefixes',
				'categories',
				'branches',
				'paths',
			],
			mobile: COLLECTION_ORDER,
		});
		expect(MEMBER_LISTING_ORDER).toEqual({
			web: ['equations', 'constants', 'magnitudes', 'variables', 'units', 'prefixes', 'paths'],
			mobile: TAXONOMY_MEMBERS,
		});
	});

	it('derives the taxonomy members and the listed collections in display order', () => {
		expect(TAXONOMY_MEMBERS).toEqual([
			'magnitudes',
			'units',
			'prefixes',
			'constants',
			'variables',
			'equations',
			'paths',
		]);
		expect(LISTED_COLLECTIONS).toEqual([
			'magnitudes',
			'units',
			'prefixes',
			'constants',
			'equations',
			'paths',
		]);
	});

	it('ranks an unknown collection after every known one', () => {
		expect(collectionRank(SEARCH_GROUP_ORDER.web, 'equations')).toBe(0);
		expect(collectionRank(SEARCH_GROUP_ORDER.web, 'exercises')).toBe(SEARCH_GROUP_ORDER.web.length);
		expect(isCollectionName('exercises')).toBe(false);
		expect(isCollectionName('paths')).toBe(true);
	});

	it('labels every collection in every locale and echoes an unknown one', () => {
		for (const collection of SURFACED_COLLECTIONS) {
			expect(collectionLabel('en', collection)).not.toMatch(/^collection\./);
			expect(collectionLabel('es', collection)).not.toMatch(/^collection\./);
		}
		expect(collectionLabel('es', 'paths')).toBe('Rutas');
		expect(collectionLabel('en', 'exercises')).toBe('exercises');
	});

	it('keeps a collection built ahead of its pages out of every surface', () => {
		expect(UNSURFACED_COLLECTIONS.length).toBeGreaterThan(0);
		const orders = [
			COLLECTION_ORDER,
			TAXONOMY_MEMBERS,
			LISTED_COLLECTIONS,
			...Object.values(SEARCH_GROUP_ORDER),
			...Object.values(FAVORITE_GROUP_ORDER),
			...Object.values(MEMBER_LISTING_ORDER),
		];
		for (const collection of UNSURFACED_COLLECTIONS) {
			expect(isCollectionName(collection), collection).toBe(false);
			expect(Object.hasOwn(COLLECTION_INFO, collection), collection).toBe(false);
			for (const order of orders) {
				expect(order as readonly string[], collection).not.toContain(collection);
			}
			expect(collectionRank(SEARCH_GROUP_ORDER.web, collection)).toBe(
				SEARCH_GROUP_ORDER.web.length,
			);
		}
	});
});
