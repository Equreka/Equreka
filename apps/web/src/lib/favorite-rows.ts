import type { FavoriteEntry } from '@equreka/core';
import { collectionRank, FAVORITE_GROUP_ORDER } from '@equreka/core/collections';
import type { Locale } from '@equreka/core/i18n';
import { entryHref } from './entry-links';
import { localePath } from './locale-paths';

/**
 * The legacy row's open-in-calculator action: calculator-enabled equations
 * open their calculator; convertible units open the converter card on
 * their own page, the v2 home of the legacy unit-conversion calculator.
 */
export type FavoriteTool = 'calculator' | 'converter';

/**
 * Build-time facts about one favoritable entry, keyed by
 * `favoriteKey(collection, slug)`. `category` is the entry's first
 * category (the one legacy badged); entries with neither field are
 * omitted from the index to keep the page's props small.
 */
export interface FavoriteEntryMeta {
	category?: string;
	tool?: FavoriteTool;
}

export type FavoriteMetaIndex = Readonly<Record<string, FavoriteEntryMeta>>;

export interface FavoriteLink {
	label: string;
	href: string;
}

/**
 * `category` is the badge (localized name and category page), `tool` the
 * calculator or converter action; `href` is undefined for collections
 * without a page.
 */
export interface FavoriteRow {
	key: string;
	collection: string;
	slug: string;
	name: string;
	href: string | undefined;
	category: (FavoriteLink & { slug: string }) | undefined;
	tool: { kind: FavoriteTool; href: string } | undefined;
}

export interface FavoriteGroup {
	collection: string;
	rows: FavoriteRow[];
}

/**
 * Heading id of the converter card on a unit page.
 */
const UNIT_CONVERTER_ANCHOR = 'unit-converter-heading';

export interface FavoriteShapeOptions {
	locale: Locale;
	meta: FavoriteMetaIndex;
	categoryNames: Readonly<Record<string, string>>;
	names: ReadonlyMap<string, string> | null;
}

export function favoriteKey(collection: string, slug: string): string {
	return `${collection}:${slug}`;
}

export function favoriteToolHref(tool: FavoriteTool, slug: string): string {
	return tool === 'calculator'
		? `/calculator/${slug}/`
		: `/units/${slug}/#${UNIT_CONVERTER_ANCHOR}`;
}

function shapeRow(entry: FavoriteEntry, options: FavoriteShapeOptions): FavoriteRow {
	const { locale, meta, categoryNames, names } = options;
	const key = favoriteKey(entry.collection, entry.slug);
	const facts = meta[key];
	const href = entryHref(entry.collection, entry.slug);
	const categorySlug = facts?.category;
	return {
		key,
		collection: entry.collection,
		slug: entry.slug,
		name: names?.get(key) ?? entry.slug,
		href: href === undefined ? undefined : localePath(locale, href),
		category:
			categorySlug === undefined
				? undefined
				: {
						slug: categorySlug,
						label: categoryNames[categorySlug] ?? categorySlug,
						href: localePath(locale, `/categories/${categorySlug}/`),
					},
		tool:
			facts?.tool === undefined
				? undefined
				: { kind: facts.tool, href: localePath(locale, favoriteToolHref(facts.tool, entry.slug)) },
	};
}

/**
 * Favorites grouped per collection in the original's order, each
 * group keeping the order the entries were saved in. Names come from the
 * precached catalog when it has loaded, the slug otherwise.
 */
export function shapeFavoriteGroups(
	favorites: readonly FavoriteEntry[],
	options: FavoriteShapeOptions,
): FavoriteGroup[] {
	const byCollection = new Map<string, FavoriteRow[]>();
	for (const entry of favorites) {
		const row = shapeRow(entry, options);
		const bucket = byCollection.get(entry.collection);
		if (bucket === undefined) {
			byCollection.set(entry.collection, [row]);
		} else {
			bucket.push(row);
		}
	}
	return [...byCollection.entries()]
		.map(([collection, rows]) => ({ collection, rows }))
		.sort(
			(a, b) =>
				collectionRank(FAVORITE_GROUP_ORDER.web, a.collection) -
				collectionRank(FAVORITE_GROUP_ORDER.web, b.collection),
		);
}
