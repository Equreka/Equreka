import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	COLLECTIONS,
	type CollectionName,
	collectionLocaleTrees,
	SOURCE_LOCALE,
	TRANSLATION_LOCALES,
	type TranslationLocale,
} from '@equreka/schema';
import { z } from 'zod';
import type { LoadedContent } from './load.js';
import { localizedPositions } from './locale-sidecar.js';
import { type Issue, issue } from './types.js';
import { fileOf } from './validate.js';

export const LOCALE_DEBT_FILE = 'locale-debt.json';

/**
 * Per translation locale, the `<collection>/<slug>` ids allowed to stay
 * incomplete until the content waves backfill them (ADR 0012). Shrink-only:
 * an entry whose entity is complete or gone fails the build.
 */
export type LocaleDebt = Readonly<Partial<Record<TranslationLocale, readonly string[]>>>;

const localeDebtSchema = z.partialRecord(z.enum(TRANSLATION_LOCALES), z.array(z.string().min(1)));

/**
 * An entity that authors English text with no translation beside it in one
 * locale. `file` is the sidecar the translation belongs in, `missing` the
 * positions it lacks, addressed as the sidecar addresses them.
 */
export interface LocaleGap {
	id: string;
	file: string;
	missing: string[];
}

/**
 * Coverage of one translation locale over every authored entity file;
 * generated prefixed units are not authored and never counted.
 */
export interface LocaleCoverage {
	locale: TranslationLocale;
	total: number;
	complete: number;
	inDebt: number;
}

export interface LocaleCompleteness {
	coverage: LocaleCoverage[];
	issues: Issue[];
}

export interface LocaleDebtRead {
	debt: LocaleDebt;
	issues: Issue[];
}

function hasText(value: unknown): boolean {
	return typeof value === 'string' && value.trim() !== '';
}

function entityId(collection: CollectionName, slug: string): string {
	return `${collection}/${slug}`;
}

/**
 * Entities of the loaded corpus whose English text lacks a `locale`
 * translation, in collection then slug order. The loaded corpus is the
 * entity files with their sidecars merged and before prefix expansion, so
 * a generated prefixed unit is never judged and a hand override is judged
 * on what it authors: its hand English needs a hand translation, and the
 * template-generated one the expansion merges in later does not count.
 */
export function localeGaps(loaded: LoadedContent, locale: TranslationLocale): LocaleGap[] {
	return COLLECTIONS.flatMap((collection) =>
		(loaded.byCollection.get(collection) ?? []).flatMap((entry) => {
			const missing = localizedPositions(collectionLocaleTrees[collection], entry.data)
				.filter(({ text }) => hasText(text[SOURCE_LOCALE]) && !hasText(text[locale]))
				.map(({ path }) => path);
			return missing.length === 0
				? []
				: [
						{
							id: entityId(collection, entry.file.slug),
							file: fileOf(collection, entry.file.slug, locale),
							missing,
						},
					];
		}),
	);
}

/**
 * Debt entries must be sorted and unique so the file diffs line by line
 * and a removal is never shadowed by a second copy of the same id.
 */
function debtShapeIssues(owed: readonly string[], locale: TranslationLocale): Issue[] {
	const duplicates = [...new Set(owed.filter((id, index) => owed.indexOf(id) !== index))].map(
		(id) => issue('error', 'locale', '', `${LOCALE_DEBT_FILE} ${locale}: duplicate entry '${id}'`),
	);
	const unsorted = owed.flatMap((id, index) => {
		const previous = owed[index - 1];
		return previous !== undefined && id < previous
			? [
					issue(
						'error',
						'locale',
						'',
						`${LOCALE_DEBT_FILE} ${locale}: entries must be sorted — '${id}' comes after '${previous}'`,
					),
				]
			: [];
	});
	return [...duplicates, ...unsorted];
}

function judgeLocale(
	loaded: LoadedContent,
	entityIds: ReadonlySet<string>,
	locale: TranslationLocale,
	owed: readonly string[],
): { coverage: LocaleCoverage; issues: Issue[] } {
	const gaps = localeGaps(loaded, locale);
	const owedIds = new Set(owed);
	const gapIds = new Set(gaps.map((gap) => gap.id));
	const unowed = gaps
		.filter((gap) => !owedIds.has(gap.id))
		.map((gap) =>
			issue(
				'error',
				'locale',
				gap.file,
				`incomplete ${locale} translation — missing: ${gap.missing.join(', ')}`,
			),
		);
	const stale = [...owedIds]
		.filter((id) => !gapIds.has(id))
		.map((id) =>
			issue(
				'error',
				'locale',
				'',
				`stale locale debt: remove '${id}' from ${LOCALE_DEBT_FILE} ${locale} (${entityIds.has(id) ? `its ${locale} translation is complete` : 'no such entity'})`,
			),
		);
	return {
		coverage: {
			locale,
			total: entityIds.size,
			complete: entityIds.size - gaps.length,
			inDebt: gaps.length - unowed.length,
		},
		issues: [...debtShapeIssues(owed, locale), ...unowed, ...stale],
	};
}

/**
 * Stage `locale` (ADR 0012): every translation locale translates every
 * localized field an entity authors in English. An incomplete entity is an
 * error unless the debt lists it, and a debt entry that no longer names an
 * incomplete entity is an error too, so the debt only ever shrinks.
 */
export function checkLocaleCompleteness(
	loaded: LoadedContent,
	debt: LocaleDebt,
): LocaleCompleteness {
	const entityIds = new Set(
		COLLECTIONS.flatMap((collection) =>
			(loaded.byCollection.get(collection) ?? []).map((entry) =>
				entityId(collection, entry.file.slug),
			),
		),
	);
	const judged = TRANSLATION_LOCALES.map((locale) =>
		judgeLocale(loaded, entityIds, locale, debt[locale] ?? []),
	);
	return {
		coverage: judged.map((result) => result.coverage),
		issues: judged.flatMap((result) => result.issues),
	};
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * Reads the debt from the package root. A missing file is an empty debt,
 * the state the ratchet ends in; a malformed one is an error naming the
 * file, never a silently empty debt.
 */
export function readLocaleDebt(packageRoot: string): LocaleDebtRead {
	const path = join(packageRoot, LOCALE_DEBT_FILE);
	if (!existsSync(path)) {
		return { debt: {}, issues: [] };
	}
	const json = parseJson(readFileSync(path, 'utf8'));
	if (!json.ok) {
		return {
			debt: {},
			issues: [issue('error', 'locale', '', `${LOCALE_DEBT_FILE}: ${json.message}`)],
		};
	}
	const parsed = localeDebtSchema.safeParse(json.value);
	if (!parsed.success) {
		return {
			debt: {},
			issues: parsed.error.issues.map((zodIssue) =>
				issue(
					'error',
					'locale',
					'',
					`${LOCALE_DEBT_FILE}: ${zodIssue.path.length > 0 ? zodIssue.path.join('.') : '(root)'}: ${zodIssue.message}`,
				),
			),
		};
	}
	return { debt: parsed.data, issues: [] };
}
