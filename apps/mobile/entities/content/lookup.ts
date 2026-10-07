import { collectionRank, MEMBER_LISTING_ORDER, TAXONOMY_MEMBERS } from '@equreka/core/collections';
import type { Locale } from '@equreka/core/i18n';
import { localizedName } from '@equreka/core/i18n';
import { branchesOfCategory, groupByBranch } from '@equreka/core/taxonomy';
import { getPresentation } from '../../shared/content/artifact';
import type {
	EntryCollection,
	MemberCollection,
	PresentationEntry,
	PresentationSlices,
} from './types';

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
 * A list row plus the taxonomy it is filed under, for branch grouping.
 */
interface FiledSummary extends EntrySummary {
	categories: readonly string[];
	branches: readonly string[];
}

function filedEntries(
	collections: readonly MemberCollection[],
	locale: Locale,
	keep: (entity: { categories: string[]; branches: string[] }) => boolean,
): FiledSummary[] {
	return collections.flatMap((collection) =>
		Object.entries(getPresentation(collection))
			.filter(([, entity]) => keep(entity))
			.map(([slug, entity]) => ({
				...summaryOf(collection, slug, entity, locale),
				categories: entity.categories,
				branches: entity.branches,
			}))
			.sort(compareByName),
	);
}

function toSummary({ collection, slug, name, symbolText }: FiledSummary): EntrySummary {
	return { collection, slug, name, symbolText };
}

/**
 * Every entity tagged with the category, grouped per collection in listing
 * order.
 */
export function entriesInCategory(categorySlug: string, locale: Locale): CollectionGroup[] {
	return groupByCollection(
		filedEntries(TAXONOMY_MEMBERS, locale, (entity) =>
			entity.categories.includes(categorySlug),
		).map(toSummary),
	);
}

/**
 * One branch section; `branch` is null for entries filed under none of the
 * category's branches (shown as "General").
 */
export interface BranchSection {
	branch: string | null;
	count: number;
	groups: CollectionGroup[];
}

/**
 * The category's entries by branch (in authored order), each branch split
 * by collection; an entry filed under two branches appears in both.
 */
export function branchSectionsInCategory(categorySlug: string, locale: Locale): BranchSection[] {
	const entries = filedEntries(TAXONOMY_MEMBERS, locale, (entity) =>
		entity.categories.includes(categorySlug),
	);
	return groupByBranch(entries, branchesOfCategory(getPresentation('branches'), categorySlug)).map(
		(group) => ({
			branch: group.branch,
			count: group.entries.length,
			groups: groupByCollection(group.entries.map(toSummary)),
		}),
	);
}

/**
 * Every branch slug, categories in their authored order and branches in
 * theirs within each category.
 */
export function orderedBranches(): string[] {
	const branches = getPresentation('branches');
	return Object.entries(getPresentation('categories'))
		.sort(([, a], [, b]) => a.order - b.order)
		.flatMap(([categorySlug]) => branchesOfCategory(branches, categorySlug));
}

/**
 * One collection's browse list sectioned by branch across all categories,
 * branchless entries last.
 */
export function branchSectionsOfCollection(
	collection: MemberCollection,
	locale: Locale,
): { branch: string | null; entries: EntrySummary[] }[] {
	return groupByBranch(
		filedEntries([collection], locale, () => true),
		orderedBranches(),
	).map((group) => ({ branch: group.branch, entries: group.entries.map(toSummary) }));
}

export function entriesInBranch(branchSlug: string, locale: Locale): CollectionGroup[] {
	return groupByCollection(
		filedEntries(TAXONOMY_MEMBERS, locale, (entity) => entity.branches.includes(branchSlug)).map(
			toSummary,
		),
	);
}

export function groupByCollection(entries: readonly EntrySummary[]): CollectionGroup[] {
	const byCollection = new Map<EntryCollection, EntrySummary[]>();
	for (const entry of entries) {
		const bucket = byCollection.get(entry.collection);
		if (bucket === undefined) byCollection.set(entry.collection, [entry]);
		else bucket.push(entry);
	}
	const rank = (collection: string): number =>
		collectionRank(MEMBER_LISTING_ORDER.mobile, collection);
	return [...byCollection.entries()]
		.map(([collection, grouped]) => ({ collection, entries: grouped }))
		.sort((a, b) => rank(a.collection) - rank(b.collection));
}
