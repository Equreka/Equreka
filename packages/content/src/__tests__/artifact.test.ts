import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { engineSlice, SCHEMA_VERSION } from '@equreka/schema';
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
		expect(Object.keys(parsed.units).length).toBe(report.counts.units);
		expect(parsed.units.fahrenheit).toMatchObject({ affine: true, exact: false });
		expect(parsed.magnitudes.entropy).toMatchObject({ baseUnit: 'joule-per-kelvin' });
		expect(parsed.equations['mass-energy-equivalence']).toMatchObject({
			calculatorEnabled: true,
			solvable: ['E', 'm'],
		});
		expect(parsed.equations['area-circle']?.terms['\\pi']).toMatchObject({
			kind: 'constant',
			ref: 'pi',
			identifier: 'pi',
		});
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
