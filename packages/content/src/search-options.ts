import type { Options } from 'minisearch';

export const SEARCH_LOCALES = ['en', 'es'] as const;

export type SearchLocale = (typeof SEARCH_LOCALES)[number];

/**
 * `description` holds the `searchLeadOf` of the localized description, not
 * the full text; the field keeps its name so serialized indexes and
 * `searchOptions` stay interchangeable. `branches` holds the
 * locale-resolved names of the entry's branches, so a query for a
 * sub-discipline ("termodinámica") reaches its members.
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

/**
 * `categories` holds category slugs in authored order; the first one badges
 * the entry's search result row, as the original's `categories[0]` did.
 */
export interface CatalogLiteEntry {
	collection: string;
	slug: string;
	name: string;
	symbolText: string;
	aliases: string[];
	branches: string[];
	categories: string[];
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
 * Longest lead a description contributes to the index. Full text would
 * push each locale's serialized index past its 1 MiB budget about 240
 * equations into the content program (ADR 0010).
 */
export const SEARCH_LEAD_MAX_CHARS = 480;

const BLANK_LINE_RE = /\n[ \t]*\n/;

/**
 * Prose reduced to index tokens: math fragments and control words dropped,
 * every whitespace run (hard and paragraph breaks included) folded to one
 * space, so the words on either side of a break never glue together.
 */
export function stripTexForSearch(text: string): string {
	return text
		.replace(/\$\$[^$]+\$\$/g, ' ')
		.replace(/\$[^$\n]+\$/g, ' ')
		.replace(/\\[a-zA-Z]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * What search indexes of a description, identically on every platform
 * (ADR 0010): the first paragraph, TeX stripped, cut to
 * SEARCH_LEAD_MAX_CHARS at a word boundary. A folded (`>-`) block parses
 * each blank-line paragraph break to one newline, while a literal (`|-`)
 * block keeps blank lines and uses single newlines for hard breaks inside
 * a paragraph; text holding a blank line therefore ends its first
 * paragraph there, any other text at its first newline.
 */
export function searchLeadOf(text: string): string {
	const body = text.trimStart();
	const blankLine = BLANK_LINE_RE.exec(body);
	const end = blankLine === null ? body.indexOf('\n') : blankLine.index;
	const lead = stripTexForSearch(end === -1 ? body : body.slice(0, end));
	if (lead.length <= SEARCH_LEAD_MAX_CHARS) {
		return lead;
	}
	const wordEnd = lead.lastIndexOf(' ', SEARCH_LEAD_MAX_CHARS);
	return lead.slice(0, wordEnd > 0 ? wordEnd : SEARCH_LEAD_MAX_CHARS);
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
