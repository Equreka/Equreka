import MiniSearch from 'minisearch';
import { describe, expect, it } from 'vitest';
import { foldSearchTerm, type SearchDocument, searchOptions } from '../search-options.js';

const documents: SearchDocument[] = [
	{
		id: 'units:sistema-metrico',
		collection: 'units',
		slug: 'sistema-metrico',
		name: 'Sistema métrico',
		description: 'El sistema métrico decimal de unidades',
		aliases: ['métrico'],
		symbolText: 'm',
		branches: [],
	},
	{
		id: 'units:ohm',
		collection: 'units',
		slug: 'ohm',
		name: 'Ohm',
		description: 'Resistencia eléctrica',
		aliases: ['ohm', 'Ω'],
		symbolText: 'Ω',
		branches: ['Electromagnetismo'],
	},
];

describe('searchOptions', () => {
	it('folds diacritics at index and query time', () => {
		expect(foldSearchTerm('Métrico')).toBe('metrico');
		expect(foldSearchTerm('ELÉCTRICA')).toBe('electrica');
	});

	it('round-trips through serialization and finds métrico via metrico', () => {
		const index = new MiniSearch(searchOptions);
		index.addAll(documents);
		const revived = MiniSearch.loadJSON(JSON.stringify(index), searchOptions);
		const plain = revived.search('metrico');
		expect(plain.map((result) => result.id)).toContain('units:sistema-metrico');
		const accented = revived.search('métrico');
		expect(accented.map((result) => result.id)).toContain('units:sistema-metrico');
		const stored = plain.find((result) => result.id === 'units:sistema-metrico');
		expect(stored?.name).toBe('Sistema métrico');
		expect(stored?.collection).toBe('units');
	});

	it('indexes alias arrays', () => {
		const index = new MiniSearch(searchOptions);
		index.addAll(documents);
		expect(index.search('electrica').map((result) => result.id)).toContain('units:ohm');
	});

	it('indexes branch names so a sub-discipline query reaches its members', () => {
		const index = new MiniSearch(searchOptions);
		index.addAll(documents);
		expect(index.search('electromagnetismo').map((result) => result.id)).toEqual(['units:ohm']);
	});
});
