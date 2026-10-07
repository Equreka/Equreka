import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { magnitudeDimension } from '../dimension.js';
import {
	checkIntegrity,
	DERIVATION_FREE_UNITS,
	emptyBranches,
	orphanMagnitudes,
	termKeyIssues,
} from '../integrity.js';
import { loadContent } from '../load.js';
import { expandCorpus } from '../prefix-expansion.js';
import { type Corpus, validateContent } from '../validate.js';
import { corpusWith } from './corpus-with.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

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
		const expansion = expandCorpus(validated.corpus, loaded);
		expect(expansion.issues).toEqual([]);
		expect(checkIntegrity(expansion.corpus)).toEqual([]);
	});

	it('leaves exactly the whitelisted anchors derivation-free among convertible units', () => {
		const loaded = loadContent(CONTENT_DIR);
		const { corpus } = validateContent(loaded);
		const derivationFree = [...corpus.units]
			.filter(
				([, unit]) =>
					!unit.nonConvertible &&
					unit.toBase === undefined &&
					unit.prefixOf === undefined &&
					unit.compose === undefined,
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
				sample: { name: { en: 'Sample' }, level: 'intro', algebraic: false, expression, terms },
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

	it('reports term identity through checkIntegrity', () => {
		const corpus = equationWith(
			{
				sin: { kind: 'symbol', label: { en: 'Sine' } },
				s: { kind: 'symbol', label: { en: 'Side' } },
			},
			'\\var{sin}=\\var{s}',
		);
		expect(messages(corpus)).toEqual([
			expect.stringContaining("'sin', which is reserved for the solution function sin()"),
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

describe('solution coverage (ADR 0009)', () => {
	const ofEquation = (equation: Record<string, unknown>): string[] =>
		messages(
			corpusWith({
				magnitudes: MAGNITUDES,
				units: UNITS,
				constants: {
					pi: {
						name: { en: 'Pi' },
						symbol: { tex: '\\pi' },
						value: '3.14159',
						unit: 'unitless',
						irrational: true,
						truncated: true,
					},
				},
				equations: {
					sample: { name: { en: 'Sample' }, level: 'intro', ...equation },
				},
			}),
		).map((message) => message.replace(/^equations\/sample\.yaml: /, ''));
	const COMBINATIONS = {
		expression: '\\var{C}=\\frac{\\var{n}!}{\\var{k}!\\left(\\var{n}-\\var{k}\\right)!}',
		terms: {
			C: { kind: 'symbol', label: { en: 'Combinations' } },
			n: { kind: 'symbol', label: { en: 'Items' }, integer: true },
			k: { kind: 'symbol', label: { en: 'Chosen' }, integer: true },
		},
		solutions: { C: 'factorial(n) / (factorial(k) * factorial(n - k))' },
	};
	const CIRCLE = {
		expression: '\\var{A}=\\const{\\pi}\\var{r}^{2}',
		terms: {
			A: { kind: 'symbol', label: { en: 'Area' } },
			'\\pi': { kind: 'constant', ref: 'pi' },
			r: { kind: 'symbol', label: { en: 'Radius' } },
		},
	};

	it('requires at least one solution on an algebraic equation only', () => {
		expect(ofEquation(CIRCLE)).toEqual([
			'an algebraic equation authors at least one solution; mark notation no solver reads algebraic: false',
		]);
		expect(ofEquation({ ...CIRCLE, algebraic: false })).toEqual([]);
		expect(ofEquation({ ...CIRCLE, solutions: { A: 'pi * r^2' } })).toEqual([]);
	});

	it('covers every non-constant term when the calculator has no solveFor', () => {
		expect(
			ofEquation({ ...CIRCLE, solutions: { A: 'pi * r^2' }, calculator: { enabled: true } }),
		).toEqual([
			"the calculator may leave 'r' unknown but no solution is authored for it; author the solution or narrow calculator.solveFor",
		]);
		expect(
			ofEquation({
				...CIRCLE,
				solutions: { A: 'pi * r^2', r: 'sqrt(A / pi)' },
				calculator: { enabled: true },
			}),
		).toEqual([]);
		expect(ofEquation({ ...COMBINATIONS, calculator: { enabled: true } })).toEqual([
			"the calculator may leave 'n', 'k' unknown but no solution is authored for them; author the solution or narrow calculator.solveFor",
		]);
	});

	it('covers only calculator.solveFor when it is authored', () => {
		expect(ofEquation({ ...COMBINATIONS, calculator: { enabled: true, solveFor: ['C'] } })).toEqual(
			[],
		);
		expect(
			ofEquation({ ...COMBINATIONS, calculator: { enabled: true, solveFor: ['C', 'n'] } }),
		).toEqual([
			"the calculator may leave 'n' unknown but no solution is authored for it; author the solution or narrow calculator.solveFor",
		]);
	});

	it('rejects a solveFor that repeats, names no term, or names a constant', () => {
		expect(
			ofEquation({
				...CIRCLE,
				solutions: { A: 'pi * r^2' },
				calculator: { solveFor: ['A', 'A', 'x', '\\pi'] },
			}),
		).toEqual([
			'calculator.solveFor must not repeat a term',
			"calculator.solveFor 'x' is not a terms key",
			"calculator.solveFor '\\pi' is a constant term, which is never unknown",
		]);
	});

	it('checks description macros against the terms like the expression', () => {
		const solved = { ...CIRCLE, solutions: { A: 'pi * r^2', r: 'sqrt(A / pi)' } };
		expect(
			ofEquation({ ...solved, description: { en: 'Doubling $\\var{r}$ quadruples $\\var{A}$.' } }),
		).toEqual([]);
		expect(
			ofEquation({
				...solved,
				description: { en: 'For $\\var{a}\\var{x}^{2}$ and $\\mag{r}$.' },
			}),
		).toEqual([
			"description macro argument 'a' is not a terms key",
			"description macro argument 'x' is not a terms key",
			"description annotates 'r' as magnitude but terms declares symbol",
		]);
	});

	it('rejects a solution for a constant term', () => {
		expect(ofEquation({ ...CIRCLE, solutions: { A: 'pi * r^2', '\\pi': 'A / r^2' } })).toEqual([
			"solutions key '\\pi' is a constant term; constants are injected, never solved for",
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
		const edges = [...corpus.magnitudes].flatMap(([slug, magnitude]) =>
			magnitude.kindOf === undefined
				? []
				: [
						{
							edge: `${slug} → ${magnitude.kindOf}`,
							child: magnitude,
							parent: corpus.magnitudes.get(magnitude.kindOf),
						},
					],
		);
		expect(edges.map(({ edge }) => edge)).toEqual(
			expect.arrayContaining([
				'electric-potential-difference → electric-potential',
				'electromotive-force → electric-potential',
				'heat → energy',
				'radiant-flux → power',
				'weight → force',
				'work → energy',
			]),
		);
		for (const { edge, child, parent } of edges) {
			expect(parent, edge).toBeDefined();
			expect(parent === undefined ? undefined : magnitudeDimension(parent), edge).toEqual(
				magnitudeDimension(child),
			);
		}
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
					level: 'intro',
					algebraic: false,
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

describe('branches', () => {
	const CATEGORIES = {
		physics: { name: { en: 'Physics' }, order: 2 },
		chemistry: { name: { en: 'Chemistry' }, order: 3 },
	};
	const BRANCHES = {
		mechanics: { name: { en: 'Mechanics' }, category: 'physics', order: 0 },
		'amount-of-substance': { name: { en: 'Amount of substance' }, category: 'chemistry', order: 0 },
	};
	const metreIn = (categories: string[], branches: string[]) => ({
		...UNITS,
		metre: { ...UNITS.metre, categories, branches },
	});

	it("accepts a branch of one of the entry's own categories", () => {
		const corpus = corpusWith({
			categories: CATEGORIES,
			branches: BRANCHES,
			magnitudes: MAGNITUDES,
			units: metreIn(['physics'], ['mechanics']),
		});
		expect(messages(corpus)).toEqual([]);
	});

	it('rejects a branch whose category the entry does not list, instead of inferring it', () => {
		const corpus = corpusWith({
			categories: CATEGORIES,
			branches: BRANCHES,
			magnitudes: MAGNITUDES,
			units: metreIn(['physics'], ['mechanics', 'amount-of-substance']),
		});
		expect(messages(corpus)).toEqual([
			"units/metre.yaml: branches: 'amount-of-substance' belongs to category 'chemistry', which is not among this entry's categories [physics]; add 'chemistry' to categories or drop the branch",
		]);
	});

	it('rejects an unknown branch, a repeated branch and a branch of an unknown category', () => {
		const corpus = corpusWith({
			categories: CATEGORIES,
			branches: {
				...BRANCHES,
				alchemy: { name: { en: 'Alchemy' }, category: 'occultism', order: 0 },
			},
			magnitudes: MAGNITUDES,
			units: metreIn(['physics'], ['mechanics', 'mechanics', 'ghost']),
		});
		expect(messages(corpus)).toEqual([
			"branches/alchemy.yaml: category: unknown categories ref 'occultism'",
			"units/metre.yaml: branches: 'mechanics' is listed twice",
			"units/metre.yaml: branches: unknown branches ref 'ghost'",
		]);
	});

	it('warns once per branch that no entry lists', () => {
		const corpus = corpusWith({
			categories: CATEGORIES,
			branches: BRANCHES,
			magnitudes: MAGNITUDES,
			units: metreIn(['physics'], ['mechanics']),
		});
		expect(emptyBranches(corpus).map((entry) => `${entry.file}: ${entry.message}`)).toEqual([
			'branches/amount-of-substance.yaml: no entry lists this branch; assign entries to it or delete it',
		]);
	});

	it('leaves no authored branch empty in the real corpus', () => {
		const { corpus } = validateContent(loadContent(CONTENT_DIR));
		expect(corpus.branches.size).toBeGreaterThan(0);
		expect(emptyBranches(corpus)).toEqual([]);
	});
});

describe('termKeyIssues (ADR 0009)', () => {
	const symbol = (identifier?: string) => ({
		kind: 'symbol' as const,
		...(identifier === undefined ? {} : { identifier }),
	});
	const keyMessages = (terms: Parameters<typeof termKeyIssues>[1]): string[] =>
		termKeyIssues('equations/sample.yaml', terms).map((entry) => entry.message);

	it('accepts any carriable TeX key whose identifier is valid and unique', () => {
		expect(
			keyMessages({
				KE: symbol(),
				'v_{0}': symbol(),
				'\\Delta x': symbol(),
				'\\hbar': symbol(),
				'[\\mathrm{H}^{+}]': symbol('cH'),
				'\\pi': { kind: 'constant', ref: 'pi' },
			}),
		).toEqual([]);
	});

	it('rejects identifiers that collide with a grammar function, current or reserved', () => {
		expect(keyMessages({ sin: symbol(), x: symbol('asinh'), y: symbol('factorial') })).toEqual([
			expect.stringContaining('reserved for the solution function sin()'),
			expect.stringContaining('reserved for the solution function asinh()'),
			expect.stringContaining('reserved for the solution function factorial()'),
		]);
	});

	it('rejects Object.prototype names as identifiers and as keys', () => {
		expect(keyMessages({ c: symbol('constructor') })).toEqual([
			expect.stringContaining(
				"identifier 'constructor', which is an Object.prototype property name",
			),
		]);
		expect(keyMessages({ toString: symbol('s') })).toEqual([
			"term key 'toString' is an Object.prototype property name",
		]);
	});

	it('reserves pi for the constant term whose ref is pi', () => {
		expect(keyMessages({ '\\pi': symbol() })).toEqual([
			expect.stringContaining('reads as the constant pi'),
		]);
		expect(keyMessages({ p: { kind: 'constant', ref: 'golden-ratio', identifier: 'pi' } })).toEqual(
			[expect.stringContaining('reads as the constant pi')],
		);
	});

	it('rejects duplicate effective identifiers', () => {
		expect(keyMessages({ v_0: symbol(), 'v_{0}': symbol() })).toEqual([
			expect.stringContaining("term keys 'v_0' and 'v_{0}' share identifier 'v_0'"),
		]);
		expect(keyMessages({ a: symbol(), b: symbol('a') })).toEqual([
			expect.stringContaining("share identifier 'a'"),
		]);
	});

	it('rejects a key whose derived identifier is invalid', () => {
		expect(keyMessages({ '2x': symbol(), '\\{\\}': symbol() })).toEqual([
			expect.stringContaining(
				"term key '2x' derives identifier '2x', which is not a valid identifier",
			),
			expect.stringContaining("derives identifier '', which is not a valid identifier"),
		]);
	});

	it('rejects untrimmed, $-bearing, multi-line and deeply nested keys', () => {
		expect(keyMessages({ ' x': symbol('x') })).toEqual([
			expect.stringContaining('no leading or trailing whitespace'),
		]);
		expect(keyMessages({ $x$: symbol('x') })).toEqual([expect.stringContaining("contain '$'")]);
		expect(keyMessages({ 'a\nb': symbol('ab') })).toEqual([expect.stringContaining('line break')]);
		expect(keyMessages({ 'x_{a_{b}}': symbol('x') })).toEqual([
			expect.stringContaining('deeper than one level'),
		]);
		expect(keyMessages({ 'x}': symbol('x') })).toEqual([
			expect.stringContaining('unbalanced braces'),
		]);
	});
});
