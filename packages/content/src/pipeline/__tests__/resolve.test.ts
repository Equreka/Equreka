import { fileURLToPath } from 'node:url';
import { collectionSchemas } from '@equreka/schema';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent } from '../load.js';
import { expandCorpus } from '../prefix-expansion.js';
import { RAT_ONE, rat, ratMul } from '../rational.js';
import { type ResolveResult, resolveUnits } from '../resolve.js';
import { type Corpus, validateContent } from '../validate.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

let corpus: Corpus;
let resolution: ResolveResult;

beforeAll(() => {
	const loaded = loadContent(CONTENT_DIR);
	expect(loaded.issues).toEqual([]);
	const validated = validateContent(loaded);
	expect(validated.issues).toEqual([]);
	const expansion = expandCorpus(validated.corpus, loaded);
	expect(expansion.issues).toEqual([]);
	corpus = expansion.corpus;
	resolution = resolveUnits(corpus);
	expect(resolution.issues).toEqual([]);
});

describe('resolveUnits over the real corpus', () => {
	it('resolves the fahrenheit affine chain with rounded inexact rendering', () => {
		const fahrenheit = resolution.resolved.get('fahrenheit');
		expect(fahrenheit).toMatchObject({
			factorText: '0.555555555555555555555555555555555556',
			offsetText: '255.372222222222222222222222222222222',
			exact: false,
			affine: true,
		});
	});

	it('resolves delisle with a negative factor and exact-decimal offset', () => {
		expect(resolution.resolved.get('delisle')).toMatchObject({
			factorText: '-0.666666666666666666666666666666666667',
			offsetText: '373.15',
			exact: false,
			affine: true,
		});
	});

	it('resolves the kilometre → metre prefix chain', () => {
		expect(resolution.resolved.get('kilometre')).toMatchObject({
			factorText: '1000',
			offsetText: '0',
			exact: true,
			affine: false,
		});
	});

	it('resolves the milligram → gram → kilogram chain', () => {
		expect(resolution.resolved.get('milligram')).toMatchObject({
			factorText: '0.000001',
			exact: true,
		});
		expect(resolution.resolved.get('microgram')).toMatchObject({
			factorText: '0.000000001',
			exact: true,
		});
	});

	it('resolves the joule-per-kelvin compose form as the entropy anchor', () => {
		expect(resolution.resolved.get('joule-per-kelvin')).toMatchObject({
			factorText: '1',
			offsetText: '0',
			exact: true,
			affine: false,
			dimension: [2, 1, -2, 0, -1, 0, 0, 0],
		});
	});

	it('accepts a compose-form base unit (metre-per-second)', () => {
		expect(resolution.resolved.get('metre-per-second')).toMatchObject({
			factorText: '1',
			dimension: [1, 0, -1, 0, 0, 0, 0, 0],
		});
	});

	it('derives the magnitude-less reciprocal-mole dimension from its operand', () => {
		expect(corpus.units.get('reciprocal-mole')?.unitOf).toEqual([]);
		expect(corpus.magnitudes.has('reciprocal-amount')).toBe(false);
		expect(resolution.resolved.get('reciprocal-mole')).toMatchObject({
			factorText: '1',
			offsetText: '0',
			exact: true,
			dimension: [0, 0, 0, 0, 0, -1, 0, 0],
		});
	});

	it('resolves every named SI derived unit to the identity through its base-unit composition', () => {
		for (const slug of [
			'joule',
			'newton',
			'watt',
			'pascal',
			'volt',
			'ohm',
			'coulomb',
			'farad',
			'hertz',
			'lumen',
		]) {
			expect(resolution.resolved.get(slug), slug).toMatchObject({
				factorText: '1',
				offsetText: '0',
				exact: true,
				affine: false,
			});
		}
		expect(resolution.resolved.get('farad')?.dimension).toEqual([-2, -1, 4, 2, 0, 0, 0, 0]);
		expect(resolution.resolved.get('lumen')?.dimension).toEqual([0, 0, 0, 0, 0, 0, 1, 2]);
	});

	it('carries the item-8 exact definitions (stone, mile, pints, quarts)', () => {
		expect(resolution.resolved.get('stone')).toMatchObject({
			factorText: '6.35029318',
			exact: true,
		});
		expect(resolution.resolved.get('mile')).toMatchObject({ factorText: '1609.344', exact: true });
		expect(resolution.resolved.get('imperial-pint')).toMatchObject({
			factorText: '0.00056826125',
			exact: true,
		});
		expect(resolution.resolved.get('imperial-quart')).toMatchObject({
			factorText: '0.0011365225',
			exact: true,
		});
		expect(resolution.resolved.get('us-pint')).toMatchObject({
			factorText: '0.000473176473',
			exact: true,
		});
		expect(resolution.resolved.get('us-quart')).toMatchObject({
			factorText: '0.000946352946',
			exact: true,
		});
	});
});

