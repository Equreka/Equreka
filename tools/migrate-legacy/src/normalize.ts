import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';

export interface LegacySymbol {
	text?: string;
	html?: string;
	tex?: string;
}

export interface LegacyReference {
	title?: string;
	site?: string;
	url?: string;
	date?: string;
}

/**
 * Collapses legacy prose whitespace: any run containing two or more newlines
 * (the `\n \n` blank-line idiom) becomes a paragraph break, every other run
 * a single space. Backslashes ($TeX$ and \mag{}-style macros) pass verbatim.
 */
export function normalizeProse(raw: string): string {
	return raw
		.replace(/\s+/g, (run) => {
			const newlines = run.match(/\n/g)?.length ?? 0;
			return newlines >= 2 ? '\n\n' : ' ';
		})
		.trim();
}

export function localized(raw: string | null | undefined): { en: string } | undefined {
	if (raw === null || raw === undefined) return undefined;
	const normalized = normalizeProse(raw);
	return normalized === '' ? undefined : { en: normalized };
}

/**
 * Maps a legacy `{text, html, tex}` symbol to the schema form: TeX is the
 * source; plain text survives only when it differs from the TeX.
 */
export function mapSymbol(legacy: LegacySymbol, context: string): { tex: string; text?: string } {
	const tex = legacy.tex ?? '';
	if (tex === '') throw new MigrationError(`${context}: legacy symbol has empty tex`);
	if (legacy.text !== undefined && legacy.text !== '' && legacy.text !== tex) {
		return { tex, text: legacy.text };
	}
	return { tex };
}

export function mapReferences(
	references: LegacyReference[] | undefined,
	report: MigrationReport,
	collection: string,
	slug: string,
): Array<{ title: string; url: string }> | undefined {
	if (references === undefined || references.length === 0) return undefined;
	const mapped: Array<{ title: string; url: string }> = [];
	for (const reference of references) {
		if (reference.url === undefined || reference.url === '') {
			report.drop(collection, 'references (entry without url)', slug);
			continue;
		}
		if (reference.title === undefined || reference.title === '') {
			throw new MigrationError(`${collection}/${slug}: reference with url but no title`);
		}
		if (reference.site !== undefined) report.drop(collection, 'references[].site', slug);
		if (reference.date !== undefined) report.drop(collection, 'references[].date', slug);
		mapped.push({ title: reference.title, url: reference.url });
	}
	return mapped.length > 0 ? mapped : undefined;
}

/**
 * Zero-trust guard: every top-level key in a legacy file must be either
 * mapped or consciously dropped; anything else aborts the run.
 */
export function auditKeys(
	data: Record<string, unknown>,
	known: ReadonlySet<string>,
	context: string,
): void {
	for (const key of Object.keys(data)) {
		if (!known.has(key)) {
			throw new MigrationError(`${context}: unexpected legacy key "${key}"`);
		}
	}
}
