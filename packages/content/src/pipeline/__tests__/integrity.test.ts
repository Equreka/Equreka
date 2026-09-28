import { fileURLToPath } from 'node:url';
import { collectionSchemas } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { checkIntegrity, DERIVATION_FREE_UNITS, orphanMagnitudes } from '../integrity.js';
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

describe('quantity-kind hierarchy', () => {
	const kind = (dimension: Record<string, number>, kindOf?: string) => ({
		name: { en: 'kind' },
		symbol: { tex: 'k' },
		baseUnit: 'metre',
		dimension,
		...(kindOf === undefined ? {} : { kindOf }),
	});
	const metreOf = (...unitOf: string[]) => ({
		metre: { name: { en: 'Metre' }, symbol: { tex: 'm' }, unitOf },
	});

	it('accepts a same-dimension parent chain', () => {
		const corpus = corpusWith({
			magnitudes: {
				length: kind({ L: 1 }),
				distance: kind({ L: 1 }, 'length'),
				height: kind({ L: 1 }, 'distance'),
			},
			units: metreOf('length', 'distance', 'height'),
		});
		expect(messages(corpus)).toEqual([]);
	});

	it('rejects a parent of a different dimension', () => {
		const corpus = corpusWith({
			magnitudes: {
				length: kind({ L: 1 }),
				area: { ...kind({ L: 2 }, 'length'), baseUnit: 'square-metre' },
			},
			units: {
				...metreOf('length'),
				'square-metre': {
					name: { en: 'Square metre' },
					symbol: { tex: 'm^2' },
					unitOf: ['area'],
					compose: { of: [{ unit: 'metre', exp: 2 }] },
				},
			},
		});
		expect(messages(corpus)).toEqual([
			"magnitudes/area.yaml: kindOf 'length' has dimension [1, 0, 0, 0, 0, 0, 0, 0], this magnitude [2, 0, 0, 0, 0, 0, 0, 0]; a quantity kind specializes only a kind of identical dimension",
		]);
	});

	it('rejects an unknown parent and a self parent', () => {
		const corpus = corpusWith({
			magnitudes: { length: kind({ L: 1 }, 'ghost'), distance: kind({ L: 1 }, 'distance') },
			units: metreOf('length', 'distance'),
		});
		expect(messages(corpus)).toEqual([
			"magnitudes/length.yaml: kindOf: unknown magnitudes ref 'ghost'",
			'magnitudes/distance.yaml: a magnitude cannot be its own kindOf',
		]);
	});

	it('reports a kindOf cycle once, from its smallest member', () => {
		const corpus = corpusWith({
			magnitudes: {
				length: kind({ L: 1 }, 'height'),
				distance: kind({ L: 1 }, 'length'),
				height: kind({ L: 1 }, 'distance'),
				breadth: kind({ L: 1 }, 'height'),
			},
			units: metreOf('length', 'distance', 'height', 'breadth'),
		});
		expect(messages(corpus)).toEqual([
			'magnitudes/distance.yaml: kindOf forms a cycle: distance → length → height → distance',
		]);
	});

	it('authors kindOf only between same-dimension magnitudes in the real corpus', () => {
		const { corpus } = validateContent(loadContent(CONTENT_DIR));
		const edges = [...corpus.magnitudes]
			.filter(([, magnitude]) => magnitude.kindOf !== undefined)
			.map(([slug, magnitude]) => `${slug} → ${magnitude.kindOf}`)
			.sort();
		expect(edges).toEqual([
			'electric-potential-difference → electric-potential',
			'electromotive-force → electric-potential',
			'heat → energy',
			'radiant-flux → power',
			'weight → force',
			'work → energy',
		]);
	});
});

