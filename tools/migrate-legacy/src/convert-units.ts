import type { MagnitudeResult } from './convert-magnitudes.js';
import type { LegacyCorpus, LegacyUnit } from './corpus.js';
import { assertMatchesRowValue, deriveAffine } from './formula.js';
import { auditKeys, localized, mapReferences, mapSymbol, normalizeProse } from './normalize.js';
import type { ExactNumberValue } from './rational.js';
import { describe, isZero, toExactNumber } from './rational.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';
import {
	COMPOSE_TABLE,
	EXPECTED_PREFIX_UNITS,
	FORMLESS_UNITS,
	SI_BASE_UNITS,
	SNAP_RATIONALS,
	SYMBOL_OVERRIDES,
	SYSTEM_REALITY_OVERRIDES,
} from './tables.js';

const KNOWN_KEYS = new Set([
	'name',
	'symbol',
	'unitOf',
	'type',
	'baseUnit',
	'units',
	'branches',
	'categories',
	'description',
	'conversions',
	'references',
]);

const ROW_KEYS = new Set(['value', 'units', 'formula', 'exact', 'sup']);

interface ToBaseValue {
	factor: ExactNumberValue;
	offset?: ExactNumberValue;
	exact?: boolean;
}

function mapUnitOf(
	legacy: LegacyUnit,
	slug: string,
	magnitudes: MagnitudeResult,
	report: MigrationReport,
): string[] {
	if (legacy.unitOf === null || legacy.unitOf === false || legacy.unitOf === undefined) {
		report.note(
			`units/${slug}: legacy unitOf ${String(legacy.unitOf)} mapped to ['dimensionless']`,
		);
		return ['dimensionless'];
	}
	const kept = legacy.unitOf.filter((magnitude) => magnitudes.magnitudeSlugs.has(magnitude));
	for (const missing of legacy.unitOf.filter((m) => !magnitudes.magnitudeSlugs.has(m))) {
		report.review(
			`units/${slug}: unitOf ref '${missing}' has no magnitude in the corpus — dropped`,
		);
	}
	if (kept.length === 0) throw new MigrationError(`units/${slug}: unitOf resolves to nothing`);
	return kept;
}

function mapSystem(
	slug: string,
	legacyType: string | null | undefined,
	report: MigrationReport,
): string {
	const override = SYSTEM_REALITY_OVERRIDES[slug];
	if (override !== undefined) {
		report.note(
			`units/${slug}: legacy type '${legacyType}' corrected to system '${override}' (non-SI unit accepted for use with the SI)`,
		);
		return override;
	}
	if (legacyType === 'si') return SI_BASE_UNITS.has(slug) ? 'si' : 'si-derived';
	if (legacyType === 'imperial' || legacyType === 'uscs' || legacyType === 'cgs') return legacyType;
	if (legacyType === 'non-si' || legacyType === null || legacyType === undefined) return 'other';
	throw new MigrationError(`units/${slug}: unknown legacy type '${legacyType}'`);
}

function derivePrefixDecompositions(
	corpus: LegacyCorpus,
	magnitudes: MagnitudeResult,
): Map<string, { prefix: string; base: string }> {
	const decompositions = new Map<string, { prefix: string; base: string }>();
	for (const slug of corpus.units.keys()) {
		if (magnitudes.baseUnits.has(slug) || COMPOSE_TABLE[slug] !== undefined) continue;
		for (const prefix of corpus.prefixes.keys()) {
			const remainder = slug.startsWith(prefix) ? slug.slice(prefix.length) : '';
			if (remainder !== '' && corpus.units.has(remainder)) {
				const previous = decompositions.get(slug);
				if (previous !== undefined) {
					throw new MigrationError(
						`units/${slug}: ambiguous prefix decomposition (${previous.prefix}+${previous.base} vs ${prefix}+${remainder})`,
					);
				}
				decompositions.set(slug, { prefix, base: remainder });
			}
		}
	}
	const derived = new Set(decompositions.keys());
	const mismatch =
		derived.size !== EXPECTED_PREFIX_UNITS.size ||
		[...derived].some((slug) => !EXPECTED_PREFIX_UNITS.has(slug));
	if (mismatch) {
		throw new MigrationError(
			`prefix decomposition drifted from the hand table: derived {${[...derived].sort().join(', ')}}`,
		);
	}
	return decompositions;
}