function syntheticCorpus(units: Record<string, unknown>): Corpus {
	return {
		categories: new Map(),
		branches: new Map(),
		magnitudes: new Map([
			[
				'energy',
				collectionSchemas.magnitudes.parse({
					name: { en: 'Energy' },
					symbol: { tex: 'E' },
					baseUnit: 'joule',
					dimension: { L: 2, M: 1, T: -2 },
				}),
			],
			[
				'length',
				collectionSchemas.magnitudes.parse({
					name: { en: 'Length' },
					symbol: { tex: 'l' },
					baseUnit: 'metre',
					dimension: { L: 1 },
				}),
			],
			[
				'plane-angle',
				collectionSchemas.magnitudes.parse({
					name: { en: 'Plane angle' },
					symbol: { tex: '\\theta' },
					baseUnit: 'radian',
					dimension: { A: 1 },
				}),
			],
			[
				'dimensionless',
				collectionSchemas.magnitudes.parse({
					name: { en: 'Dimensionless' },
					symbol: { tex: '1' },
					baseUnit: 'unitless',
					dimension: {},
				}),
			],
		]),
		units: new Map(
			Object.entries(units).map(([slug, data]) => [slug, collectionSchemas.units.parse(data)]),
		),
		prefixes: new Map(),
		constants: new Map(),
		variables: new Map(),
		equations: new Map(),
		paths: new Map(),
	};
}

const BASE_UNITS = {
	joule: { name: { en: 'Joule' }, symbol: { tex: 'J' }, unitOf: ['energy'] },
	metre: { name: { en: 'Metre' }, symbol: { tex: 'm' }, unitOf: ['length'] },
	radian: { name: { en: 'Radian' }, symbol: { tex: 'rad' }, unitOf: ['plane-angle'] },
	unitless: { name: { en: 'Unitless' }, symbol: { tex: '1' }, unitOf: ['dimensionless'] },
};

describe('resolveUnits dimension verification', () => {
	it('rejects a compose whose dimension sum contradicts the magnitude', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				'bogus-energy': {
					name: { en: 'Bogus' },
					symbol: { tex: 'b' },
					unitOf: ['energy'],
					compose: { of: [{ unit: 'metre', exp: 1 }] },
				},
			}),
		);
		expect(
			result.issues.some(
				(entry) =>
					entry.file === 'units/bogus-energy.yaml' && entry.message.includes('compose dimension'),
			),
		).toBe(true);
		expect(result.resolved.has('bogus-energy')).toBe(false);
	});
});

describe('resolveUnits compose coefficient', () => {
	it('multiplies the exact coefficient into the factor chain (arcminute = degree/60)', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				degree: {
					name: { en: 'Degree' },
					symbol: { tex: '°' },
					unitOf: ['plane-angle'],
					toBase: { factor: '0.0174532925199432957692369076848861271', exact: false },
				},
				arcminute: {
					name: { en: 'Arcminute' },
					symbol: { tex: "'" },
					unitOf: ['plane-angle'],
					compose: { factor: { num: '1', den: '60' }, of: [{ unit: 'degree', exp: 1 }] },
				},
				gradian: {
					name: { en: 'Gradian' },
					symbol: { tex: 'gon' },
					unitOf: ['plane-angle'],
					compose: { factor: { num: '9', den: '10' }, of: [{ unit: 'degree', exp: 1 }] },
				},
			}),
		);
		expect(result.issues).toEqual([]);
		const degree = result.resolved.get('degree');
		const arcminute = result.resolved.get('arcminute');
		const gradian = result.resolved.get('gradian');
		expect(degree).toBeDefined();
		expect(arcminute?.factor).toEqual(ratMul(degree?.factor ?? RAT_ONE, rat(1n, 60n)));
		expect(arcminute?.exact).toBe(false);
		expect(gradian?.factorText.startsWith('0.015707963267948966')).toBe(true);
	});

	it('defaults the coefficient to 1 (identity for base-unit compositions)', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				'square-metre': {
					name: { en: 'Square metre' },
					symbol: { tex: 'm^{2}' },
					unitOf: ['dimensionless'],
					compose: { of: [{ unit: 'metre', exp: 2 }] },
				},
			}),
		);
		expect(result.issues.map((entry) => entry.message)).toEqual([
			expect.stringContaining('compose dimension'),
		]);
	});
});

