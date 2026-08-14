import type { UnitSystem } from '@equreka/schema';

export const SYSTEM_LABELS: Record<UnitSystem, string> = {
	si: 'SI',
	'si-derived': 'SI derived',
	imperial: 'Imperial',
	uscs: 'US customary',
	cgs: 'CGS',
	other: 'Other',
};

/**
 * Display order for search-result groups. Mirrors @equreka/schema's
 * COLLECTIONS, restated here because that constant lives next to Zod and
 * would drag it into the island bundle.
 */
export const COLLECTION_ORDER = [
	'categories',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
] as const;

export const COLLECTION_LABELS: Record<string, string> = {
	categories: 'Categories',
	magnitudes: 'Magnitudes',
	units: 'Units',
	prefixes: 'Prefixes',
	constants: 'Constants',
	variables: 'Variables',
	equations: 'Equations',
	paths: 'Paths',
};

export const EQUATION_KIND_LABELS: Record<'equation' | 'formula', string> = {
	equation: 'Equation',
	formula: 'Formula',
};

export const TERM_KIND_LABELS: Record<'magnitude' | 'constant' | 'variable', string> = {
	magnitude: 'Magnitude',
	constant: 'Constant',
	variable: 'Variable',
};
