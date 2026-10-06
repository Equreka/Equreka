import { getCollection } from 'astro:content';
import { type MemberCollection, TAXONOMY_MEMBERS } from '@equreka/core/collections';
import { type Locale, type LocalizedText, localizedName } from '@equreka/core/i18n';
import type { Branch } from '@equreka/schema';
import { asBranch } from '../collections';
import { entryHref } from '../entry-links';

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

/**
 * Every entry of every member collection, sorted by localized name within
 * canonical collection order — server only (astro:content).
 */
export async function memberEntries(locale: Locale): Promise<MemberEntry[]> {
	const perCollection = await Promise.all(
		TAXONOMY_MEMBERS.map(async (collection) =>
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
