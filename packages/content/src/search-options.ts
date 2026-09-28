import type { Options } from 'minisearch';

export const SEARCH_LOCALES = ['en', 'es'] as const;

export type SearchLocale = (typeof SEARCH_LOCALES)[number];

/**
 * `branches` holds the locale-resolved names of the entry's branches, so a
 * query for a sub-discipline ("termodinámica") reaches its members.
 */
export interface SearchDocument {
	id: string;
	collection: string;
	slug: string;
	name: string;
	description: string;
	aliases: string[];
	symbolText: string;
	branches: string[];
}

export interface CatalogLiteEntry {
	collection: string;
	slug: string;
	name: string;
	symbolText: string;
	aliases: string[];
	branches: string[];
}

/**
 * Lowercase + NFD + strip combining marks, applied at index AND query time —
 * diacritic folding is mandatory in both locales (ADR 0002: 'metrico' must
 * find 'métrico').
 */
export function foldSearchTerm(term: string): string {
	return term
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}+/gu, '');
}

/**
 * Canonical MiniSearch options. A serialized index only behaves correctly
 * when revived with the exact options it was built with — every runtime
 * (web, mobile, future @equreka/core) must import THIS object, never
 * restate it.
 */
export const searchOptions = {
	fields: ['name', 'description', 'aliases', 'symbolText', 'branches'],
	storeFields: ['name', 'collection'],
	extractField: (document, fieldName): string => {
		const value = (document as unknown as Record<string, unknown>)[fieldName];
		if (Array.isArray(value)) {
			return value.join(' ');
		}
		return value === undefined || value === null ? '' : String(value);
	},
	processTerm: (term): string | null => {
		const folded = foldSearchTerm(term);
		return folded === '' ? null : folded;
	},
} satisfies Options<SearchDocument>;
