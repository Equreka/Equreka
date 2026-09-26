import type { Locale } from '@equreka/core/i18n';
import { localizedName } from '@equreka/core/i18n';
import { getPresentation } from '../../shared/content/artifact';
import { COLLECTION_ORDER } from './routes';
import type { EntryCollection, PresentationEntry, PresentationSlices } from './types';

/**
 * The list-row projection of one entity: what browse, category, search and
 * favorites screens render before the reader opens the entry.
 */
export interface EntrySummary {
	collection: EntryCollection;
	slug: string;
	name: string;
	symbolText: string;
}

function symbolTextOf(entity: object): string {
	return 'symbolText' in entity && typeof entity.symbolText === 'string' ? entity.symbolText : '';
}

function summaryOf(
	collection: EntryCollection,
	slug: string,
	entity: PresentationSlices[EntryCollection][string],
	locale: Locale,
): EntrySummary {
	return {
		collection,
		slug,
		name: localizedName(entity, locale),
		symbolText: symbolTextOf(entity),
	};
}

export function compareByName(a: EntrySummary, b: EntrySummary): number {
	return a.name.localeCompare(b.name);
}

export function getEntry(collection: EntryCollection, slug: string): PresentationEntry | undefined {
	const entity = getPresentation(collection)[slug];
	return entity === undefined
		? undefined
		: ({ collection, slug, entity } as unknown as PresentationEntry);
}

export function getSummary(
	collection: EntryCollection,
	slug: string,
	locale: Locale,
): EntrySummary | undefined {
	const entity = getPresentation(collection)[slug];
	return entity === undefined ? undefined : summaryOf(collection, slug, entity, locale);
}

export function listEntries(collection: EntryCollection, locale: Locale): EntrySummary[] {
	return Object.entries(getPresentation(collection))
		.map(([slug, entity]) => summaryOf(collection, slug, entity, locale))
		.sort(compareByName);
}

export interface CollectionGroup {
	collection: EntryCollection;
	entries: EntrySummary[];
}

/**
 * Every entity tagged with the category, grouped in canonical collection
 * order; categories themselves carry no `categories` field and are skipped.
 */
export function entriesInCategory(categorySlug: string, locale: Locale): CollectionGroup[] {
	const groups: CollectionGroup[] = [];
	for (const collection of COLLECTION_ORDER) {
		if (collection === 'categories') continue;
		const entries = Object.entries(getPresentation(collection))
			.filter(([, entity]) => entity.categories.includes(categorySlug))
			.map(([slug, entity]) => summaryOf(collection, slug, entity, locale))
			.sort(compareByName);
		if (entries.length > 0) groups.push({ collection, entries });
	}
	return groups;
}

export function groupByCollection(entries: readonly EntrySummary[]): CollectionGroup[] {
	const byCollection = new Map<EntryCollection, EntrySummary[]>();
	for (const entry of entries) {
		const bucket = byCollection.get(entry.collection);
		if (bucket === undefined) byCollection.set(entry.collection, [entry]);
		else bucket.push(entry);
	}
	return COLLECTION_ORDER.filter((collection) => byCollection.has(collection)).map(
		(collection) => ({ collection, entries: byCollection.get(collection) ?? [] }),
	);
}
