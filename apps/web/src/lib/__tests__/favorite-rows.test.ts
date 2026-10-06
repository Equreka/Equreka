import type { FavoriteEntry } from '@equreka/core';
import { describe, expect, it } from 'vitest';
import {
	type FavoriteMetaIndex,
	favoriteKey,
	favoriteToolHref,
	shapeFavoriteGroups,
} from '../favorite-rows';

const entry = (collection: string, slug: string): FavoriteEntry => ({
	collection,
	slug,
	addedAt: '2026-10-05T00:00:00.000Z',
});

const meta: FavoriteMetaIndex = {
	'equations:mass-energy-equivalence': { category: 'physics', tool: 'calculator' },
	'equations:ideal-gas-law': { category: 'chemistry' },
	'constants:speed-of-light': { category: 'universal' },
	'units:metre': { category: 'physics', tool: 'converter' },
};

const categoryNames = { physics: 'Física', chemistry: 'Química', universal: 'Universal' };

const names = new Map([
	[favoriteKey('equations', 'mass-energy-equivalence'), 'Equivalencia masa-energía'],
	[favoriteKey('units', 'metre'), 'Metro'],
]);

const favorites = [
	entry('equations', 'mass-energy-equivalence'),
	entry('units', 'metre'),
	entry('constants', 'speed-of-light'),
	entry('variables', 'time'),
	entry('equations', 'ideal-gas-law'),
	entry('categories', 'physics'),
];

describe('shapeFavoriteGroups', () => {
	const groups = shapeFavoriteGroups(favorites, { locale: 'es', meta, categoryNames, names });

	it('groups per collection in the original order, keeping saved order inside a group', () => {
		expect(groups.map((group) => group.collection)).toEqual([
			'equations',
			'constants',
			'variables',
			'units',
			'categories',
		]);
		const equations = groups.find((group) => group.collection === 'equations');
		expect(equations?.rows.map((row) => row.slug)).toEqual([
			'mass-energy-equivalence',
			'ideal-gas-law',
		]);
	});

	it('carries the localized category badge, entry link and calculator action', () => {
		const row = groups.find((group) => group.collection === 'equations')?.rows[0];
		expect(row).toEqual({
			key: 'equations:mass-energy-equivalence',
			collection: 'equations',
			slug: 'mass-energy-equivalence',
			name: 'Equivalencia masa-energía',
			href: '/es/equations/mass-energy-equivalence/',
			category: { slug: 'physics', label: 'Física', href: '/es/categories/physics/' },
			tool: { kind: 'calculator', href: '/es/calculator/mass-energy-equivalence/' },
		});
	});

	it('offers an action only where a calculator or converter exists', () => {
		const rows = groups.flatMap((group) => group.rows);
		const tools = Object.fromEntries(rows.map((row) => [row.key, row.tool?.kind]));
		expect(tools).toEqual({
			'categories:physics': undefined,
			'units:metre': 'converter',
			'constants:speed-of-light': undefined,
			'variables:time': undefined,
			'equations:mass-energy-equivalence': 'calculator',
			'equations:ideal-gas-law': undefined,
		});
	});

	it('falls back to the slug name, no badge and no page for unknown entries', () => {
		const row = groups.find((group) => group.collection === 'variables')?.rows[0];
		expect(row?.name).toBe('time');
		expect(row?.href).toBeUndefined();
		expect(row?.category).toBeUndefined();
	});

	it('uses the slug when the catalog has not loaded', () => {
		const [group] = shapeFavoriteGroups([entry('units', 'metre')], {
			locale: 'en',
			meta,
			categoryNames,
			names: null,
		});
		expect(group?.rows[0]?.name).toBe('metre');
		expect(group?.rows[0]?.href).toBe('/units/metre/');
	});
});

describe('favoriteToolHref', () => {
	it('routes equations to their calculator and units to their converter card', () => {
		expect(favoriteToolHref('calculator', 'area-circle')).toBe('/calculator/area-circle/');
		expect(favoriteToolHref('converter', 'metre')).toBe('/units/metre/#unit-converter-heading');
	});
});
