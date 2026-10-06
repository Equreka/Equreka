import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COLLECTIONS, engineSlice, SCHEMA_VERSION } from '@equreka/schema';
import MiniSearch from 'minisearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CompileReport, compileContent } from '../pipeline/compile.js';
import {
	canonicalTex,
	hydrateMathBody,
	type LocalizedSegments,
	type MathAtlas,
	type MathBodies,
	type RichTextSegment,
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
			kind: 'symbol',
			label: { en: 'Radius', es: 'Radio' },
			unit: 'metre',
			identifier: 'r',
		});
		expect(parsed.equations['pythagorean-theorem']?.terms.c).toEqual({
			kind: 'symbol',
			label: { en: 'Hypotenuse', es: 'Hipotenusa' },
			identifier: 'c',
		});
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
		expect(equations['pythagorean-theorem']?.relatedUnits).toEqual([]);
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
			name: { en: 'Mass-energy equivalence' },
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
		expect(row).toMatchObject({ name: 'Las siete unidades base del SI' });
		expect(row?.aliases).toContain('unidades base');
	});

	it('keeps authored hard line breaks through the presentation slices and folds them for search', () => {
		const equations = readJson<
			Record<string, { description: { en: string }; descriptionSegments: LocalizedSegments }>
		>('presentation', 'equations.json');
		const equation = equations['mass-energy-equivalence'];
		expect(equation?.description.en).toContain('$(\\const{c}^{2})$.\nBecause the speed of light');
		const text = (equation?.descriptionSegments.en ?? [])
			.map((segment) => (segment.t === 'text' ? segment.v : `$${segment.raw}$`))
			.join('');
		expect(text).toBe(equation?.description.en);
		expect(equation?.descriptionSegments.en?.at(-1)).toMatchObject({
			t: 'text',
			v: expect.stringMatching(/^\.\nBecause /),
		});
		const units = readJson<Record<string, { description: { en: string } }>>(
			'presentation',
			'units.json',
		);
		expect(units['nautical-mile']?.description.en.split('\n')).toEqual([
			expect.stringMatching(/^A nautical mile /),
			'',
			'**There is no single internationally agreed symbol**, with several symbols in use.',
			expect.stringMatching(/^- \$M\$ is used /),
			expect.stringMatching(/^- \$NM\$ is used /),
			expect.stringMatching(/^- \$nmi\$ is used /),
			expect.stringMatching(/^- \$nm\$ is a non-standard /),
		]);
		const index = MiniSearch.loadJSON<SearchDocument>(
			readFileSync(join(outDir, 'search', 'en.json'), 'utf8'),
			searchOptions,
		);
		for (const word of ['squared', 'because']) {
			const ids = index.search(word, { fields: ['description'] }).map((hit) => hit.id);
			expect(ids, word).toContain('equations:mass-energy-equivalence');
		}
		for (const word of ['use', 'abbreviation']) {
			const ids = index.search(word, { fields: ['description'] }).map((hit) => hit.id);
			expect(ids, word).toContain('units:nautical-mile');
		}
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
		expect(units.kelvin?.branches).toEqual(['thermodynamics']);
		const catalog = readJson<{ collection: string; slug: string; branches: string[] }[]>(
			'search',
			'catalog-lite.es.json',
		);
		expect(
			catalog.find((row) => row.collection === 'units' && row.slug === 'kelvin'),
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
		expect(categoriesOf('units', 'kelvin')).toEqual(['physics']);
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

	it('stays inside the artifact size budgets', () => {
		const sizes = new Map(report.artifacts.map((artifact) => [artifact.relPath, artifact.bytes]));
		expect(sizes.get('engine.json') ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(500 * 1024);
		for (const locale of ['en', 'es']) {
			expect(sizes.get(`search/${locale}.json`) ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
				1024 * 1024,
			);
		}
		expect(
			sizes.get('presentation/math/atlas.json') ?? Number.POSITIVE_INFINITY,
		).toBeLessThanOrEqual(200 * 1024);
		expect(
			sizes.get('presentation/math/bodies.json') ?? Number.POSITIVE_INFINITY,
		).toBeLessThanOrEqual(1024 * 1024);
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

describe('math artifact', () => {
	let atlas: MathAtlas;
	let bodies: MathBodies;

	beforeAll(() => {
		atlas = readJson<MathAtlas>('presentation', 'math', 'atlas.json');
		bodies = readJson<MathBodies>('presentation', 'math', 'bodies.json');
	});

	it('has the contract shape and is glyph-closed', () => {
		expect(atlas.schemaVersion).toBe(1);
		expect(atlas.font).toBe('mathjax-newcm');
		const glyphIds = Object.keys(atlas.glyphs);
		expect(glyphIds.length).toBe(report.math.glyphs);
		expect(glyphIds.every((id) => /^MJX-NCM-/.test(id))).toBe(true);
		expect(Object.keys(bodies).length).toBe(report.math.uniqueTex);
		const referenced = new Set<string>();
		for (const [tex, body] of Object.entries(bodies)) {
			expect(body.svg.startsWith('<svg'), tex).toBe(true);
			expect(body.svg.match(/<svg\b/g)?.length, tex).toBe(1);
			expect(body.svg.includes('<defs>'), tex).toBe(false);
			expect(body.svg, tex).not.toMatch(/\sdata-|\srole=|\sfocusable=|\sstyle=/);
			expect(typeof body.wEx).toBe('number');
			expect(typeof body.hEx).toBe('number');
			expect(typeof body.dyEx).toBe('number');
			for (const id of body.glyphs) {
				expect(atlas.glyphs[id], `${tex} → ${id}`).toBeDefined();
				referenced.add(id);
			}
			expect(() => hydrateMathBody(body, atlas), tex).not.toThrow();
		}
		expect([...referenced].sort()).toEqual(glyphIds.sort());
	});

	it('covers every TeX string the presentation slices carry, keyed exactly', () => {
		const mathSegments = (segments: LocalizedSegments | undefined): RichTextSegment[] =>
			Object.values(segments ?? {})
				.flat()
				.filter((segment) => segment.t === 'math');
		let checked = 0;
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
						descriptionSegments?: LocalizedSegments;
						steps?: Record<string, unknown>[];
					}
				>
			>('presentation', `${collection}.json`);
			for (const [slug, entity] of Object.entries(slice)) {
				const keys = [entity.symbolTex, entity.symbolAltTex, entity.expressionTex].filter(
					(key): key is string => key !== undefined,
				);
				keys.push(...Object.keys(entity.terms ?? {}));
				if (entity.description !== undefined) {
					expect(Object.keys(entity.descriptionSegments ?? {}).sort(), slug).toEqual(
						Object.keys(entity.description).sort(),
					);
				}
				const stepSegments = (entity.steps ?? []).flatMap((step) =>
					['noteSegments', 'bodySegments', 'promptSegments', 'answerSegments'].flatMap((field) =>
						mathSegments(step[field] as LocalizedSegments | undefined),
					),
				);
				for (const segment of [...mathSegments(entity.descriptionSegments), ...stepSegments]) {
					if (segment.t === 'math') {
						expect(typeof segment.raw, `${collection}/${slug}: ${segment.tex}`).toBe('string');
						expect(canonicalTex(segment.raw), `${collection}/${slug}: ${segment.raw}`).toBe(
							segment.tex,
						);
						keys.push(segment.tex);
					}
				}
				for (const key of keys) {
					expect(bodies[key], `${collection}/${slug}: ${key}`).toBeDefined();
					checked += 1;
				}
			}
		}
		expect(checked).toBeGreaterThan(300);
	});

	it('keeps annotation macros in raw so equation prose can cross-highlight', () => {
		const equations = readJson<Record<string, { descriptionSegments?: LocalizedSegments }>>(
			'presentation',
			'equations.json',
		);
		const annotated = Object.values(equations)
			.flatMap((equation) => equation.descriptionSegments?.en ?? [])
			.filter((segment) => segment.t === 'math' && segment.raw !== segment.tex);
		expect(annotated.length).toBeGreaterThan(0);
		for (const segment of annotated) {
			if (segment.t === 'math') {
				expect(segment.raw).toMatch(/\\(mag|const|var)\{|[–—−]/);
				expect(segment.tex).not.toMatch(/\\(mag|const|var)\{/);
			}
		}
	});

	it('mirrors path-step prose as per-locale segments', () => {
		const paths = readJson<
			Record<string, { steps: { id: string; kind: string; bodySegments?: LocalizedSegments }[] }>
		>('presentation', 'paths.json');
		const prose = paths['si-base-units']?.steps.find((step) => step.kind === 'prose');
		expect(prose?.bodySegments?.en?.[0]?.t).toBe('text');
		const withMath = Object.values(paths)
			.flatMap((path) => path.steps)
			.find((step) => step.bodySegments?.en?.some((segment) => segment.t === 'math'));
		expect(withMath).toBeDefined();
	});

	it('renders display bodies for equation expressions and inline for symbols', () => {
		const equations = readJson<Record<string, { expressionTex: string }>>(
			'presentation',
			'equations.json',
		);
		const units = readJson<Record<string, { symbolTex: string }>>('presentation', 'units.json');
		const expression = bodies[equations['mass-energy-equivalence']?.expressionTex ?? ''];
		const symbol = bodies[units['joule-per-kelvin']?.symbolTex ?? ''];
		expect(expression?.glyphs.length).toBeGreaterThan(3);
		expect(symbol?.hEx ?? 0).toBeGreaterThan(2);
		expect(report.math.uniqueTex).toBeGreaterThan(300);
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
		expect(files).toContain(join('presentation', 'math', 'bodies.json'));
		for (const file of files) {
			expect(digest(join(outDir, file)), file).toBe(digest(join(coldOutDir, file)));
		}
	});
});
