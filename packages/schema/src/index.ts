import {
	category,
	constant,
	equation,
	magnitude,
	path,
	prefix,
	unit,
	variable,
} from './entities.js';

export * from './common.js';
export * from './entities.js';

export const SCHEMA_VERSION = 1;

/**
 * Collection name → authored-entity schema. The pipeline validates every
 * file in packages/content/content/<collection>/ against this map.
 */
export const collectionSchemas = {
	categories: category,
	magnitudes: magnitude,
	units: unit,
	prefixes: prefix,
	constants: constant,
	variables: variable,
	equations: equation,
	paths: path,
} as const;