describe('resolveUnits nonConvertible units', () => {
	it('skips factor resolution for nonConvertible units', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				decibel: {
					name: { en: 'Decibel' },
					symbol: { tex: 'dB' },
					unitOf: ['dimensionless'],
					nonConvertible: true,
				},
			}),
		);
		expect(result.issues).toEqual([]);
		expect(result.resolved.has('decibel')).toBe(false);
		expect(result.resolved.has('unitless')).toBe(true);
	});
});

describe('resolveUnits identity anchors', () => {
	it('rejects a toBase unit that duplicates the identity of its dimension, naming the anchor', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				unit: {
					name: { en: 'Unit' },
					symbol: { tex: 'u' },
					unitOf: ['dimensionless'],
					toBase: { factor: '1' },
				},
			}),
		);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			severity: 'error',
			stage: 'resolve',
			file: 'units/unit.yaml',
		});
		expect(result.issues[0]?.message).toContain("anchored by 'unitless'");
	});

	it('accepts a compose form that lands on the identity by construction (J/s next to W)', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				'joule-alias': {
					name: { en: 'Joule alias' },
					symbol: { tex: 'J' },
					unitOf: ['energy'],
					compose: { of: [{ unit: 'joule', exp: 1 }] },
				},
			}),
		);
		expect(result.issues).toEqual([]);
		expect(result.resolved.get('joule-alias')?.factorText).toBe('1');
	});
});

describe('resolveUnits magnitude-less compound units', () => {
	const newton = {
		name: { en: 'Newton' },
		symbol: { tex: 'N' },
		compose: {
			of: [
				{ unit: 'joule', exp: 1 },
				{ unit: 'metre', exp: -1 },
			],
		},
	};

	it('takes the dimension from the operands and nests through another magnitude-less unit', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				newton,
				'newton-kilometre': {
					name: { en: 'Newton kilometre' },
					symbol: { tex: 'N\\cdot km' },
					unitOf: [],
					compose: {
						factor: '1000',
						of: [
							{ unit: 'newton', exp: 1 },
							{ unit: 'metre', exp: 1 },
						],
					},
				},
			}),
		);
		expect(result.issues).toEqual([]);
		expect(result.resolved.get('newton')).toMatchObject({
			factorText: '1',
			dimension: [1, 1, -2, 0, 0, 0, 0, 0],
		});
		expect(result.resolved.get('newton-kilometre')).toMatchObject({
			factorText: '1000',
			exact: true,
			dimension: [2, 1, -2, 0, 0, 0, 0, 0],
		});
	});

	it('still checks the compose sum when unitOf is non-empty', () => {
		const result = resolveUnits(
			syntheticCorpus({ ...BASE_UNITS, newton: { ...newton, unitOf: ['length'] } }),
		);
		expect(result.issues.map((entry) => entry.message)).toEqual([
			expect.stringContaining('compose dimension [1, 1, -2, 0, 0, 0, 0, 0] does not match'),
		]);
		expect(result.resolved.has('newton')).toBe(false);
	});

	it('terminates on a derivation cycle between magnitude-less units', () => {
		const result = resolveUnits(
			syntheticCorpus({
				...BASE_UNITS,
				ping: {
					name: { en: 'Ping' },
					symbol: { tex: 'p' },
					compose: { of: [{ unit: 'pong', exp: 1 }] },
				},
				pong: {
					name: { en: 'Pong' },
					symbol: { tex: 'q' },
					compose: { of: [{ unit: 'ping', exp: 1 }] },
				},
			}),
		);
		expect(result.issues.some((entry) => entry.message.includes('derivation cycle'))).toBe(true);
		expect(result.resolved.has('ping')).toBe(false);
		expect(result.resolved.has('pong')).toBe(false);
	});
});
