import type { EditorialStatus, EngineSlice, ExternalIds } from '@equreka/schema';

export interface ExternalLink {
	label: 'Wikidata' | 'QUDT';
	href: string;
}

export interface DefinedTermInput {
	name: string;
	description?: string;
	url: string;
	inLanguage: string;
	externalIds?: ExternalIds;
}

/**
 * An entry without an authored status predates editorial tracking and is
 * therefore unreviewed.
 */
export function isDraft(status: EditorialStatus | undefined): boolean {
	return status !== 'reviewed';
}

/**
 * Concept IRI of a Wikidata item — the form linked-data consumers match on,
 * which also resolves to the item page in a browser.
 */
export function wikidataIri(qid: string): string {
	return `https://www.wikidata.org/entity/${qid}`;
}

export function externalLinks(ids: ExternalIds | undefined): ExternalLink[] {
	const links: ExternalLink[] = [];
	if (ids?.wikidata !== undefined) {
		links.push({ label: 'Wikidata', href: wikidataIri(ids.wikidata) });
	}
	if (ids?.qudt !== undefined) {
		links.push({ label: 'QUDT', href: ids.qudt });
	}
	return links;
}

/**
 * schema.org DefinedTerm for one wiki entry; `sameAs` lists the external
 * identities only when at least one is authored.
 */
export function definedTermJsonLd(input: DefinedTermInput): Record<string, unknown> {
	const sameAs = externalLinks(input.externalIds).map((link) => link.href);
	return {
		'@context': 'https://schema.org',
		'@type': 'DefinedTerm',
		name: input.name,
		...(input.description === undefined ? {} : { description: input.description }),
		url: input.url,
		inLanguage: input.inLanguage,
		...(sameAs.length === 0 ? {} : { sameAs }),
	};
}

/**
 * JSON for an inline `<script type="application/ld+json">`: `<` is escaped
 * so authored text can never close the script element early.
 */
export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/**
 * The magnitude the converter opens on for a unit page: its first authored
 * magnitude, or — for a magnitude-less compound unit — the first magnitude
 * (by slug) sharing its dimension. Undefined when no magnitude has that
 * dimension, in which case the page offers no converter.
 */
export function converterMagnitudeOf(
	unitSlug: string,
	unitOf: readonly string[],
	slice: Pick<EngineSlice, 'units' | 'magnitudes'>,
): string | undefined {
	const first = unitOf[0];
	if (first !== undefined) {
		return first;
	}
	const dimension = slice.units[unitSlug]?.dimension;
	if (dimension === undefined) {
		return undefined;
	}
	return Object.values(slice.magnitudes)
		.filter((magnitude) => magnitude.dimension.every((value, index) => value === dimension[index]))
		.map((magnitude) => magnitude.slug)
		.sort()[0];
}
