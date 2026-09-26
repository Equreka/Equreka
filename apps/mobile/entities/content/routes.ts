import type { EntryCollection } from './types';

/**
 * Display order for browse cards, search-result groups and favorites
 * sections; mirrors @equreka/schema's COLLECTIONS without pulling Zod into
 * the bundle.
 */
export const COLLECTION_ORDER: readonly EntryCollection[] = [
	'categories',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
];

/**
 * Collections with a browse list of their own; categories are the home
 * chips and variables surface only through equations and path steps.
 */
export const BROWSABLE_COLLECTIONS: readonly EntryCollection[] = [
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'equations',
	'paths',
];

export function isEntryCollection(value: string): value is EntryCollection {
	return (COLLECTION_ORDER as readonly string[]).includes(value);
}

export function collectionRank(collection: string): number {
	const index = (COLLECTION_ORDER as readonly string[]).indexOf(collection);
	return index === -1 ? COLLECTION_ORDER.length : index;
}

/**
 * In-app route for one catalog entry. Paths and categories have dedicated
 * screens; everything else is the generic entry screen, which is also the
 * `equreka://entry/<collection>/<slug>` deep-link target.
 */
export function entryHref(collection: string, slug: string): string {
	if (collection === 'paths') return `/paths/${slug}`;
	if (collection === 'categories') return `/category/${slug}`;
	return `/entry/${collection}/${slug}`;
}

export function browseHref(collection: EntryCollection): string {
	return collection === 'paths' ? '/paths' : `/browse/${collection}`;
}

export function converterHref(magnitude?: string, from?: string): string {
	const query = [
		magnitude === undefined ? null : `magnitude=${encodeURIComponent(magnitude)}`,
		from === undefined ? null : `from=${encodeURIComponent(from)}`,
	].filter((part) => part !== null);
	return query.length === 0 ? '/converter' : `/converter?${query.join('&')}`;
}

export function calculatorHref(slug?: string): string {
	return slug === undefined ? '/calculator' : `/calculator/${slug}`;
}