function verifyPrefixAgainstRow(
	slug: string,
	decomposition: { prefix: string; base: string },
	legacy: LegacyUnit,
	corpus: LegacyCorpus,
	report: MigrationReport,
): void {
	const prefix = corpus.prefixes.get(decomposition.prefix);
	if (prefix === undefined) throw new MigrationError(`units/${slug}: prefix vanished`);
	const row = (legacy.conversions ?? []).find((entry) => entry.units === decomposition.base);
	if (row === undefined) return;
	const fromRow = Number(row.value);
	const fromPrefix = Number(prefix.value);
	if (Math.abs(fromRow - fromPrefix) / fromPrefix > 1e-9) {
		report.review(
			`units/${slug}: legacy row claims 1 ${slug} = ${row.value} ${decomposition.base}, contradicting prefix ${decomposition.prefix} = ${prefix.value} — legacy data error; prefixOf encodes ${prefix.value}, the fixture preserves the legacy row`,
		);
	}
}

/**
 * Snaps a repeating-expansion literal (≥6 significant digits, denominator
 * with a prime factor other than 2/5, relative error ≤ 1e-12) to its exact
 * ratio; finite-decimal ratios never look like repeating expansions.
 */
function snapToRational(literal: string): ExactNumberValue | undefined {
	const digits = literal.replace(/[^0-9]/g, '').replace(/^0+/, '');
	if (digits.length < 6) return undefined;
	const value = Number(literal);
	for (const [num, den] of SNAP_RATIONALS) {
		if (isFiniteDecimal(den)) continue;
		const ratio = num / den;
		if (Math.abs(value - ratio) / Math.abs(ratio) <= 1e-12) {
			return { num: String(num), den: String(den) };
		}
	}
	return undefined;
}

function isFiniteDecimal(den: number): boolean {
	let d = den;
	while (d % 2 === 0) d /= 2;
	while (d % 5 === 0) d /= 5;
	return d === 1;
}

function buildToBase(
	slug: string,
	legacy: LegacyUnit,
	base: string,
	report: MigrationReport,
): ToBaseValue | undefined {
	const rows = (legacy.conversions ?? []).filter((row) => row.units === base);
	if (rows.length === 0) {
		if (FORMLESS_UNITS.has(slug) && (legacy.conversions ?? []).length === 0) {
			report.review(
				`units/${slug}: no conversion path to base '${base}' and no rows at all — emitted with no derivation form (not any magnitude's base unit)`,
			);
			return undefined;
		}
		throw new MigrationError(
			`units/${slug}: no conversions row targets base '${base}' — manual review`,
		);
	}
	const row = rows[0];
	if (rows.length !== 1 || row === undefined) {
		throw new MigrationError(`units/${slug}: multiple rows target base '${base}'`);
	}
	const toBase: ToBaseValue = { factor: '0' };
	if (row.formula !== undefined) {
		const coefficients = deriveAffine(row.formula);
		assertMatchesRowValue(coefficients, row.value, `units/${slug}`);
		toBase.factor = toExactNumber(coefficients.factor);
		if (!isZero(coefficients.offset)) toBase.offset = toExactNumber(coefficients.offset);
		report.temperature(
			`${slug}: factor ${describe(coefficients.factor)}, offset ${describe(coefficients.offset)} (from formula '${row.formula}', f(1) checked against row value ${row.value})`,
		);
	} else {
		const snapped = snapToRational(row.value);
		if (snapped !== undefined) {
			toBase.factor = snapped;
			report.addSnap();
			report.note(`units/${slug}: factor ${row.value} snapped to rational`);
		} else {
			toBase.factor = row.value;
		}
	}
	if (row.exact === false) toBase.exact = false;
	return toBase;
}

