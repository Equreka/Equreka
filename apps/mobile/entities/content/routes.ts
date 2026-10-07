import { isCollectionName } from '@equreka/core/collections';
import type { EntryCollection } from './types';

export function isEntryCollection(value: string): value is EntryCollection {
	return isCollectionName(value);
}

/**
 * In-app route for one catalog entry. Paths, categories and branches have
 * dedicated screens; everything else is the generic entry screen, which is also the
 * `equreka://entry/<collection>/<slug>` deep-link target.
 */
export function entryHref(collection: string, slug: string): string {
	if (collection === 'paths') return `/paths/${slug}`;
	if (collection === 'categories') return `/category/${slug}`;
	if (collection === 'branches') return `/branch/${slug}`;
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
