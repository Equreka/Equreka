import { fileURLToPath } from 'node:url';
import { collectionSchemas } from '@equreka/schema';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent } from '../load.js';
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
	corpus = validated.corpus;
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

	it('accepts compose-form base units (metre-per-second, reciprocal-mole)', () => {
		expect(resolution.resolved.get('metre-per-second')).toMatchObject({
			factorText: '1',
			dimension: [1, 0, -1, 0, 0, 0, 0, 0],
		});
		expect(resolution.resolved.get('reciprocal-mole')).toMatchObject({
			factorText: '1',
			dimension: [0, 0, 0, 0, 0, -1, 0, 0],
		});
	});
});

describe('resolveUnits dimension verification', () => {
	it('rejects a compose whose dimension sum contradicts the magnitude', () => {
		const synthetic: Corpus = {
			categories: new Map(),
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
			]),
			units: new Map([
				[
					'joule',
					collectionSchemas.units.parse({
						name: { en: 'Joule' },
						symbol: { tex: 'J' },
						unitOf: ['energy'],
					}),
				],
				[
					'metre',
					collectionSchemas.units.parse({
						name: { en: 'Metre' },
						symbol: { tex: 'm' },
						unitOf: ['length'],
					}),
				],
				[
					'bogus-energy',
					collectionSchemas.units.parse({
						name: { en: 'Bogus' },
						symbol: { tex: 'b' },
						unitOf: ['energy'],
						compose: [{ unit: 'metre', exp: 1 }],
					}),
				],
			]),
			prefixes: new Map(),
			constants: new Map(),
			variables: new Map(),
			equations: new Map(),
			paths: new Map(),
		};
		const result = resolveUnits(synthetic);
		expect(
			result.issues.some(
				(entry) =>
					entry.file === 'units/bogus-energy.yaml' && entry.message.includes('compose dimension'),
			),
		).toBe(true);
		expect(result.resolved.has('bogus-energy')).toBe(false);
	});
});
