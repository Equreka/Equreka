import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FAVORITES_KEY, useFavorites } from '../hooks/use-favorites';
import { createMemoryStorage } from './memory-storage';

afterEach(cleanup);

describe('useFavorites', () => {
	it('migrates legacy keys once, renaming pithagoras-theorem and merging formulas into equations', () => {
		const storage = createMemoryStorage({
			'equreka-favorites-equations': '["pithagoras-theorem","mass-energy-equivalence"]',
			'equreka-favorites-formulas': '["density"]',
			'equreka-favorites-units': '["metre","celsius"]',
			'equreka-favorites-prefixes': '["kilo"]',
		});
		const { result } = renderHook(() => useFavorites(storage));

		const keys = result.current.favorites.map((entry) => `${entry.collection}:${entry.slug}`);
		expect(keys).toEqual([
			'equations:pythagorean-theorem',
			'equations:mass-energy-equivalence',
			'equations:density',
			'units:metre',
			'units:celsius',
			'prefixes:kilo',
		]);
		expect(storage.get('equreka-favorites-equations')).toBeNull();
		expect(storage.get('equreka-favorites-formulas')).toBeNull();
		expect(storage.get('equreka-favorites-units')).toBeNull();
		expect(storage.get('equreka-favorites-prefixes')).toBeNull();
		expect(storage.get(FAVORITES_KEY)).not.toBeNull();
	});

	it('deduplicates legacy slugs already present under the v1 key', () => {
		const storage = createMemoryStorage({
			[FAVORITES_KEY]: JSON.stringify([
				{ collection: 'units', slug: 'metre', addedAt: '2026-01-01T00:00:00.000Z' },
			]),
			'equreka-favorites-units': '["metre","second"]',
		});
		const { result } = renderHook(() => useFavorites(storage));

		expect(result.current.favorites).toHaveLength(2);
		expect(result.current.favorites[0]?.addedAt).toBe('2026-01-01T00:00:00.000Z');
	});

	it('ignores malformed legacy payloads and still removes their keys', () => {
		const storage = createMemoryStorage({
			'equreka-favorites-units': 'not json',
			'equreka-favorites-constants': '{"an":"object"}',
		});
		const { result } = renderHook(() => useFavorites(storage));

		expect(result.current.favorites).toEqual([]);
		expect(storage.get('equreka-favorites-units')).toBeNull();
		expect(storage.get('equreka-favorites-constants')).toBeNull();
	});

	it('toggle adds then removes; isFavorite tracks both transitions', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => useFavorites(storage));

		act(() => result.current.toggle('units', 'metre'));
		expect(result.current.isFavorite('units', 'metre')).toBe(true);
		expect(result.current.favorites).toHaveLength(1);
		expect(result.current.favorites[0]?.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

		act(() => result.current.toggle('units', 'metre'));
		expect(result.current.isFavorite('units', 'metre')).toBe(false);
		expect(result.current.favorites).toHaveLength(0);
	});

	it('keeps two hook instances over one storage in sync', () => {
		const storage = createMemoryStorage();
		const first = renderHook(() => useFavorites(storage));
		const second = renderHook(() => useFavorites(storage));

		act(() => first.result.current.toggle('constants', 'speed-of-light'));
		expect(second.result.current.isFavorite('constants', 'speed-of-light')).toBe(true);
	});

	it('round-trips export → import and merges instead of overwriting', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => useFavorites(storage));

		act(() => {
			result.current.toggle('units', 'metre');
			result.current.toggle('equations', 'density');
		});
		const envelope = result.current.exportEnvelope();
		expect(envelope.v).toBe(1);
		expect(envelope.favorites).toHaveLength(2);

		const other = createMemoryStorage();
		const imported = renderHook(() => useFavorites(other));
		act(() => imported.result.current.toggle('units', 'metre'));

		let added: number | null = null;
		act(() => {
			added = imported.result.current.importEnvelope(JSON.parse(JSON.stringify(envelope)));
		});
		expect(added).toBe(1);
		expect(imported.result.current.favorites).toHaveLength(2);
		expect(imported.result.current.isFavorite('equations', 'density')).toBe(true);
	});

	it('rejects invalid envelopes with null and leaves storage untouched', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => useFavorites(storage));

		let outcome: number | null = 0;
		act(() => {
			outcome = result.current.importEnvelope({ v: 2, favorites: [] });
		});
		expect(outcome).toBeNull();
		act(() => {
			outcome = result.current.importEnvelope('[]');
		});
		expect(outcome).toBeNull();
		expect(storage.get(FAVORITES_KEY)).toBeNull();
	});
});
