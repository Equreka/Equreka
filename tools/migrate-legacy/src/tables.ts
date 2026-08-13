/**
 * Hand-authored migration tables. Dimensions and nonNegative flags are the
 * authoritative physics call for v2 (the legacy corpus never had them);
 * compose/prefix/solution tables were derived from the legacy corpus and are
 * re-verified against it at run time.
 */
export const DIMENSIONS: Record<
	string,
	Partial<Record<'L' | 'M' | 'T' | 'I' | 'Th' | 'N' | 'J' | 'A', number>>
> = {
	'angular-momentum': { L: 2, M: 1, T: -1 },
	area: { L: 2 },
	capacitance: { L: -2, M: -1, T: 4, I: 2 },
	'electric-charge': { T: 1, I: 1 },
	'electric-current': { I: 1 },
	'electric-potential-difference': { L: 2, M: 1, T: -3, I: -1 },
	'electric-potential': { L: 2, M: 1, T: -3, I: -1 },
	'electrical-resistance': { L: 2, M: 1, T: -3, I: -2 },
	'electromotive-force': { L: 2, M: 1, T: -3, I: -1 },
	energy: { L: 2, M: 1, T: -2 },
	entropy: { L: 2, M: 1, T: -2, Th: -1 },
	force: { L: 1, M: 1, T: -2 },
	frequency: { T: -1 },
	heat: { L: 2, M: 1, T: -2 },
	length: { L: 1 },
	'luminous-flux': { J: 1, A: 2 },
	'luminous-intensity': { J: 1 },
	mass: { M: 1 },
	'plane-angle': { A: 1 },
	power: { L: 2, M: 1, T: -3 },
	pressure: { L: -1, M: 1, T: -2 },
	'radiant-flux': { L: 2, M: 1, T: -3 },
	'solid-angle': { A: 2 },
	speed: { L: 1, T: -1 },
	stress: { L: -1, M: 1, T: -2 },
	substance: { N: 1 },
	'thermodynamic-temperature': { Th: 1 },
	time: { T: 1 },
	volume: { L: 3 },
	weight: { L: 1, M: 1, T: -2 },
	work: { L: 2, M: 1, T: -2 },
	dimensionless: {},
};

export const NON_NEGATIVE = new Set([
	'area',
	'electrical-resistance',
	'frequency',
	'length',
	'luminous-flux',
	'luminous-intensity',
	'mass',
	'solid-angle',
	'speed',
	'substance',
	'thermodynamic-temperature',
	'time',
	'volume',
]);

export const COMPOSE_TABLE: Record<string, Array<{ unit: string; exp: number }>> = {
	'square-metre': [{ unit: 'metre', exp: 2 }],
	'cubic-metre': [{ unit: 'metre', exp: 3 }],
	'metre-per-second': [
		{ unit: 'metre', exp: 1 },
		{ unit: 'second', exp: -1 },
	],
	'joule-per-kelvin': [
		{ unit: 'joule', exp: 1 },
		{ unit: 'kelvin', exp: -1 },
	],
	'joule-per-second': [
		{ unit: 'joule', exp: 1 },
		{ unit: 'second', exp: -1 },
	],
	'joule-second': [
		{ unit: 'joule', exp: 1 },
		{ unit: 'second', exp: 1 },
	],
	'lumen-per-watt': [
		{ unit: 'lumen', exp: 1 },
		{ unit: 'watt', exp: -1 },
	],
	'foot-pound': [
		{ unit: 'foot', exp: 1 },
		{ unit: 'pound', exp: 1 },
	],
};

/**
 * Expected outcome of prefix decomposition (rule 3); the run derives the set
 * from the corpus and asserts it matches this list exactly.
 */
export const EXPECTED_PREFIX_UNITS = new Set([
	'centimetre',
	'kilometre',
	'micrometre',
	'millimetre',
	'nanometre',
	'microsecond',
	'millisecond',
	'nanosecond',
	'milliampere',
	'milligram',
	'microgram',
	'millilitre',
	'millimole',
]);

export const SI_BASE_UNITS = new Set([
	'metre',
	'kilogram',
	'second',
	'ampere',
	'kelvin',
	'mole',
	'candela',
]);

/**
 * Legacy `type: 'si'` claims corrected against BIPM SI Brochure 9: these are
 * non-SI units accepted for use with the SI, so they land on 'other'.
 */
export const SYSTEM_REALITY_OVERRIDES: Record<string, 'other'> = {
	year: 'other',
	month: 'other',
	week: 'other',
	tonne: 'other',
};

/** Units allowed to emit with no derivation form despite not backing any magnitude. */
export const FORMLESS_UNITS = new Set(['unit']);

export const SYMBOL_OVERRIDES: Record<string, { tex: string }> = {
	unitless: { tex: '1' },
};

export const CATEGORY_ORDER: Record<string, number> = {
	universal: 0,
	mathematics: 1,
	physics: 2,
	chemistry: 3,
};

export const EQUATION_RENAMES: Record<string, string> = {
	'pithagoras-theorem': 'pythagorean-theorem',
};

/**
 * Hand-authored per-variable solved forms, transcribed from the legacy
 * calculator modules (legacy/calculator/{equations,formulas}); build-time
 * verification is P2 work. area-circle references the pi constant as `pi`
 * while its term key is `\pi` — the P2 verifier defines that normalization.
 */
export const SOLUTIONS: Record<string, Record<string, string>> = {
	'mass-energy-equivalence': { E: 'm * c^2', m: 'E / c^2' },
	'pythagorean-theorem': { a: 'sqrt(c^2 - b^2)', b: 'sqrt(c^2 - a^2)', c: 'sqrt(a^2 + b^2)' },
	'area-square': { A: 'l^2', l: 'sqrt(A)' },
	'area-circle': { A: 'pi * r^2', r: 'sqrt(A / pi)' },
};

/**
 * Repeating-expansion decimals snapped to exact ratios when a formula-free
 * conversion row matches within relative 1e-12.
 */
export const SNAP_RATIONALS: ReadonlyArray<readonly [number, number]> = [
	[5, 9],
	[9, 5],
	[3, 2],
	[2, 3],
	[4, 5],
	[5, 4],
	[21, 40],
	[40, 21],
	[33, 100],
	[100, 33],
];

export const EXPECTED_COUNTS: Record<string, number> = {
	categories: 4,
	magnitudes: 32,
	units: 77,
	prefixes: 20,
	constants: 8,
	variables: 4,
	equations: 4,
};