export function convertUnits(
	corpus: LegacyCorpus,
	magnitudes: MagnitudeResult,
	report: MigrationReport,
): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>();
	const prefixDecompositions = derivePrefixDecompositions(corpus, magnitudes);

	for (const [slug, legacy] of corpus.units) {
		const context = `units/${slug}`;
		auditKeys(legacy as unknown as Record<string, unknown>, KNOWN_KEYS, context);
		for (const row of legacy.conversions ?? []) {
			auditKeys(row as unknown as Record<string, unknown>, ROW_KEYS, `${context} conversions row`);
		}
		if (legacy.branches !== undefined) report.drop('units', 'branches', slug);
		if (legacy.baseUnit !== undefined) {
			report.drop('units', 'baseUnit (legacy prefix/inversion hint)', slug);
			if (slug === 'kilogram') {
				report.note(
					"units/kilogram: legacy declared baseUnit 'gram' — inverted relationship ignored; kilogram is mass's SI base, gram gets toBase factor '0.001'",
				);
			}
		}

		const unitOf = mapUnitOf(legacy, slug, magnitudes, report);
		const system = mapSystem(slug, legacy.type, report);

		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(legacy.name) },
		};
		const symbolOverride = SYMBOL_OVERRIDES[slug];
		if (symbolOverride !== undefined) {
			entity.symbol = { ...symbolOverride };
			report.review(
				`units/${slug}: legacy symbol is empty; overrode to tex '${symbolOverride.tex}' (dimension 1 convention)`,
			);
		} else {
			entity.symbol = mapSymbol(legacy.symbol, context);
		}
		entity.unitOf = unitOf;
		entity.system = system;

		const compose = COMPOSE_TABLE[slug];
		if (compose !== undefined) {
			const declared = legacy.units === undefined ? undefined : [...legacy.units].sort();
			const expected = compose.map((operand) => operand.unit).sort();
			if (declared === undefined) {
				report.note(
					`units/${slug}: composition derived from slug (legacy declares baseUnit '${legacy.baseUnit}' instead of units[])`,
				);
			} else if (declared.join(',') !== expected.join(',')) {
				report.review(
					`units/${slug}: legacy units[] {${declared.join(', ')}} mismatches compose table {${expected.join(', ')}}`,
				);
			}
			report.drop('units', 'units[] (composition source)', slug);
			entity.compose = compose.map((operand) => ({ ...operand }));
		} else if (magnitudes.baseUnits.has(slug)) {
			if (legacy.units !== undefined)
				report.drop('units', 'units[] (related compound units)', slug);
		} else {
			const decomposition = prefixDecompositions.get(slug);
			if (decomposition !== undefined) {
				verifyPrefixAgainstRow(slug, decomposition, legacy, corpus, report);
				entity.prefixOf = { ...decomposition };
			} else {
				const bases = new Set(unitOf.map((magnitude) => magnitudes.baseUnitOf.get(magnitude)));
				const base = [...bases][0];
				if (bases.size !== 1 || base === undefined) {
					throw new MigrationError(`${context}: unitOf magnitudes disagree on the base unit`);
				}
				const toBase = buildToBase(slug, legacy, base, report);
				if (toBase !== undefined) entity.toBase = { ...toBase };
			}
		}

		if (legacy.categories !== undefined && legacy.categories.length > 0) {
			entity.categories = [...legacy.categories];
		}
		const description = localized(legacy.description);
		if (description !== undefined) entity.description = description;
		else if (legacy.description === '') report.drop('units', 'description (empty string)', slug);
		const references = mapReferences(legacy.references, report, 'units', slug);
		if (references !== undefined) entity.references = references;

		if (slug === 'lumen-per-watt') {
			report.review(
				"units/lumen-per-watt: legacy unitOf ['speed'] is physically wrong (luminous efficacy, J·A²·M⁻¹·L⁻²·T³) but no such magnitude exists in the corpus — kept as-is",
			);
		}
		out.set(slug, entity);
	}
	return out;
}
