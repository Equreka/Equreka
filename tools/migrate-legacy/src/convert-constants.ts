import type { LegacyCorpus, LegacyValueRow } from './corpus.js';
import { auditKeys, localized, mapReferences, mapSymbol, normalizeProse } from './normalize.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';

const KNOWN_KEYS = new Set([
	'name',
	'symbol',
	'symbolAlt',
	'categories',
	'description',
	'units',
	'values',
	'references',
]);

const DECIMAL_STRING = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

function pickPrimaryRow(rows: LegacyValueRow[], context: string): LegacyValueRow {
	const flagged = rows.filter((row) => row.base === true);
	if (flagged.length === 1) {
		const row = flagged[0];
		if (row !== undefined) return row;
	}
	if (flagged.length === 0) {
		const exactRows = rows.filter((row) => row.exact === true);
		const sole = exactRows[0];
		if (exactRows.length === 1 && sole !== undefined) return sole;
	}
	throw new MigrationError(`${context}: ambiguous primary value row — manual review`);
}

export function convertConstants(
	corpus: LegacyCorpus,
	report: MigrationReport,
): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>();
	for (const [slug, legacy] of corpus.constants) {
		const context = `constants/${slug}`;
		auditKeys(legacy as unknown as Record<string, unknown>, KNOWN_KEYS, context);
		const rows = legacy.values ?? [];
		if (rows.length === 0) throw new MigrationError(`${context}: no values[]`);
		const primary = pickPrimaryRow(rows, context);
		if (rows.length > 1) {
			report.drop('constants', 'values[] (non-primary rows)', slug);
		}
		if (primary.sup !== undefined) {
			report.review(
				`${context}: primary row carries sup: ${primary.sup} (unit is really ${primary.units}^${primary.sup}); emitted unit '${primary.units}' loses the exponent`,
			);
		}
		const value = primary.value.replace(/ /g, '');
		if (value !== primary.value)
			report.note(`${context}: stripped digit-grouping spaces from value`);
		if (!DECIMAL_STRING.test(value)) {
			throw new MigrationError(`${context}: value '${value}' is not a decimal string`);
		}
		report.drop('constants', 'units[] (related-units list)', slug);

		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(legacy.name) },
			symbol: mapSymbol(legacy.symbol, context),
		};
		if (legacy.symbolAlt !== undefined) entity.symbolAlt = mapSymbol(legacy.symbolAlt, context);
		entity.value = value;
		entity.unit = primary.units;
		if (primary.exact === true) entity.exact = true;
		if (legacy.categories !== undefined && legacy.categories.length > 0) {
			entity.categories = [...legacy.categories];
		}
		const description = localized(legacy.description);
		if (description !== undefined) entity.description = description;
		const references = mapReferences(legacy.references, report, 'constants', slug);
		if (references !== undefined) entity.references = references;
		out.set(slug, entity);
	}
	return out;
}
