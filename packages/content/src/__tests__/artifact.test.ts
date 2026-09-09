import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COLLECTIONS, engineSlice, SCHEMA_VERSION } from '@equreka/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CompileReport, compileContent } from '../pipeline/compile.js';

let outDir: string;
let report: CompileReport;

beforeAll(() => {
	outDir = mkdtempSync(join(tmpdir(), 'equreka-content-'));
	report = compileContent('build', { outDir });
}, 120_000);

afterAll(() => {
	rmSync(outDir, { recursive: true, force: true });
});

describe('build over the real corpus', () => {
	it('exits clean', () => {
		expect(report.issues.filter((entry) => entry.severity === 'error')).toEqual([]);
		expect(report.ok).toBe(true);
	});

	it('emits an engine.json that satisfies the engineSlice contract', () => {
		const raw = JSON.parse(readFileSync(join(outDir, 'engine.json'), 'utf8'));
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

	it('derives related units into the equations presentation slice', () => {
		const equations = JSON.parse(
			readFileSync(join(outDir, 'presentation', 'equations.json'), 'utf8'),
		) as Record<string, { relatedUnits: string[]; units?: unknown }>;
		expect(equations['area-circle']?.relatedUnits).toEqual(['square-metre', 'unitless', 'metre']);
		expect(equations['area-square']?.relatedUnits).toEqual(['square-metre', 'metre']);
		expect(equations['mass-energy-equivalence']?.relatedUnits).toEqual([
			'joule',
			'kilogram',
			'metre-per-second',
		]);
		expect(equations['pythagorean-theorem']?.relatedUnits).toEqual([]);
		expect(equations['area-circle']?.units).toBeUndefined();
	});

	it('resolves entry-step targets into the paths presentation slice', () => {
		const paths = JSON.parse(
			readFileSync(join(outDir, 'presentation', 'paths.json'), 'utf8'),
		) as Record<
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
		>;
		expect(Object.keys(paths).sort()).toEqual([
			'energy-work-heat',
			'geometry-of-circles-and-triangles',
			'si-base-units',
			'temperature-scales',
		]);
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
		const catalog = JSON.parse(
			readFileSync(join(outDir, 'search', 'catalog-lite.es.json'), 'utf8'),
		) as { collection: string; slug: string; name: string; aliases: string[] }[];
		const row = catalog.find(
			(entry) => entry.collection === 'paths' && entry.slug === 'si-base-units',
		);
		expect(row).toMatchObject({ name: 'Las siete unidades base del SI' });
		expect(row?.aliases).toContain('unidades base');
	});

	it('emits a draft-07 authoring JSON Schema per collection for editors', () => {
		for (const collection of COLLECTIONS) {
			const path = join(outDir, 'schemas', `${collection}.schema.json`);
			expect(existsSync(path), collection).toBe(true);
			const schema = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
			expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(schema.type).toBe('object');
		}
		const units = JSON.parse(
			readFileSync(join(outDir, 'schemas', 'units.schema.json'), 'utf8'),
		) as { properties: Record<string, { properties?: Record<string, unknown> }> };
		expect(units.properties.compose?.properties).toHaveProperty('factor');
		expect(units.properties.compose?.properties).toHaveProperty('of');
		expect(units.properties).toHaveProperty('nonConvertible');
	});

	it('stays inside the artifact size budgets', () => {
		const sizes = new Map(report.artifacts.map((artifact) => [artifact.relPath, artifact.bytes]));
		expect(sizes.get('engine.json') ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(500 * 1024);
		for (const locale of ['en', 'es']) {
			expect(sizes.get(`search/${locale}.json`) ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
				1024 * 1024,
			);
		}
	});

	it('emits deterministic meta with a null timestamp', () => {
		const meta = JSON.parse(readFileSync(join(outDir, 'meta.json'), 'utf8'));
		expect(meta).toEqual({
			schemaVersion: SCHEMA_VERSION,
			contentHash: report.contentHash,
			counts: report.counts,
			generatedAt: null,
		});
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
