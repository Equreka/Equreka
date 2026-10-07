import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COLLECTIONS, engineSlice, SCHEMA_VERSION } from '@equreka/schema';
import MiniSearch from 'minisearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	ARTIFACT_BUDGETS,
	artifactBudgetPatterns,
	BUDGET_WARN_RATIO,
	MOBILE_BUNDLE_BUDGET_BYTES,
} from '../artifact-budgets.js';
import { type CompileReport, compileContent } from '../pipeline/compile.js';
import { budgetIssue, mobileBundledBytes } from '../pipeline/emit.js';
import { buildMathArtifact } from '../pipeline/math-artifact.js';
import {
	canonicalTex,
	hydrateMathBody,
	isLeanMathBody,
	MATH_SHARD_COUNT,
	type MathAtlas,
	type MathBody,
	type MathBodyShard,
	mathBodyGlyphs,
	mathBodySvg,
	mathShardName,
	mathShardOf,
	splitRichText,
} from '../rich-text.js';
import { type SearchDocument, searchOptions } from '../search-options.js';
import prefixedBaseline from './fixtures/prefixed-units-baseline.json';

/**
 * Categories whose entries must sit in a sub-discipline; universal entries
 * may stay branchless.
 */
const BRANCHED_CATEGORIES: readonly string[] = ['physics', 'mathematics', 'chemistry'];

/**
 * Exceptions to the branch rule, as `collection/slug`.
 */
const BRANCHLESS_ALLOWLIST: readonly string[] = [];

const CUSTOMARY_SYSTEMS: readonly string[] = ['imperial', 'uscs', 'cgs', 'other'];

/**
 * Frozen: the customary `toBase` units a human has reviewed. New units in
 * these systems are AI-authored and enter as draft; this list keeps the
 * existing human-reviewed provenance from regressing.
 */
const REVIEWED_CUSTOMARY_UNITS: readonly string[] = [
	'century',
	'day',
	'decade',
	'delisle',
	'erg',
	'fahrenheit',
	'foot',
	'foot-pound',
	'hour',
	'imperial-gallon',
	'imperial-pint',
	'imperial-quart',
	'inch',
	'litre',
	'long-ton',
	'mile',
	'minute',
	'month',
	'nautical-mile',
	'newton-degree',
	'ounce',
	'pound',
	'rankine',
	'reaumur',
	'romer',
	'short-ton',
	'stone',
	'tonne',
	'us-gallon',
	'us-pint',
	'us-quart',
	'week',
	'yard',
	'year',
];

let outDir: string;
let coldOutDir: string;
let report: CompileReport;
let coldReport: CompileReport;

/**
 * Two builds: one against the derivation cache (whatever state it is in)
 * and one with caching disabled, so the byte-identity assertion covers the
 * cold-render and cache-hit paths of every artifact at once.
 */
async function buildCachedAndCold(): Promise<void> {
	outDir = mkdtempSync(join(tmpdir(), 'equreka-content-'));
	coldOutDir = mkdtempSync(join(tmpdir(), 'equreka-content-cold-'));
	report = await compileContent('build', { outDir });
	coldReport = await compileContent('build', { outDir: coldOutDir, cacheDir: null });
}

beforeAll(buildCachedAndCold, 180_000);

afterAll(() => {
	rmSync(outDir, { recursive: true, force: true });
	rmSync(coldOutDir, { recursive: true, force: true });
});

function readJson<T>(...segments: string[]): T {
	return JSON.parse(readFileSync(join(outDir, ...segments), 'utf8')) as T;
}

function walk(dir: string): string[] {
	const files: string[] = [];
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			files.push(...walk(path));
		} else {
			files.push(path);
		}
	}
	return files;
}

