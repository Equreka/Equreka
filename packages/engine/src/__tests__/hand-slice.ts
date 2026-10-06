import type {
	CompiledDimension,
	CompiledMagnitude,
	CompiledUnit,
	EngineSlice,
} from '@equreka/schema';

export const LENGTH: CompiledDimension = [1, 0, 0, 0, 0, 0, 0, 0];
export const MASS: CompiledDimension = [0, 1, 0, 0, 0, 0, 0, 0];
export const TEMPERATURE: CompiledDimension = [0, 0, 0, 0, 1, 0, 0, 0];
export const FREQUENCY: CompiledDimension = [0, 0, -1, 0, 0, 0, 0, 0];
export const ANGULAR_SPEED: CompiledDimension = [0, 0, -1, 0, 0, 0, 0, 1];
export const SPEED: CompiledDimension = [1, 0, -1, 0, 0, 0, 0, 0];

interface UnitSpec {
	dimension: CompiledDimension;
	magnitude: string;
	factor: string;
	offset?: string;
	exact?: boolean;
	affine?: boolean;
}

function makeUnit(slug: string, spec: UnitSpec): CompiledUnit {
	return {
		slug,
		name: { en: slug },
		symbolTex: slug,
		symbolText: slug,
		magnitudes: [spec.magnitude],
		system: 'other',
		dimension: spec.dimension,
		factor: spec.factor,
		offset: spec.offset ?? '0',
		exact: spec.exact ?? true,
		affine: spec.affine ?? false,
	};
}

function makeMagnitude(
	slug: string,
	baseUnit: string,
	dimension: CompiledDimension,
	nonNegative: boolean,
): CompiledMagnitude {
	return { slug, name: { en: slug }, symbolTex: slug, baseUnit, dimension, nonNegative };
}

/**
 * Build-independent EngineSlice used by every always-on test. Factors follow
 * NIST SP 811 exact definitions (foot 0.3048, inch 0.0254, mile 1609.344);
 * repeating rationals (5/9, −2/3, 5/18) are written with 30 digits so
 * Number() parses to the float64 nearest the true ratio — the same thing the
 * decimal.js build step emits.
 */
export const HAND_SLICE: EngineSlice = {
	schemaVersion: 1,
	contentHash: 'hand-slice',
	magnitudes: {
		length: makeMagnitude('length', 'metre', LENGTH, true),
		mass: makeMagnitude('mass', 'kilogram', MASS, true),
		'thermodynamic-temperature': makeMagnitude(
			'thermodynamic-temperature',
			'kelvin',
			TEMPERATURE,
			true,
		),
		frequency: makeMagnitude('frequency', 'hertz', FREQUENCY, true),
		'angular-speed': makeMagnitude('angular-speed', 'radian-per-second', ANGULAR_SPEED, false),
		speed: makeMagnitude('speed', 'metre-per-second', SPEED, true),
	},
	units: {
		metre: makeUnit('metre', { dimension: LENGTH, magnitude: 'length', factor: '1' }),
		foot: makeUnit('foot', { dimension: LENGTH, magnitude: 'length', factor: '0.3048' }),
		inch: makeUnit('inch', { dimension: LENGTH, magnitude: 'length', factor: '0.0254' }),
		mile: makeUnit('mile', { dimension: LENGTH, magnitude: 'length', factor: '1609.344' }),
		cubit: makeUnit('cubit', {
			dimension: LENGTH,
			magnitude: 'length',
			factor: '0.4572',
			exact: false,
		}),
		kilogram: makeUnit('kilogram', { dimension: MASS, magnitude: 'mass', factor: '1' }),
		gram: makeUnit('gram', { dimension: MASS, magnitude: 'mass', factor: '0.001' }),
		kelvin: makeUnit('kelvin', {
			dimension: TEMPERATURE,
			magnitude: 'thermodynamic-temperature',
			factor: '1',
		}),
		celsius: makeUnit('celsius', {
			dimension: TEMPERATURE,
			magnitude: 'thermodynamic-temperature',
			factor: '1',
			offset: '273.15',
			affine: true,
		}),
		fahrenheit: makeUnit('fahrenheit', {
			dimension: TEMPERATURE,
			magnitude: 'thermodynamic-temperature',
			factor: '0.555555555555555555555555555556',
			offset: '255.372222222222222222222222222',
			affine: true,
		}),
		rankine: makeUnit('rankine', {
			dimension: TEMPERATURE,
			magnitude: 'thermodynamic-temperature',
			factor: '0.555555555555555555555555555556',
		}),
		delisle: makeUnit('delisle', {
			dimension: TEMPERATURE,
			magnitude: 'thermodynamic-temperature',
			factor: '-0.666666666666666666666666666667',
			offset: '373.15',
			affine: true,
		}),
		hertz: makeUnit('hertz', { dimension: FREQUENCY, magnitude: 'frequency', factor: '1' }),
		becquerel: makeUnit('becquerel', {
			dimension: FREQUENCY,
			magnitude: 'frequency',
			factor: '1',
		}),
		'radian-per-second': makeUnit('radian-per-second', {
			dimension: ANGULAR_SPEED,
			magnitude: 'angular-speed',
			factor: '1',
		}),
		'metre-per-second': makeUnit('metre-per-second', {
			dimension: SPEED,
			magnitude: 'speed',
			factor: '1',
		}),
		'kilometre-per-hour': makeUnit('kilometre-per-hour', {
			dimension: SPEED,
			magnitude: 'speed',
			factor: '0.277777777777777777777777777778',
		}),
	},
	prefixes: {},
	constants: {
		'speed-of-light-vacuum': {
			slug: 'speed-of-light-vacuum',
			name: { en: 'speed of light in vacuum' },
			symbolTex: 'c',
			symbolText: 'c',
			value: '299792458',
			unit: 'metre-per-second',
			exact: true,
			irrational: false,
		},
		'electron-mass': {
			slug: 'electron-mass',
			name: { en: 'electron mass' },
			symbolTex: 'm_e',
			symbolText: 'm_e',
			value: '9.1093837139e-31',
			unit: 'kilogram',
			exact: false,
			irrational: false,
		},
	},
	equations: {},
};
