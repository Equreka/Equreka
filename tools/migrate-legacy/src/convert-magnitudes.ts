import type { LegacyCorpus } from './corpus.js';
import { auditKeys, localized, mapSymbol, normalizeProse } from './normalize.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';
import { DIMENSIONS, NON_NEGATIVE } from './tables.js';

const KNOWN_KEYS = new Set([
	'name',
	'symbol',
	'symbolAlt',
	'alias',
	'categories',
	'description',
	'baseUnit',
	'units',
	'branches',
	'subcategories',
	'expression',
]);

/** Converted magnitudes plus the lookups unit conversion depends on. */
export interface MagnitudeResult {
	entities: Map<string, Record<string, unknown>>;
	baseUnitOf: Map<string, string>;
	magnitudeSlugs: Set<string>;
	baseUnits: Set<string>;
}

export function convertMagnitudes(corpus: LegacyCorpus, report: MigrationReport): MagnitudeResult {
	const entities = new Map<string, Record<string, unknown>>();
	const baseUnitOf = new Map<string, string>();
	for (const [slug, legacy] of corpus.magnitudes) {
		const context = `magnitudes/${slug}`;
		auditKeys(legacy as unknown as Record<string, unknown>, KNOWN_KEYS, context);
		let baseUnit = legacy.baseUnit;
		if (baseUnit === undefined) {
			const units = legacy.units ?? [];
			const sole = units[0];
			if (units.length !== 1 || sole === undefined) {
				throw new MigrationError(
					`${context}: no baseUnit and no single units[] entry to derive it`,
				);
			}
			baseUnit = sole;
			report.note(
				`${context}: baseUnit missing in legacy; derived '${baseUnit}' from its sole units[] entry`,
			);
		}
		const dimension = DIMENSIONS[slug];
		if (dimension === undefined) {
			throw new MigrationError(`${context}: missing from the hand dimension table`);
		}
		report.drop('magnitudes', 'units[] (derived from units.unitOf)', slug);
		if (legacy.branches !== undefined) report.drop('magnitudes', 'branches', slug);
		if (legacy.subcategories !== undefined) report.drop('magnitudes', 'subcategories', slug);
		if (legacy.expression !== undefined) report.drop('magnitudes', 'expression', slug);

		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(legacy.name) },
			symbol: mapSymbol(legacy.symbol, context),
		};
		if (legacy.symbolAlt !== undefined) entity.symbolAlt = mapSymbol(legacy.symbolAlt, context);
		entity.baseUnit = baseUnit;
		entity.dimension = { ...dimension };
		if (NON_NEGATIVE.has(slug)) entity.nonNegative = true;
		if (legacy.categories !== undefined && legacy.categories.length > 0) {
			entity.categories = [...legacy.categories];
		}
		if (legacy.alias !== undefined && legacy.alias.length > 0) entity.aliases = [...legacy.alias];
		const description = localized(legacy.description);
		if (description !== undefined) entity.description = description;
		entities.set(slug, entity);
		baseUnitOf.set(slug, baseUnit);
	}

	entities.set('dimensionless', {
		name: { en: 'Dimensionless' },
		symbol: { tex: '1' },
		baseUnit: 'unitless',
		dimension: {},
		categories: ['universal'],
	});
	baseUnitOf.set('dimensionless', 'unitless');
	report.note(
		"magnitudes: created new 'dimensionless' magnitude (baseUnit 'unitless', empty dimension)",
	);

	const missingFromTable = Object.keys(DIMENSIONS).filter((key) => !entities.has(key));
	if (missingFromTable.length > 0) {
		throw new MigrationError(
			`dimension table has entries without magnitudes: ${missingFromTable.join(', ')}`,
		);
	}
	return {
		entities,
		baseUnitOf,
		magnitudeSlugs: new Set(entities.keys()),
		baseUnits: new Set(baseUnitOf.values()),
	};
}
