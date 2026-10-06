import type { LegacyCorpus } from './corpus.js';
import { auditKeys, localized, mapSymbol, normalizeProse } from './normalize.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';

const KNOWN_KEYS = new Set(['name', 'symbol', 'value', 'type', 'categories', 'description']);

const DECIMAL_STRING = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

export function convertPrefixes(
	corpus: LegacyCorpus,
	report: MigrationReport,
): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>();
	for (const [slug, legacy] of corpus.prefixes) {
		const context = `prefixes/${slug}`;
		auditKeys(legacy as unknown as Record<string, unknown>, KNOWN_KEYS, context);
		if (legacy.type !== 'si') {
			throw new MigrationError(`${context}: unexpected legacy type '${legacy.type}'`);
		}
		if (!DECIMAL_STRING.test(legacy.value)) {
			throw new MigrationError(`${context}: value '${legacy.value}' is not a decimal string`);
		}
		report.drop('prefixes', "type (mapped to system, schema default 'si')", slug);
		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(legacy.name) },
			symbol: mapSymbol(legacy.symbol, context),
			value: legacy.value,
		};
		if (legacy.categories !== undefined && legacy.categories.length > 0) {
			entity.categories = [...legacy.categories];
		}
		const description = localized(legacy.description);
		if (description !== undefined) entity.description = description;
		out.set(slug, entity);
	}
	return out;
}
