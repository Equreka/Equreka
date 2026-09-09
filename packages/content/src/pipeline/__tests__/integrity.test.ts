import { fileURLToPath } from 'node:url';
import { collectionSchemas } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { checkIntegrity, DERIVATION_FREE_UNITS } from '../integrity.js';
import { loadContent } from '../load.js';
import { type Corpus, validateContent } from '../validate.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

function corpusWith(overrides: Partial<Record<keyof Corpus, Record<string, unknown>>>): Corpus {
	const corpus: Corpus = {
		categories: new Map(),
		magnitudes: new Map(),
		units: new Map(),
		prefixes: new Map(),
		constants: new Map(),
		variables: new Map(),
		equations: new Map(),
		paths: new Map(),
	};
	for (const [collection, entities] of Object.entries(overrides)) {
		const schema = collectionSchemas[collection as keyof typeof collectionSchemas];
		for (const [slug, data] of Object.entries(entities ?? {})) {
			(corpus[collection as keyof Corpus] as Map<string, unknown>).set(slug, schema.parse(data));
		}
	}
	return corpus;
}

const MAGNITUDES = {
	length: {
		name: { en: 'Length' },
		symbol: { tex: 'l' },
		baseUnit: 'metre',
		dimension: { L: 1 },
	},
	dimensionless: {
		name: { en: 'Dimensionless' },
		symbol: { tex: '1' },
		baseUnit: 'unitless',
		dimension: {},
	},
};

const UNITS = {
	metre: { name: { en: 'Metre' }, symbol: { tex: 'm' }, unitOf: ['length'] },
	unitless: { name: { en: 'Unitless' }, symbol: { tex: '1' }, unitOf: ['dimensionless'] },
};

const messages = (corpus: Corpus): string[] =>
	checkIntegrity(corpus).map((entry) => `${entry.file}: ${entry.message}`);

describe('checkIntegrity over the real corpus', () => {
	it('is clean', () => {
		const loaded = loadContent(CONTENT_DIR);
		const validated = validateContent(loaded);
		expect(validated.issues).toEqual([]);
		expect(checkIntegrity(validated.corpus)).toEqual([]);
	});

	it('leaves exactly the whitelisted anchors derivation-free', () => {
		const loaded = loadContent(CONTENT_DIR);
		const { corpus } = validateContent(loaded);
		const derivationFree = [...corpus.units]
			.filter(
				([, unit]) =>
					unit.toBase === undefined && unit.prefixOf === undefined && unit.compose === undefined,
			)
			.map(([slug]) => slug)
			.sort();
		expect(derivationFree).toEqual([...DERIVATION_FREE_UNITS].sort());
	});
});

describe('derivation whitelist', () => {
	it('rejects a derivation-free unit outside the SI anchor set', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: {
				...UNITS,
				furlong: { name: { en: 'Furlong' }, symbol: { tex: 'fur' }, unitOf: ['length'] },
			},
		});
		expect(messages(corpus)).toEqual([
			expect.stringMatching(/^units\/furlong\.yaml: has no derivation form/),
		]);
	});

	it('exempts nonConvertible units from the derivation requirement', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: {
				...UNITS,
				decibel: {
					name: { en: 'Decibel' },
					symbol: { tex: 'dB' },
					unitOf: ['dimensionless'],
					nonConvertible: true,
				},
			},
		});
		expect(messages(corpus)).toEqual([]);
	});
});

describe('nonConvertible isolation', () => {
	const decibel = {
		name: { en: 'Decibel' },
		symbol: { tex: 'dB' },
		unitOf: ['dimensionless'],
		nonConvertible: true,
	};

	it('rejects a nonConvertible unit as a compose operand', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: {
				...UNITS,
				decibel,
				'decibel-metre': {
					name: { en: 'Decibel metre' },
					symbol: { tex: 'dB·m' },
					unitOf: ['length'],
					compose: {
						of: [
							{ unit: 'decibel', exp: 1 },
							{ unit: 'metre', exp: 1 },
						],
					},
				},
			},
		});
		expect(messages(corpus)).toEqual([
			expect.stringContaining("compose references nonConvertible unit 'decibel'"),
		]);
	});

	it('rejects a nonConvertible unit as a prefixOf base', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			prefixes: { milli: { name: { en: 'Milli' }, symbol: { tex: 'm' }, value: '1e-3' } },
			units: {
				...UNITS,
				decibel,
				millidecibel: {
					name: { en: 'Millidecibel' },
					symbol: { tex: 'mdB' },
					unitOf: ['dimensionless'],
					prefixOf: { prefix: 'milli', base: 'decibel' },
				},
			},
		});
		expect(messages(corpus)).toEqual([
			expect.stringContaining("prefixOf.base 'decibel' is nonConvertible"),
		]);
	});

	it('rejects a nonConvertible unit as a magnitude baseUnit', () => {
		const corpus = corpusWith({
			magnitudes: {
				...MAGNITUDES,
				level: { name: { en: 'Level' }, symbol: { tex: 'L' }, baseUnit: 'decibel', dimension: {} },
			},
			units: { ...UNITS, decibel: { ...decibel, unitOf: ['dimensionless', 'level'] } },
		});
		expect(messages(corpus)).toEqual([
			expect.stringContaining("baseUnit 'decibel' is nonConvertible"),
		]);
	});
});

describe('equation terms', () => {
	const equationWith = (terms: Record<string, unknown>, expression: string): Corpus =>
		corpusWith({
			magnitudes: MAGNITUDES,
			units: UNITS,
			variables: {
				radius: { name: { en: 'Radius' }, symbol: { tex: 'r' }, defaultUnit: 'metre' },
			},
			equations: {
				sample: { name: { en: 'Sample' }, expression, terms },
			},
		});

	it('accepts \\var{} over both variable and symbol terms', () => {
		const corpus = equationWith(
			{
				r: { kind: 'variable', ref: 'radius' },
				s: { kind: 'symbol', label: { en: 'Side' }, unit: 'metre' },
			},
			'\\var{r}=\\var{s}',
		);
		expect(messages(corpus)).toEqual([]);
	});

	it('rejects \\mag{} over a symbol term', () => {
		const corpus = equationWith(
			{
				r: { kind: 'variable', ref: 'radius' },
				s: { kind: 'symbol', label: { en: 'Side' } },
			},
			'\\var{r}=\\mag{s}',
		);
		expect(messages(corpus)).toEqual([
			expect.stringContaining("annotates 's' as magnitude but terms declares symbol"),
		]);
	});

	it('checks the unit ref of a symbol term', () => {
		const corpus = equationWith(
			{
				r: { kind: 'variable', ref: 'radius' },
				s: { kind: 'symbol', label: { en: 'Side' }, unit: 'furlong' },
			},
			'\\var{r}=\\var{s}',
		);
		expect(messages(corpus)).toEqual([
			expect.stringContaining("terms.s.unit: unknown units ref 'furlong'"),
		]);
	});
});
