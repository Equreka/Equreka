/**
 * Content collections, in canonical display order. The folder name under
 * packages/content/content/ doubles as the collection name. Kept free of Zod
 * so client bundles can read the list without pulling in the schemas.
 */
export const COLLECTIONS = [
	'categories',
	'branches',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
	'elements',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/**
 * Collections the pipeline validates and emits before any web or mobile
 * page renders them (ADR 0016). They stay out of the search artifacts, the
 * mobile bundle and the user-facing registry in `@equreka/core/collections`,
 * so no list, search row, favorite or deep link reaches a page that does not
 * exist. A collection leaves this list in the change that ships its pages.
 */
export const UNSURFACED_COLLECTIONS = ['elements'] as const satisfies readonly CollectionName[];

export type UnsurfacedCollection = (typeof UNSURFACED_COLLECTIONS)[number];

export type SurfacedCollection = Exclude<CollectionName, UnsurfacedCollection>;

export function isSurfacedCollection(collection: CollectionName): collection is SurfacedCollection {
	return !(UNSURFACED_COLLECTIONS as readonly string[]).includes(collection);
}

export const SURFACED_COLLECTIONS: readonly SurfacedCollection[] =
	COLLECTIONS.filter(isSurfacedCollection);
