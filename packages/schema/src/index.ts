import type { CollectionName } from './common.js';
import {
	branch,
	category,
	constant,
	equation,
	magnitude,
	path,
	prefix,
	unit,
	variable,
} from './entities.js';
import { entityLocaleTree, type LocaleObjectNode, sidecarSchemaOf } from './locale.js';

export * from './common.js';
export * from './entities.js';
export * from './locale.js';

export const SCHEMA_VERSION = 3;

/**
 * Collection name → authored-entity schema. The pipeline validates every
 * file in packages/content/content/<collection>/ against this map.
 */
export const collectionSchemas = {
	categories: category,
	branches: branch,
	magnitudes: magnitude,
	units: unit,
	prefixes: prefix,
	constants: constant,
	variables: variable,
	equations: equation,
	paths: path,
} as const;

/**
 * Collection name → where its entities carry localized text; drives the
 * sidecar merge, the inline-translation ban, and the sidecar JSON Schema.
 */
export const collectionLocaleTrees = Object.fromEntries(
	Object.entries(collectionSchemas).map(([collection, schema]) => [
		collection,
		entityLocaleTree(schema),
	]),
) as Record<CollectionName, LocaleObjectNode>;

/**
 * Collection name → strict schema of a `<slug>.<locale>.yaml` sidecar.
 */
export const localeSidecarSchemas = Object.fromEntries(
	Object.entries(collectionLocaleTrees).map(([collection, tree]) => [
		collection,
		sidecarSchemaOf(tree),
	]),
) as Record<CollectionName, ReturnType<typeof sidecarSchemaOf>>;
export * from './compiled.js';
