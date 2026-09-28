/**
 * Display order for search-result and favorites groups. Mirrors
 * @equreka/schema's COLLECTIONS, restated here because that constant lives
 * next to Zod and would drag it into the island bundle. Localized labels
 * live in @equreka/core/i18n under `collection.<name>`.
 */
export const COLLECTION_ORDER = [
	'categories',
	'branches',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
] as const;
