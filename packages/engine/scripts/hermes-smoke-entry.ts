import type { CompiledEquationMeta, EngineSlice } from '@equreka/schema';
import {
	createUnitRegistry,
	formatSigFigs,
	getConstant,
	type SolutionsModule,
	solveEquation,
} from '../src/index.js';

declare const print: ((message: string) => void) | undefined;

/**
 * Hermes's standalone binary exposes `print` instead of a guaranteed
 * `console`; Node (used to sanity-run the bundle) has only `console`.
 */
function emit(message: string): void {
	if (typeof print === 'function') {
		print(message);
		return;
	}
	(globalThis as { console?: { log: (m: string) => void } }).console?.log(message);
}

function assert(condition: boolean, label: string): void {
	if (!condition) throw new Error(`hermes-smoke assertion failed: ${label}`);
}

function assertClose(actual: number, expected: number, label: string): void {
	assert(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), label);
}

const slice: EngineSlice = {
	schemaVersion: 1,
	contentHash: 'hermes-smoke',
	magnitudes: {},
	prefixes: {},
	equations: {},
	units: {
		metre: {
			slug: 'metre',
			name: { en: 'metre' },
			symbolTex: 'm',
			symbolText: 'm',
			magnitudes: ['length'],
			system: 'si',
			dimension: [1, 0, 0, 0, 0, 0, 0, 0],
			factor: '1',
			offset: '0',
			exact: true,
			affine: false,
		},
		foot: {
			slug: 'foot',
			name: { en: 'foot' },
			symbolTex: 'ft',
			symbolText: 'ft',
			magnitudes: ['length'],
			system: 'imperial',
			dimension: [1, 0, 0, 0, 0, 0, 0, 0],
			factor: '0.3048',
			offset: '0',
			exact: true,
			affine: false,
		},
		celsius: {
			slug: 'celsius',
			name: { en: 'celsius' },
			symbolTex: '°C',
			symbolText: '°C',
			magnitudes: ['thermodynamic-temperature'],
			system: 'si-derived',
			dimension: [0, 0, 0, 0, 1, 0, 0, 0],
			factor: '1',
			offset: '273.15',
			exact: true,
			affine: true,
		},
		fahrenheit: {
			slug: 'fahrenheit',
			name: { en: 'fahrenheit' },
			symbolTex: '°F',
			symbolText: '°F',
			magnitudes: ['thermodynamic-temperature'],
			system: 'uscs',
			dimension: [0, 0, 0, 0, 1, 0, 0, 0],
			factor: '0.555555555555555555555555555556',
			offset: '255.372222222222222222222222222',
			exact: true,
			affine: true,
		},
	},
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
	},
};

const registry = createUnitRegistry(slice);

const footToMetre = registry.convert(1, 'foot', 'metre');
assert(footToMetre.ok, 'foot → metre converts');
if (footToMetre.ok) assertClose(footToMetre.value, 0.3048, '1 ft = 0.3048 m');

const minusForty = registry.convert(-40, 'celsius', 'fahrenheit');
assert(minusForty.ok, 'celsius → fahrenheit converts');
if (minusForty.ok) assertClose(minusForty.value, -40, '−40 °C = −40 °F');

const incompatible = registry.convert(1, 'metre', 'celsius');
assert(!incompatible.ok, 'metre → celsius is rejected');

assert(formatSigFigs(0.1 + 0.2) === '0.3', 'formatSigFigs kills float noise');
assert(formatSigFigs(1e-7) === '1e-7', 'formatSigFigs scientific edge');

const constant = getConstant(slice, 'speed-of-light-vacuum');
assert(constant.ok && constant.value.display === '299792458', 'constant display passthrough');

const meta: CompiledEquationMeta = {
	slug: 'mass-energy-equivalence',
	kind: 'equation',
	name: { en: 'Mass–energy equivalence' },
	calculatorEnabled: true,
	terms: {
		E: { kind: 'magnitude', ref: 'energy', identifier: 'E' },
		m: { kind: 'magnitude', ref: 'mass', identifier: 'm' },
		c: { kind: 'constant', ref: 'speed-of-light-vacuum', identifier: 'c' },
	},
	solvable: ['E', 'm'],
};
const fns: SolutionsModule = {
	'mass-energy-equivalence': {
		E: (v) => Number(v.m) * Number(v.c) ** 2,
		m: (v) => Number(v.E) / Number(v.c) ** 2,
	},
};
const solved = solveEquation(meta, fns, { m: 2, c: 299792458 });
assert(solved.ok, 'solveEquation succeeds');
if (solved.ok) {
	assert(solved.value.symbol === 'E', 'solved for E');
	assertClose(solved.value.value, 2 * 299792458 ** 2, 'E = mc²');
}

emit('hermes-smoke-entry: all assertions passed');