describe('path prerequisites', () => {
	const pathWith = (
		slug: string,
		prerequisites: string[],
		extra: Record<string, unknown> = {},
	) => ({
		[slug]: {
			name: { en: slug },
			level: 'intro',
			prerequisites,
			steps: [{ id: 'metre', kind: 'entry', ref: { collection: 'units', slug: 'metre' } }],
			...extra,
		},
	});

	it('accepts a resolved acyclic prerequisite chain', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: UNITS,
			paths: { ...pathWith('a', []), ...pathWith('b', ['a']), ...pathWith('c', ['a', 'b']) },
		});
		expect(messages(corpus)).toEqual([]);
	});

	it('rejects an unknown prerequisite and a self-prerequisite', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: UNITS,
			paths: { ...pathWith('a', ['ghost']), ...pathWith('b', ['b']) },
		});
		expect(messages(corpus)).toEqual([
			"paths/a.yaml: prerequisites: unknown paths ref 'ghost'",
			'paths/b.yaml: a path cannot be its own prerequisite',
		]);
	});

	it('reports each prerequisite cycle once, from its smallest member', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: UNITS,
			paths: { ...pathWith('a', ['b']), ...pathWith('b', ['c']), ...pathWith('c', ['a']) },
		});
		expect(messages(corpus)).toEqual(['paths/a.yaml: prerequisites form a cycle: a → b → c → a']);
	});

	it('rejects an entry step whose target does not exist', () => {
		const corpus = corpusWith({
			magnitudes: MAGNITUDES,
			units: UNITS,
			paths: pathWith('a', [], {
				steps: [{ id: 'furlong', kind: 'entry', ref: { collection: 'units', slug: 'furlong' } }],
			}),
		});
		expect(messages(corpus)).toEqual([
			"paths/a.yaml: steps.furlong.ref: unknown units ref 'furlong'",
		]);
	});
});

describe('orphan magnitudes', () => {
	const area = {
		name: { en: 'Area' },
		symbol: { tex: 'A' },
		baseUnit: 'square-metre',
		dimension: { L: '2' },
	};
	const squareMetre = {
		name: { en: 'Square metre' },
		symbol: { tex: 'm^{2}' },
		unitOf: ['area'],
		compose: { of: [{ unit: 'metre', exp: 2 }] },
	};
	const orphanFiles = (corpus: Corpus): string[] =>
		orphanMagnitudes(corpus).flatMap((entry) => {
			expect(entry).toMatchObject({ severity: 'warning', stage: 'integrity', file: '' });
			return [...entry.message.matchAll(/magnitudes\/[a-z-]+\.yaml/g)].map((match) => match[0]);
		});

	it('warns once, listing every magnitude only its own baseUnit lists', () => {
		const corpus = corpusWith({
			magnitudes: { ...MAGNITUDES, area },
			units: { ...UNITS, 'square-metre': squareMetre },
		});
		expect(orphanMagnitudes(corpus)).toHaveLength(1);
		expect(orphanFiles(corpus)).toEqual([
			'magnitudes/area.yaml',
			'magnitudes/dimensionless.yaml',
			'magnitudes/length.yaml',
		]);
	});

	it("counts a second unit, a constant's unit and an equation term as a use", () => {
		const corpus = corpusWith({
			magnitudes: { ...MAGNITUDES, area },
			units: {
				...UNITS,
				'square-metre': squareMetre,
				hectare: {
					name: { en: 'Hectare' },
					symbol: { tex: 'ha' },
					unitOf: ['area'],
					toBase: { factor: '10000' },
				},
			},
			constants: {
				one: { name: { en: 'One' }, symbol: { tex: '1' }, value: '1', unit: 'unitless' },
			},
			equations: {
				sample: {
					name: { en: 'Sample' },
					expression: '\\var{s}=\\var{s}',
					terms: { s: { kind: 'symbol', label: { en: 'Side' }, unit: 'metre' } },
				},
			},
		});
		expect(orphanMagnitudes(corpus)).toEqual([]);
	});

	it('is silenced by externalIds on a real quantity kind', () => {
		const corpus = corpusWith({
			magnitudes: {
				length: { ...MAGNITUDES.length, externalIds: { wikidata: 'Q36253' } },
				dimensionless: { ...MAGNITUDES.dimensionless, externalIds: { wikidata: 'Q1758831' } },
			},
			units: UNITS,
		});
		expect(orphanMagnitudes(corpus)).toEqual([]);
	});

	it('does not count a magnitude-less compound unit toward any magnitude', () => {
		const corpus = corpusWith({
			magnitudes: { length: { ...MAGNITUDES.length, externalIds: { wikidata: 'Q36253' } } },
			units: {
				metre: UNITS.metre,
				'square-metre': {
					name: { en: 'Square metre' },
					symbol: { tex: 'm^{2}' },
					compose: { of: [{ unit: 'metre', exp: 2 }] },
				},
			},
		});
		expect(checkIntegrity(corpus)).toEqual([]);
		expect(orphanMagnitudes(corpus)).toEqual([]);
	});

	it('flags only the synthetic magnitudes left in the real corpus, never reciprocal-amount', () => {
		const { corpus } = validateContent(loadContent(CONTENT_DIR));
		const files = orphanFiles(corpus);
		expect(files).not.toContain('magnitudes/reciprocal-amount.yaml');
		expect(files).not.toContain('magnitudes/luminous-efficacy.yaml');
		expect(files.every((file) => corpus.magnitudes.has(file.slice(11, -5)))).toBe(true);
	});
});
