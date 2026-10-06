import { COLLECTIONS, type CollectionName } from '@equreka/schema/collections';
import type { MessageKey } from './i18n/en';

type Platform = 'web' | 'mobile';

/**
 * A collection's place in the category → branch navigation: `category` and
 * `branch` are its two levels, and `member` entries are filed under both and
 * listed on their pages.
 */
export type TaxonomyRole = 'category' | 'branch' | 'member';

/**
 * Per-collection facts every surface reads. `listed` means the collection
 * has a list page of its own: variables surface only through equations and
 * path steps, categories and branches through navigation.
 */
export interface CollectionInfo {
	readonly taxonomy: TaxonomyRole;
	readonly listed: boolean;
}

export const COLLECTION_INFO = {
	categories: { taxonomy: 'category', listed: false },
	branches: { taxonomy: 'branch', listed: false },
	magnitudes: { taxonomy: 'member', listed: true },
	units: { taxonomy: 'member', listed: true },
	prefixes: { taxonomy: 'member', listed: true },
	constants: { taxonomy: 'member', listed: true },
	variables: { taxonomy: 'member', listed: false },
	equations: { taxonomy: 'member', listed: true },
	paths: { taxonomy: 'member', listed: true },
} as const satisfies Readonly<Record<CollectionName, CollectionInfo>>;

export type MemberCollection = {
	[C in CollectionName]: (typeof COLLECTION_INFO)[C]['taxonomy'] extends 'member' ? C : never;
}[CollectionName];

/**
 * Resolves to an object type naming every member of `All` that the order `T`
 * leaves out, so an incomplete order fails to type-check.
 */
type Complete<All, T extends readonly All[]> = [Exclude<All, T[number]>] extends [never]
	? unknown
	: { readonly missing: Exclude<All, T[number]> };

function completeOrder<const T extends readonly CollectionName[]>(
	order: T & Complete<CollectionName, T>,
): readonly CollectionName[] {
	return order;
}

function completeMemberOrder<const T extends readonly MemberCollection[]>(
	order: T & Complete<MemberCollection, T>,
): readonly MemberCollection[] {
	return order;
}

export function isCollectionName(value: string): value is CollectionName {
	return (COLLECTIONS as readonly string[]).includes(value);
}

export function isTaxonomyMember(collection: CollectionName): collection is MemberCollection {
	return COLLECTION_INFO[collection].taxonomy === 'member';
}

export function collectionLabelKey(collection: CollectionName): MessageKey {
	return `collection.${collection}`;
}

/**
 * Position of `collection` in `order`; a name the order lacks (artifact data
 * from a newer build) sorts last.
 */
export function collectionRank(order: readonly string[], collection: string): number {
	const index = order.indexOf(collection);
	return index === -1 ? order.length : index;
}

/**
 * Canonical display order, followed by every list without a surface order
 * of its own below.
 */
export const COLLECTION_ORDER: readonly CollectionName[] = COLLECTIONS;

export const TAXONOMY_MEMBERS: readonly MemberCollection[] =
	COLLECTION_ORDER.filter(isTaxonomyMember);

export const LISTED_COLLECTIONS: readonly CollectionName[] = COLLECTION_ORDER.filter(
	(collection) => COLLECTION_INFO[collection].listed,
);

/**
 * The original app's type order (its formulas folded into equations), which
 * web search, favorites, and category and branch pages keep for returning
 * readers.
 */
const LEGACY_TYPE_ORDER = [
	'equations',
	'constants',
	'magnitudes',
	'variables',
	'units',
	'prefixes',
] as const;

export const SEARCH_GROUP_ORDER: Readonly<Record<Platform, readonly CollectionName[]>> = {
	web: completeOrder([...LEGACY_TYPE_ORDER, 'paths', 'categories', 'branches']),
	mobile: COLLECTION_ORDER,
};

export const FAVORITE_GROUP_ORDER: Readonly<Record<Platform, readonly CollectionName[]>> = {
	web: completeOrder([...LEGACY_TYPE_ORDER, 'categories', 'branches', 'paths']),
	mobile: COLLECTION_ORDER,
};

/**
 * Order of the per-collection lists on category and branch pages.
 */
export const MEMBER_LISTING_ORDER: Readonly<Record<Platform, readonly MemberCollection[]>> = {
	web: completeMemberOrder([...LEGACY_TYPE_ORDER, 'paths']),
	mobile: TAXONOMY_MEMBERS,
};
