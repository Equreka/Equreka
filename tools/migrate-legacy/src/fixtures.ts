import type { LegacyCorpus } from './corpus.js';
import type { MigrationReport } from './report.js';

/**
 * Golden snapshot of one legacy conversions row: converting `input` of unit
 * `from` yielded `expected` in unit `to` in the 2021-2022 app.
 */
export interface ConversionFixture {
	from: string;
	to: string;
	input: string;
	expected: string;
	exact: boolean;
	viaFormula: boolean;
}

/**
 * Legacy rows that are factually wrong in the source data; a golden set must
 * be truth, so these are excluded rather than shipped as guaranteed-red
 * engine tests. milliampere: legacy claims 1 mA = 0.0001 A (off by 10× —
 * milli is 1e-3; the emitted prefixOf form encodes the correct value).
 */
const KNOWN_WRONG: ReadonlyArray<{ from: string; to: string }> = [
	{ from: 'milliampere', to: 'ampere' },
];

export function buildFixtures(corpus: LegacyCorpus, report: MigrationReport): ConversionFixture[] {
	const fixtures: ConversionFixture[] = [];
	for (const [slug, legacy] of corpus.units) {
		for (const row of legacy.conversions ?? []) {
			if (row.units === slug) continue;
			if (KNOWN_WRONG.some((k) => k.from === slug && k.to === row.units)) {
				report.review(
					`fixtures: ${slug} → ${row.units} is a known-wrong legacy row — excluded from the golden set`,
				);
				continue;
			}
			if (row.sup !== undefined) {
				report.review(
					`fixtures: ${slug} row targeting '${row.units}' carries sup: ${row.sup} (1 ${slug} = 1 ${row.units}^${row.sup}, not a plain conversion) — excluded from fixtures`,
				);
				continue;
			}
			fixtures.push({
				from: slug,
				to: row.units,
				input: '1',
				expected: row.value,
				exact: row.exact !== false,
				viaFormula: row.formula !== undefined,
			});
		}
	}
	report.setFixtureCount(fixtures.length);
	return fixtures;
}
