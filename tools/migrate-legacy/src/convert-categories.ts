import type { LegacyCorpus } from './corpus.js';
import { auditKeys, localized, normalizeProse } from './normalize.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';
import { CATEGORY_ORDER } from './tables.js';

const KNOWN_KEYS = new Set(['id', 'name', 'description']);

export function convertCategories(
	corpus: LegacyCorpus,
	report: MigrationReport,
): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>();
	for (const [slug, legacy] of corpus.categories) {
		auditKeys(legacy as unknown as Record<string, unknown>, KNOWN_KEYS, `categories/${slug}`);
		const expected = CATEGORY_ORDER[slug];
		if (expected === undefined || legacy.id !== expected) {
			throw new MigrationError(
				`categories/${slug}: legacy id ${legacy.id} != expected ${expected}`,
			);
		}
		report.drop('categories', 'id (mapped to order)', slug);
		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(legacy.name) },
			order: legacy.id,
		};
		const description = localized(legacy.description);
		if (description !== undefined) entity.description = description;
		out.set(slug, entity);
	}
	return out;
}
