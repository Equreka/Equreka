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
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];