function digest(path: string): string {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('build over the real corpus', () => {
	it('exits clean', () => {
		expect(report.issues.filter((entry) => entry.severity === 'error')).toEqual([]);
		expect(report.ok).toBe(true);
	});

	it('emits an engine.json that satisfies the engineSlice contract', () => {
		const raw = readJson('engine.json');
		const parsed = engineSlice.parse(raw);
		expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
		expect(parsed.contentHash).toBe(report.contentHash);
		const convertible = [...report.corpus.units.values()].filter((unit) => !unit.nonConvertible);
		expect(Object.keys(parsed.units).length).toBe(convertible.length);
		expect(parsed.units.fahrenheit).toMatchObject({ affine: true, exact: false });
		expect(parsed.units.joule).toMatchObject({ factor: '1', dimension: [2, 1, -2, 0, 0, 0, 0, 0] });
		expect(parsed.units.unit).toBeUndefined();
		expect(parsed.magnitudes.entropy).toMatchObject({ baseUnit: 'joule-per-kelvin' });
		expect(parsed.magnitudes.capacitance?.dimension).toEqual([-2, -1, 4, 2, 0, 0, 0, 0]);
		expect(parsed.equations['mass-energy-equivalence']).toMatchObject({
			calculatorEnabled: true,
			solvable: ['E', 'm'],
		});
		expect(parsed.equations['area-circle']?.terms['\\pi']).toMatchObject({
			kind: 'constant',
			ref: 'pi',
			identifier: 'pi',
		});
		expect(parsed.equations['area-circle']?.terms.r).toEqual({
			kind: 'variable',
			ref: 'radius',
			identifier: 'r',
		});
		const symbolTerms = [...report.corpus.equations].flatMap(([slug, equation]) =>
			Object.entries(equation.terms).flatMap(([key, term]) =>
				term.kind === 'symbol' ? [{ slug, key, term }] : [],
			),
		);
		expect(symbolTerms.some(({ term }) => term.unit === undefined)).toBe(true);
		expect(symbolTerms.some(({ term }) => term.unit !== undefined)).toBe(true);
		for (const { slug, key, term } of symbolTerms) {
			const compiled = parsed.equations[slug]?.terms[key];
			expect(compiled, `${slug}/${key}`).toMatchObject({ kind: 'symbol', label: term.label });
			expect(compiled?.unit, `${slug}/${key}`).toBe(term.unit);
			expect(compiled?.ref, `${slug}/${key}`).toBeUndefined();
		}
		expect(parsed.constants.pi).toMatchObject({ exact: false, irrational: true });
	});

	it('emits a magnitude-less compound unit with an empty magnitudes list', () => {
		const parsed = engineSlice.parse(readJson('engine.json'));
		expect(parsed.units['reciprocal-mole']).toMatchObject({
			magnitudes: [],
			factor: '1',
			exact: true,
			dimension: [0, 0, 0, 0, 0, -1, 0, 0],
		});
		expect(parsed.magnitudes['reciprocal-amount']).toBeUndefined();
		expect(parsed.constants['avogadro-constant']?.unit).toBe('reciprocal-mole');
	});

	it('carries editorial status and toBase provenance in the units presentation slice', () => {
		const units = readJson<
			Record<
				string,
				{
					status: string;
					system: string;
					toBase?: { source?: { name: string; ref?: string; url?: string } };
				}
			>
		>('presentation', 'units.json');
		expect(units.stone).toMatchObject({
			status: 'reviewed',
			toBase: {
				source: {
					name: 'Weights and Measures Act 1985 (UK)',
					ref: 'Schedule 1: stone = 14 pounds',
				},
			},
		});
		expect(units.foot?.toBase?.source).toEqual({
			name: 'NIST SP 811',
			url: 'https://www.nist.gov/pml/special-publication-811',
			ref: 'B.8: foot (ft)',
		});
		expect(units.year?.toBase?.source?.name).toBe('convention');
		expect(units.metre?.status).toBe('draft');
		const customary = Object.entries(units).filter(
			([, unit]) => unit.toBase !== undefined && CUSTOMARY_SYSTEMS.includes(unit.system),
		);
		expect(customary.length).toBeGreaterThan(0);
		for (const [slug, unit] of customary) {
			expect(unit.toBase?.source?.name, slug).toBeTruthy();
		}
		for (const slug of REVIEWED_CUSTOMARY_UNITS) {
			const unit = units[slug];
			expect(CUSTOMARY_SYSTEMS, slug).toContain(unit?.system);
			expect(unit?.toBase?.source?.name, slug).toBeTruthy();
			expect(unit?.status, slug).toBe('reviewed');
		}
		const magnitudes = readJson<Record<string, { status: string; externalIds?: unknown }>>(
			'presentation',
			'magnitudes.json',
		);
		expect(magnitudes.length?.status).toBe('draft');
		expect(magnitudes.length?.externalIds).toEqual({
			wikidata: 'Q36253',
			qudt: 'http://qudt.org/vocab/quantitykind/Length',
		});
		expect(magnitudes.work?.externalIds).not.toEqual(magnitudes.energy?.externalIds);
	});

	it('carries verified externalIds on category and branch presentation slices', () => {
		const categories = readJson<Record<string, { externalIds?: { wikidata?: string } }>>(
			'presentation',
			'categories.json',
		);
		const branches = readJson<Record<string, { externalIds?: { wikidata?: string } }>>(
			'presentation',
			'branches.json',
		);
		expect(categories.physics?.externalIds?.wikidata).toBe('Q413');
		expect(categories.universal?.externalIds).toBeUndefined();
		expect(branches.mechanics?.externalIds?.wikidata).toBe('Q41217');
		expect(branches.measurement?.externalIds?.wikidata).toBe('Q394');
	});

	it('carries textSources on every presentation record, crediting only described entries', () => {
		for (const collection of COLLECTIONS) {
			const records = readJson<
				Record<string, { textSources?: { url: string }[]; description?: unknown }>
			>('presentation', `${collection}.json`);
			for (const [slug, record] of Object.entries(records)) {
				expect(Array.isArray(record.textSources), `${collection}/${slug}`).toBe(true);
				if ((record.textSources ?? []).length > 0) {
					expect(record.description, `${collection}/${slug} credits text it lacks`).toBeDefined();
				}
			}
		}
		const engine = readFileSync(join(outDir, 'engine.json'), 'utf8');
		expect(engine).not.toContain('textSources');
	});

	it('derives related units and canonical expression TeX into the equations presentation slice', () => {
		const equations = readJson<
			Record<
				string,
				{ relatedUnits: string[]; expression: string; expressionTex: string; units?: unknown }
			>
		>('presentation', 'equations.json');
		expect(equations['area-circle']?.relatedUnits).toEqual(['square-metre', 'unitless', 'metre']);
		expect(equations['area-square']?.relatedUnits).toEqual(['square-metre', 'metre']);
		expect(equations['mass-energy-equivalence']?.relatedUnits).toEqual([
			'joule',
			'kilogram',
			'metre-per-second',
		]);
		const unitless = [...report.corpus.equations].filter(([, equation]) =>
			Object.values(equation.terms).every(
				(term) => term.kind === 'symbol' && term.unit === undefined,
			),
		);
		expect(unitless.length).toBeGreaterThan(0);
		for (const [slug] of unitless) {
			expect(equations[slug]?.relatedUnits, slug).toEqual([]);
		}
		expect(equations['area-circle']?.units).toBeUndefined();
		const massEnergy = equations['mass-energy-equivalence'];
		expect(massEnergy?.expression).toMatch(/\\(mag|const|var)\{/);
		expect(massEnergy?.expressionTex).not.toMatch(/\\(mag|const|var)\{/);
		expect(massEnergy?.expressionTex).toBe('{E}={m}{c}^{2}');
	});

	it('resolves entry-step targets into the paths presentation slice', () => {
		const paths = readJson<
			Record<
				string,
				{
					level: string;
					prerequisites: string[];
					estimatedMinutes?: number;
					steps: {
						id: string;
						kind: string;
						target?: { name: { en: string }; symbolText: string };
					}[];
				}
			>
		>('presentation', 'paths.json');
		expect(Object.keys(paths).sort()).toEqual([...report.corpus.paths.keys()].sort());
		const si = paths['si-base-units'];
		expect(si).toMatchObject({ level: 'intro', prerequisites: [], estimatedMinutes: 15 });
		expect(si?.steps.find((step) => step.id === 'kilogram')).toMatchObject({
			kind: 'entry',
			target: { name: { en: 'Kilogram' }, symbolText: 'kg' },
		});
		expect(si?.steps.find((step) => step.id === 'intro')?.target).toBeUndefined();
		expect(paths['temperature-scales']?.prerequisites).toEqual(['si-base-units']);
		const equationStep = paths['energy-work-heat']?.steps.find((step) => step.id === 'mass-energy');
		expect(equationStep?.target).toEqual({
			name: { en: 'Mass-energy equivalence', es: 'Equivalencia entre masa y energía' },
			symbolText: '',
		});
		const piStep = paths['geometry-of-circles-and-triangles']?.steps.find((s) => s.id === 'pi');
		expect(piStep?.target?.symbolText).toBe('pi');
	});

	it('indexes paths for search and the catalog-lite lane', () => {
		const catalog = readJson<
			{ collection: string; slug: string; name: string; aliases: string[] }[]
		>('search', 'catalog-lite.es.json');
		const row = catalog.find(
			(entry) => entry.collection === 'paths' && entry.slug === 'si-base-units',
		);
		expect(row).toMatchObject({ name: 'Las siete unidades básicas del SI' });
		expect(row?.aliases).toContain('unidades base');
	});

	it('ships prose raw, hard line breaks intact, with no pre-split segments', () => {
		for (const collection of COLLECTIONS) {
			const shipped = readJson<Record<string, { description?: { en: string } }>>(
				'presentation',
				`${collection}.json`,
			);
			const authored: ReadonlyMap<string, { description?: { en: string } | undefined }> =
				report.corpus[collection];
			for (const [slug, entry] of authored) {
				expect(shipped[slug]?.description?.en, `${collection}/${slug}`).toBe(entry.description?.en);
			}
		}
		for (const collection of COLLECTIONS) {
			const text = readFileSync(join(outDir, 'presentation', `${collection}.json`), 'utf8');
			expect(text, collection).not.toMatch(/"(description|note|body|prompt|answer)Segments"/);
		}
	});

	it('indexes the lead of each description for search, never the paragraphs after it', () => {
		const index = MiniSearch.loadJSON<SearchDocument>(
			readFileSync(join(outDir, 'search', 'en.json'), 'utf8'),
			searchOptions,
		);
		const idsOf = (word: string): string[] =>
			index.search(word, { fields: ['description'] }).map((hit) => String(hit.id));
		expect(idsOf('squared')).toContain('equations:mass-energy-equivalence');
		expect(idsOf('because')).not.toContain('equations:mass-energy-equivalence');
		expect(idsOf('navigation')).toContain('units:nautical-mile');
		expect(idsOf('abbreviation')).not.toContain('units:nautical-mile');
	});

	it('carries authored constant approximations into the presentation slice only', () => {
		const constants = readJson<Record<string, { approximations?: string[] }>>(
			'presentation',
			'constants.json',
		);
		expect(Object.keys(constants).sort()).toEqual([...report.corpus.constants.keys()].sort());
		for (const [slug, constant] of report.corpus.constants) {
			expect(constants[slug]?.approximations, slug).toEqual(constant.approximations);
		}
		expect(constants['speed-of-light']?.approximations).toEqual(['3e+8']);
		expect(constants.pi?.approximations).toEqual(['3.1416']);
		const engine = readJson<{ constants: Record<string, Record<string, unknown>> }>('engine.json');
		for (const constant of Object.values(engine.constants)) {
			expect(constant).not.toHaveProperty('approximations');
		}
	});

	it('files every physics, mathematics and chemistry entry under at least one branch', () => {
		const branchless: string[] = [];
		for (const collection of COLLECTIONS) {
			const slice = readJson<Record<string, { categories?: string[]; branches?: string[] }>>(
				'presentation',
				`${collection}.json`,
			);
			for (const [slug, entity] of Object.entries(slice)) {
				const disciplined = (entity.categories ?? []).some((category) =>
					BRANCHED_CATEGORIES.includes(category),
				);
				if (disciplined && (entity.branches ?? []).length === 0) {
					branchless.push(`${collection}/${slug}`);
				}
			}
		}
		expect(branchless.filter((key) => !BRANCHLESS_ALLOWLIST.includes(key))).toEqual([]);
	});

	it('emits branches ordered within their category and indexes their names on member entries', () => {
		const branches = readJson<
			Record<string, { category: string; order: number; name: { en: string; es?: string } }>
		>('presentation', 'branches.json');
		expect(branches.thermodynamics).toMatchObject({
			category: 'physics',
			name: { en: 'Thermodynamics', es: 'Termodinámica' },
		});
		const physicsOrder = Object.entries(branches)
			.filter(([, branch]) => branch.category === 'physics')
			.sort(([, a], [, b]) => a.order - b.order)
			.map(([slug]) => slug);
		expect(physicsOrder[0]).toBe('mechanics');
		const units = readJson<Record<string, { branches: string[] }>>('presentation', 'units.json');
		expect(units['joule-per-kelvin']?.branches).toEqual(['thermodynamics']);
		const catalog = readJson<{ collection: string; slug: string; branches: string[] }[]>(
			'search',
			'catalog-lite.es.json',
		);
		expect(
			catalog.find((row) => row.collection === 'units' && row.slug === 'joule-per-kelvin'),
		).toMatchObject({ branches: ['Termodinámica'] });
		expect(
			catalog.find((row) => row.collection === 'branches' && row.slug === 'thermodynamics'),
		).toMatchObject({ branches: [] });
	});

	it('badges catalog-lite rows with their categories: own, parent for branches, none for categories', () => {
		const catalog = readJson<{ collection: string; slug: string; categories: string[] }[]>(
			'search',
			'catalog-lite.en.json',
		);
		const categoriesOf = (collection: string, slug: string): string[] | undefined =>
			catalog.find((row) => row.collection === collection && row.slug === slug)?.categories;
		expect(categoriesOf('units', 'joule-per-kelvin')).toEqual(['physics']);
		expect(categoriesOf('branches', 'thermodynamics')).toEqual(['physics']);
		expect(categoriesOf('categories', 'physics')).toEqual([]);
		expect(catalog.every((row) => Array.isArray(row.categories))).toBe(true);
	});

	it('emits a draft-07 authoring JSON Schema per collection for editors', () => {
		for (const collection of COLLECTIONS) {
			const path = join(outDir, 'schemas', `${collection}.schema.json`);
			expect(existsSync(path), collection).toBe(true);
			const schema = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
			expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(schema.type).toBe('object');
		}
		const units = readJson<{
			properties: Record<string, { properties?: Record<string, unknown> }>;
		}>('schemas', 'units.schema.json');
		expect(units.properties.compose?.properties).toHaveProperty('factor');
		expect(units.properties.compose?.properties).toHaveProperty('of');
		expect(units.properties).toHaveProperty('nonConvertible');
	});

	it('emits a strict draft-07 sidecar JSON Schema per collection for translators', () => {
		for (const collection of COLLECTIONS) {
			const path = join(outDir, 'schemas', `${collection}.locale.schema.json`);
			expect(existsSync(path), collection).toBe(true);
			const schema = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
			expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(schema.additionalProperties).toBe(false);
			expect(schema.properties).toHaveProperty('name');
		}
		const paths = readJson<{
			properties: {
				steps: { propertyNames?: unknown; additionalProperties: { properties: object } };
			};
		}>('schemas', 'paths.locale.schema.json');
		expect(paths.properties.steps.propertyNames).toBeDefined();
		expect(Object.keys(paths.properties.steps.additionalProperties.properties).sort()).toEqual([
			'answer',
			'body',
			'note',
			'prompt',
		]);
	});

	it('classifies every emitted file under exactly one budget and stays inside it', () => {
		const files = walk(outDir)
			.map((path) => relative(outDir, path).split(sep).join('/'))
			.sort();
		expect(report.artifacts.map((artifact) => artifact.relPath).sort()).toEqual(files);
		for (const artifact of report.artifacts) {
			expect(artifactBudgetPatterns(artifact.relPath), artifact.relPath).toEqual([
				artifact.pattern,
			]);
			expect(artifact.budget, artifact.relPath).toBe(ARTIFACT_BUDGETS[artifact.pattern ?? '']);
			expect(artifact.bytes, artifact.relPath).toBe(statSync(join(outDir, artifact.relPath)).size);
			expect(artifact.gzipBytes, artifact.relPath).toBeGreaterThan(0);
			const maxBytes = artifact.budget?.maxBytes ?? null;
			if (maxBytes !== null) {
				expect(artifact.bytes, artifact.relPath).toBeLessThanOrEqual(maxBytes);
			}
		}
		expect(mobileBundledBytes(report.artifacts)).toBeLessThanOrEqual(MOBILE_BUNDLE_BUDGET_BYTES);
	});

	it('emits shipped JSON compact and editor schemas indented', () => {
		const json = report.artifacts.filter((artifact) => artifact.relPath.endsWith('.json'));
		expect(json.length).toBeGreaterThan(20);
		for (const artifact of json) {
			const text = readFileSync(join(outDir, artifact.relPath), 'utf8');
			expect(text.endsWith('}\n') || text.endsWith(']\n'), artifact.relPath).toBe(true);
			if (artifact.relPath.startsWith('schemas/')) {
				expect(text, artifact.relPath).toContain('\n\t');
			} else {
				expect(text.trimEnd(), artifact.relPath).not.toContain('\n');
			}
		}
	});

	it('emits deterministic meta with a null timestamp, counting every presentation entry', () => {
		const meta = readJson<{ counts: Record<string, number> }>('meta.json');
		expect(meta).toEqual({
			schemaVersion: SCHEMA_VERSION,
			contentHash: report.contentHash,
			counts: report.counts,
			generatedAt: null,
		});
		for (const collection of COLLECTIONS) {
			const entries = Object.keys(readJson<object>('presentation', `${collection}.json`)).length;
			expect(entries, collection).toBe(report.corpus[collection].size);
			expect(meta.counts[collection], collection).toBe(entries);
		}
	});

	it('codegens executable solution functions with null domain guards', async () => {
		const module = (await import(pathToFileURL(join(outDir, 'solutions.js')).href)) as {
			solutions: Record<string, Record<string, (values: Record<string, number>) => number | null>>;
		};
		const pythagorean = module.solutions['pythagorean-theorem'];
		expect(pythagorean?.a?.({ b: 4, c: 5 })).toBeCloseTo(3, 12);
		expect(pythagorean?.a?.({ b: 5, c: 4 })).toBeNull();
		const massEnergy = module.solutions['mass-energy-equivalence'];
		expect(massEnergy?.E?.({ m: 1, c: 299792458 })).toBeCloseTo(8.987551787368176e16, 4);
	});

	it('codegens a solution for every term a calculator may leave unknown', async () => {
		const module = (await import(pathToFileURL(join(outDir, 'solutions.js')).href)) as {
			solutions: Record<string, Record<string, unknown>>;
		};
		const parsed = engineSlice.parse(readJson('engine.json'));
		const enabled = Object.values(parsed.equations).filter((meta) => meta.calculatorEnabled);
		expect(enabled.map((meta) => meta.slug)).toContain('area-circle');
		for (const meta of enabled) {
			const inputs = Object.entries(meta.terms)
				.filter(([, term]) => term.kind !== 'constant')
				.map(([key]) => key);
			expect(meta.solvable.length, meta.slug).toBeGreaterThan(0);
			for (const key of meta.solvable) {
				expect(inputs, `${meta.slug}.${key}`).toContain(key);
				expect(typeof module.solutions[meta.slug]?.[key], `${meta.slug}.${key}`).toBe('function');
			}
		}
		expect(parsed.equations['area-circle']?.solvable).toEqual(['A', 'r']);
	});

	it('codegens one module per solved equation carrying the aggregate functions', async () => {
		type TermFunctions = Record<string, (values: Record<string, number>) => unknown>;
		const aggregate = (await import(pathToFileURL(join(outDir, 'solutions.js')).href)) as {
			solutions: Record<string, TermFunctions>;
		};
		const modules = readdirSync(join(outDir, 'solutions'))
			.filter((name) => name.endsWith('.js') && name !== 'index.js')
			.map((name) => name.slice(0, -'.js'.length))
			.sort();
		expect(modules).toEqual(Object.keys(aggregate.solutions).sort());
		const normalized = (fn: unknown): string => String(fn).replace(/\s+/g, ' ');
		for (const slug of modules) {
			const module = (await import(
				pathToFileURL(join(outDir, 'solutions', `${slug}.js`)).href
			)) as {
				default: TermFunctions;
			};
			const expected = aggregate.solutions[slug] ?? {};
			expect(Object.keys(module.default), slug).toEqual(Object.keys(expected));
			for (const [key, fn] of Object.entries(module.default)) {
				expect(normalized(fn), `${slug}.${key}`).toBe(normalized(expected[key]));
			}
		}
	});

	it('loads one equation module by slug through literal import() specifiers', async () => {
		const loaderPath = join(outDir, 'solutions', 'index.js');
		const loader = (await import(pathToFileURL(loaderPath).href)) as {
			loadSolutions: (slug: string) => Promise<Record<string, unknown> | undefined>;
		};
		const source = readFileSync(loaderPath, 'utf8');
		const specifiers = [...source.matchAll(/import\("\.\/([a-z0-9-]+)\.js"\)/g)].map(
			(match) => match[1],
		);
		const modules = readdirSync(join(outDir, 'solutions'))
			.filter((name) => name.endsWith('.js') && name !== 'index.js')
			.map((name) => name.slice(0, -'.js'.length))
			.sort();
		expect(specifiers).toEqual(modules);
		expect(source).not.toMatch(/import\((?!")/);
		const pythagorean = await loader.loadSolutions('pythagorean-theorem');
		expect(Object.keys(pythagorean ?? {}).sort()).toEqual(['a', 'b', 'c']);
		for (const slug of ['no-such-equation', 'constructor', '__proto__', 'index']) {
			expect(await loader.loadSolutions(slug), slug).toBeUndefined();
		}
	});

	it('carries level, algebraic and truncated into the presentation slices only', () => {
		const equations = readJson<Record<string, { level?: string; algebraic?: boolean }>>(
			'presentation',
			'equations.json',
		);
		for (const [slug, equation] of report.corpus.equations) {
			expect(equations[slug], slug).toMatchObject({
				level: equation.level,
				algebraic: equation.algebraic,
			});
		}
		const constants = readJson<Record<string, { truncated?: boolean; irrational?: boolean }>>(
			'presentation',
			'constants.json',
		);
		expect(constants.pi?.truncated).toBe(true);
		for (const [slug, constant] of Object.entries(constants)) {
			expect(!constant.irrational || constant.truncated, slug).toBe(true);
		}
		const engine = readJson<{
			constants: Record<string, Record<string, unknown>>;
			equations: Record<string, Record<string, unknown>>;
		}>('engine.json');
		for (const constant of Object.values(engine.constants)) {
			expect(constant).not.toHaveProperty('truncated');
		}
		for (const equation of Object.values(engine.equations)) {
			expect(equation).not.toHaveProperty('level');
		}
	});
});

describe('generated prefixed units (ADR 0007)', () => {
	it('resolve the 13 formerly hand-authored prefixed slugs to their pre-expansion factors', () => {
		const units = engineSlice.parse(readJson('engine.json')).units;
		for (const [slug, expected] of Object.entries(prefixedBaseline)) {
			expect(units[slug], slug).toMatchObject(expected);
		}
	});

	it('emit every generated unit in the engine slice, presentation, search and catalog', () => {
		expect(report.generatedUnits.size).toBeGreaterThan(100);
		const units = engineSlice.parse(readJson('engine.json')).units;
		const presentation = readJson<Record<string, { generated?: boolean }>>(
			'presentation',
			'units.json',
		);
		const catalog = readJson<{ collection: string; slug: string }[]>(
			'search',
			'catalog-lite.en.json',
		);
		const catalogUnits = new Set(
			catalog.filter((entry) => entry.collection === 'units').map((entry) => entry.slug),
		);
		for (const slug of report.generatedUnits) {
			expect(units[slug], slug).toBeDefined();
			expect(presentation[slug]?.generated, slug).toBe(true);
			expect(catalogUnits.has(slug), slug).toBe(true);
		}
		for (const slug of report.overriddenUnits) {
			expect(presentation[slug]?.generated, slug).toBeUndefined();
		}
		expect(presentation.metre?.generated).toBeUndefined();
	});

	it('keeps the hand overrides and merges generated translations into them', () => {
		expect([...report.overriddenUnits]).toEqual(
			expect.arrayContaining(['centimetre', 'microgram', 'micrometre']),
		);
		for (const slug of report.overriddenUnits) {
			const prefixOf = report.corpus.units.get(slug)?.prefixOf;
			expect(prefixOf, slug).toBeDefined();
			expect(`${prefixOf?.prefix}${prefixOf?.base}`, slug).toBe(slug);
		}
		const presentation = readJson<
			Record<string, { name: { en: string; es?: string }; aliases: string[] }>
		>('presentation', 'units.json');
		expect(presentation.micrometre?.name).toEqual({ en: 'Micrometre', es: 'Micrómetro' });
		expect(presentation.micrometre?.aliases).toEqual(
			expect.arrayContaining(['micrometer', 'um', 'micron']),
		);
		expect(presentation.microgram?.aliases).toEqual(expect.arrayContaining(['ug', 'mcg']));
	});

	it('scales the base factor exactly for every generated unit', () => {
		const units = engineSlice.parse(readJson('engine.json')).units;
		expect(units.kilojoule).toMatchObject({ factor: '1000', exact: true });
		expect(units.hectopascal).toMatchObject({ factor: '100', exact: true });
		expect(units.picofarad).toMatchObject({ factor: '0.000000000001', exact: true });
		expect(units.kilogram).toMatchObject({ factor: '1' });
		expect(units.kilolitre).toBeUndefined();
	});
});

/**
 * The bodies v1 hydrator exactly as it shipped before the lean encoding,
 * frozen here as the reference the lean bodies must reproduce byte for
 * byte; production hydration may change, this copy may not.
 */
function hydrateV1(body: MathBody, atlas: MathAtlas): string {
	if (body.glyphs.length === 0) {
		return body.svg;
	}
	const defs = body.glyphs.map((id) => `<path id="${id}" d="${atlas.glyphs[id]}"></path>`).join('');
	const rootEnd = body.svg.indexOf('>');
	return `${body.svg.slice(0, rootEnd + 1)}<defs>${defs}</defs>${body.svg.slice(rootEnd + 1)}`;
}

describe('math artifact', () => {
	let atlas: MathAtlas;
	let shards: MathBodyShard[];
	let bodies: MathBodyShard;

	beforeAll(() => {
		atlas = readJson<MathAtlas>('presentation', 'math', 'atlas.json');
		shards = Array.from({ length: MATH_SHARD_COUNT }, (_, index) =>
			readJson<MathBodyShard>('presentation', 'math', 'bodies', `${mathShardName(index)}.json`),
		);
		bodies = Object.assign({}, ...shards);
	});

	it('has the contract shape and is glyph-closed', () => {
		expect(atlas.schemaVersion).toBe(2);
		expect(atlas.font).toBe('mathjax-newcm');
		const glyphIds = Object.keys(atlas.glyphs);
		expect(glyphIds.length).toBe(report.math.glyphs);
		expect(glyphIds.every((id) => /^MJX-NCM-/.test(id))).toBe(true);
		expect(Object.keys(bodies).length).toBe(report.math.uniqueTex);
		const referenced = new Set<string>();
		for (const [tex, body] of Object.entries(bodies)) {
			const svg = mathBodySvg(body);
			expect(svg.startsWith('<svg'), tex).toBe(true);
			expect(svg.match(/<svg\b/g)?.length, tex).toBe(1);
			expect(svg.includes('<defs>'), tex).toBe(false);
			expect(svg, tex).not.toMatch(/\sdata-|\srole=|\sfocusable=|\sstyle=/);
			expect(typeof body.wEx).toBe('number');
			expect(typeof body.hEx).toBe('number');
			expect(typeof body.dyEx).toBe('number');
			for (const id of mathBodyGlyphs(svg)) {
				expect(atlas.glyphs[id], `${tex} → ${id}`).toBeDefined();
				referenced.add(id);
			}
			expect(() => hydrateMathBody(body, atlas), tex).not.toThrow();
		}
		expect([...referenced].sort()).toEqual(glyphIds.sort());
	});

	it('emits exactly MATH_SHARD_COUNT shards, each body in the shard its TeX hashes to', () => {
		expect(readdirSync(join(outDir, 'presentation', 'math', 'bodies')).sort()).toEqual(
			Array.from({ length: MATH_SHARD_COUNT }, (_, index) => `${mathShardName(index)}.json`),
		);
		expect(existsSync(join(outDir, 'presentation', 'math', 'bodies.json'))).toBe(false);
		shards.forEach((shard, index) => {
			for (const tex of Object.keys(shard)) {
				expect(mathShardOf(tex), tex).toBe(index);
			}
		});
	});

	it('ships every body lean, hydrating to exactly the XML its rendered form hydrates to', async () => {
		const rendered = await buildMathArtifact(report.corpus, null);
		expect(rendered.issues).toEqual([]);
		expect(Object.keys(rendered.artifact.bodies).sort()).toEqual(Object.keys(bodies).sort());
		const lean = Object.values(bodies).filter(isLeanMathBody).length;
		expect(lean).toBe(Object.keys(bodies).length);
		for (const [tex, body] of Object.entries(rendered.artifact.bodies)) {
			const shipped = bodies[tex];
			expect(shipped, tex).toBeDefined();
			if (shipped === undefined) continue;
			expect(hydrateMathBody(shipped, atlas), tex).toBe(hydrateV1(body, atlas));
			expect(mathBodySvg(shipped), tex).toBe(body.svg);
			expect(mathBodyGlyphs(mathBodySvg(shipped)), tex).toEqual(body.glyphs);
		}
	}, 60_000);

	it('covers every TeX string the presentation slices carry or their prose splits into, keyed exactly', () => {
		const mathOf = (text: Record<string, string> | undefined) =>
			Object.values(text ?? {})
				.flatMap(splitRichText)
				.flatMap((segment) => (segment.t === 'math' ? [segment] : []));
		let checked = 0;
		let stepMath = 0;
		for (const collection of COLLECTIONS) {
			const slice = readJson<
				Record<
					string,
					{
						symbolTex?: string;
						symbolAltTex?: string;
						expressionTex?: string;
						terms?: Record<string, unknown>;
						description?: Record<string, string>;
						steps?: Partial<
							Record<'note' | 'body' | 'prompt' | 'answer', Record<string, string>>
						>[];
					}
				>
			>('presentation', `${collection}.json`);
			for (const [slug, entity] of Object.entries(slice)) {
				const keys = [entity.symbolTex, entity.symbolAltTex, entity.expressionTex].filter(
					(key): key is string => key !== undefined,
				);
				keys.push(...Object.keys(entity.terms ?? {}));
				const stepSegments = (entity.steps ?? []).flatMap((step) =>
					[step.note, step.body, step.prompt, step.answer].flatMap(mathOf),
				);
				stepMath += stepSegments.length;
				for (const segment of [...mathOf(entity.description), ...stepSegments]) {
					expect(canonicalTex(segment.raw), `${collection}/${slug}: ${segment.raw}`).toBe(
						segment.tex,
					);
					keys.push(segment.tex);
				}
				for (const key of keys) {
					expect(bodies[key], `${collection}/${slug}: ${key}`).toBeDefined();
					checked += 1;
				}
			}
		}
		expect(stepMath).toBeGreaterThan(0);
		expect(checked).toBeGreaterThan(300);
	});

	it('keeps annotation macros in raw so equation prose can cross-highlight', () => {
		const equations = readJson<Record<string, { description?: { en: string } }>>(
			'presentation',
			'equations.json',
		);
		const annotated = Object.values(equations)
			.flatMap((equation) => splitRichText(equation.description?.en ?? ''))
			.flatMap((segment) => (segment.t === 'math' && segment.raw !== segment.tex ? [segment] : []));
		expect(annotated.length).toBeGreaterThan(0);
		for (const segment of annotated) {
			expect(segment.raw).toMatch(/\\(mag|const|var)\{|[–—−]/);
			expect(segment.tex).not.toMatch(/\\(mag|const|var)\{/);
		}
	});

	it('renders display bodies for equation expressions and inline for symbols', () => {
		const equations = readJson<Record<string, { expressionTex: string }>>(
			'presentation',
			'equations.json',
		);
		const units = readJson<Record<string, { symbolTex: string }>>('presentation', 'units.json');
		const expression = bodies[equations['mass-energy-equivalence']?.expressionTex ?? ''];
		const symbol = bodies[units['joule-per-kelvin']?.symbolTex ?? ''];
		expect(
			expression === undefined ? 0 : mathBodyGlyphs(mathBodySvg(expression)).length,
		).toBeGreaterThan(3);
		expect(symbol?.hEx ?? 0).toBeGreaterThan(2);
		expect(report.math.uniqueTex).toBeGreaterThan(300);
	});
});

describe('artifact budget table', () => {
	it('classifies each emitted path shape under exactly one pattern', () => {
		expect(artifactBudgetPatterns('presentation/units.json')).toEqual([
			'presentation/<collection>.json',
		]);
		expect(artifactBudgetPatterns('presentation/math/bodies/0f.json')).toEqual([
			'presentation/math/bodies/<shard>.json',
		]);
		expect(artifactBudgetPatterns('solutions/index.js')).toEqual(['solutions/index.js']);
		expect(artifactBudgetPatterns('solutions/index.d.ts')).toEqual(['solutions/index.d.ts']);
		for (const path of ['solutions/area-circle.js', 'solutions/index-of-refraction.js']) {
			expect(artifactBudgetPatterns(path), path).toEqual(['solutions/<equation>.js']);
		}
		expect(artifactBudgetPatterns('search/es.json')).toEqual(['search/<locale>.json']);
		expect(artifactBudgetPatterns('search/catalog-lite.es.json')).toEqual([
			'search/catalog-lite.<locale>.json',
		]);
		expect(artifactBudgetPatterns('schemas/units.locale.schema.json')).toEqual([
			'schemas/<collection>.locale.schema.json',
		]);
		for (const path of [
			'presentation/widgets.json',
			'search/fr.json',
			'engine.json.bak',
			'presentation/math/bodies.json',
			'solutions/area-circle.d.ts',
			'solutions/Area.js',
		]) {
			expect(artifactBudgetPatterns(path), path).toEqual([]);
		}
	});

	it('warns from the warn ratio of a budget and errors only over it', () => {
		const warnFrom = Math.ceil(1000 * BUDGET_WARN_RATIO);
		expect(budgetIssue('file', warnFrom - 1, 1000, 'cost')).toBeUndefined();
		expect(budgetIssue('file', warnFrom, 1000, 'cost')?.severity).toBe('warning');
		expect(budgetIssue('file', 1000, 1000, 'cost')?.severity).toBe('warning');
		expect(budgetIssue('file', 1001, 1000, 'cost')).toMatchObject({
			severity: 'error',
			stage: 'emit',
			message: expect.stringContaining('over its 1000-byte budget (cost)'),
		});
	});
});

describe('determinism', () => {
	it('produces byte-identical artifacts from a cold render and a cached build', () => {
		expect(coldReport.ok).toBe(true);
		expect(coldReport.math.cached).toBe(0);
		expect(coldReport.math.rendered).toBe(coldReport.math.uniqueTex);
		const files = walk(outDir)
			.map((path) => relative(outDir, path))
			.sort();
		const coldFiles = walk(coldOutDir)
			.map((path) => relative(coldOutDir, path))
			.sort();
		expect(files).toEqual(coldFiles);
		expect(files).toContain(join('presentation', 'math', 'atlas.json'));
		expect(files).toContain(join('presentation', 'math', 'bodies', '00.json'));
		expect(files).toContain(join('solutions', 'index.js'));
		for (const file of files) {
			expect(digest(join(outDir, file)), file).toBe(digest(join(coldOutDir, file)));
		}
	});
});
