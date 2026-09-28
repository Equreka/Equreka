import { getCollection } from 'astro:content';
import { type Locale, type LocalizedText, localizedName } from '@equreka/core/i18n';
import type { Branch } from '@equreka/schema';
import { asBranch } from '../collections';
import { entryHref } from '../entry-links';

/**
 * Collections whose entries carry `categories` and `branches` and are listed
 * on category and branch pages, in display order.
 */
export const MEMBER_COLLECTIONS = [
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
] as const;

export type MemberCollection = (typeof MEMBER_COLLECTIONS)[number];

/**
 * One listed entry, locale-resolved. `href` is undefined for collections
 * without pages (variables).
 */
export interface MemberEntry {
	collection: MemberCollection;
	slug: string;
	name: string;
	href: string | undefined;
	categories: readonly string[];
	branches: readonly string[];
}

export interface CollectionMembers {
	collection: MemberCollection;
	entries: MemberEntry[];
}

/**
 * Every entry of every member collection, sorted by localized name within
 * canonical collection order — server only (astro:content).
 */
export async function memberEntries(locale: Locale): Promise<MemberEntry[]> {
	const perCollection = await Promise.all(
		MEMBER_COLLECTIONS.map(async (collection) =>
			(await getCollection(collection))
				.map((item) => {
					const data = item.data as {
						name: LocalizedText;
						categories: string[];
						branches: string[];
					};
					return {
						collection,
						slug: item.id,
						name: localizedName(data, locale),
						href: entryHref(collection, item.id),
						categories: data.categories,
						branches: data.branches,
					};
				})
				.sort((a, b) => a.name.localeCompare(b.name, locale)),
		),
	);
	return perCollection.flat();
}

export async function branchRecords(): Promise<Record<string, Branch>> {
	return Object.fromEntries(
		(await getCollection('branches')).map((entry) => [entry.id, asBranch(entry.data)]),
	);
}

/**
 * Splits entries into per-collection runs in canonical order, dropping
 * empty collections.
 */
export function byCollection(entries: readonly MemberEntry[]): CollectionMembers[] {
	return MEMBER_COLLECTIONS.map((collection) => ({
		collection,
		entries: entries.filter((entry) => entry.collection === collection),
	})).filter((group) => group.entries.length > 0);
}
