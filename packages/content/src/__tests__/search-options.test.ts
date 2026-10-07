import MiniSearch from 'minisearch';
import { describe, expect, it } from 'vitest';
import {
	foldSearchTerm,
	SEARCH_LEAD_MAX_CHARS,
	type SearchDocument,
	searchLeadOf,
	searchOptions,
	stripTexForSearch,
} from '../search-options.js';

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

describe('stripTexForSearch', () => {
	it('folds hard line breaks and paragraph breaks to single spaces', () => {
		expect(stripTexForSearch('in use.\n- $M$ is used\n\nBecause')).toBe(
			'in use. - is used Because',
		);
	});

	it('never glues the words on either side of a break that follows math', () => {
		expect(stripTexForSearch('squared $(\\const{c}^{2})$.\nBecause')).toBe('squared . Because');
		expect(stripTexForSearch('mass\n$$E$$\nenergy')).toBe('mass energy');
	});
});

describe('searchLeadOf', () => {
	it('keeps the first paragraph of folded prose, whose paragraph breaks parse to one newline', () => {
		expect(searchLeadOf('Torque about $\\mag{r}$ an axis.\nLater, entropy.')).toBe(
			'Torque about an axis.',
		);
	});

	it('ends a literal block at its first blank line, keeping hard breaks before it', () => {
		expect(searchLeadOf('Symbols in use:\n- $M$ by one body\n- NM by another\n\nHistory.')).toBe(
			'Symbols in use: - by one body - NM by another',
		);
	});

	it('skips leading blank lines and keeps a single-paragraph text whole', () => {
		expect(searchLeadOf('\n\nLead only.')).toBe('Lead only.');
		expect(searchLeadOf('Lead only.')).toBe('Lead only.');
		expect(searchLeadOf('')).toBe('');
	});

	it('caps the lead at a word boundary', () => {
		const words = Array.from({ length: 200 }, (_, index) => `word${index}`);
		const lead = searchLeadOf(words.join(' '));
		expect(lead.length).toBeLessThanOrEqual(SEARCH_LEAD_MAX_CHARS);
		expect(lead.length).toBeGreaterThan(SEARCH_LEAD_MAX_CHARS - 'word199 '.length);
		expect(words.join(' ').startsWith(`${lead} `)).toBe(true);
		expect(searchLeadOf('x'.repeat(SEARCH_LEAD_MAX_CHARS + 20))).toHaveLength(
			SEARCH_LEAD_MAX_CHARS,
		);
	});

	it('leaves words after the first paragraph out of the index', () => {
		const index = new MiniSearch(searchOptions);
		index.add({
			id: 'magnitudes:torque',
			collection: 'magnitudes',
			slug: 'torque',
			name: 'Torque',
			description: searchLeadOf('Rotational analogue of force.\nMeasured with a dynamometer.'),
			aliases: [],
			symbolText: 'τ',
			branches: [],
		});
		expect(index.search('analogue').map((result) => result.id)).toEqual(['magnitudes:torque']);
		expect(index.search('dynamometer')).toEqual([]);
	});
});
