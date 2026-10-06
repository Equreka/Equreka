import type { LegacyCorpus } from './corpus.js';
import { auditKeys, localized, mapSymbol, normalizeProse } from './normalize.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';

const KNOWN_KEYS = new Set(['name', 'symbol', 'categories', 'description', 'baseUnit', 'units']);

export function convertVariables(
	corpus: LegacyCorpus,
	report: MigrationReport,
): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>();
	for (const [slug, legacy] of corpus.variables) {
		const context = `variables/${slug}`;
		auditKeys(legacy as unknown as Record<string, unknown>, KNOWN_KEYS, context);
		if (legacy.baseUnit === undefined) {
			throw new MigrationError(`${context}: legacy baseUnit missing`);
		}
		report.drop('variables', 'units[]', slug);
		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(legacy.name) },
			symbol: mapSymbol(legacy.symbol, context),
			defaultUnit: legacy.baseUnit,
		};
		if (legacy.categories !== undefined && legacy.categories.length > 0) {
			entity.categories = [...legacy.categories];
		}
		const description = localized(legacy.description);
		if (description !== undefined) entity.description = description;
		else if (legacy.description === null) report.drop('variables', 'description (null)', slug);
		out.set(slug, entity);
	}
	return out;
}
