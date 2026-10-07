import type { EngineError, ErrorCode } from '@equreka/engine';
import { collectionLabelKey, isCollectionName } from '../collections';
import { en, type MessageKey } from './en';
import { es } from './es';

export type { MessageKey } from './en';
export { en } from './en';
export { es } from './es';

export const LOCALES = ['en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Catalog set consumed by `t`. English is complete by type; other locales
 * are partial and fall back to English per key.
 */
export interface Catalogs {
	en: Record<MessageKey, string>;
	es: Partial<Record<MessageKey, string>>;
}

export const CATALOGS: Catalogs = { en, es };

const PARAM_RE = /\{(\w+)\}/g;

function interpolate(template: string, params?: Record<string, string | number>): string {
	if (params === undefined) return template;
	return template.replace(PARAM_RE, (whole, name: string) => {
		const value = params[name];
		return value === undefined ? whole : String(value);
	});
}

/**
 * Typed UI-chrome accessor: the locale's string for `key` with `{param}`
 * tokens interpolated, falling back to English when the locale catalog
 * lacks the key. `catalogs` is injectable for tests only.
 */
export function t(
	locale: Locale,
	key: MessageKey,
	params?: Record<string, string | number>,
	catalogs: Catalogs = CATALOGS,
): string {
	const localized =
		locale === 'en' ? catalogs.en[key] : (catalogs[locale][key] ?? catalogs.en[key]);
	return interpolate(localized, params);
}

/**
 * One piece of a message split at its `{param}` tokens: literal text, or
 * the name of a param the UI fills with its own element (a link).
 */
export type MessagePart = { kind: 'text'; text: string } | { kind: 'param'; name: string };

/**
 * `t` for messages whose params are rich elements rather than strings:
 * the localized template split into text and param parts, in order, so
 * web and mobile interleave their own links without string concatenation.
 */
export function tParts(
	locale: Locale,
	key: MessageKey,
	catalogs: Catalogs = CATALOGS,
): MessagePart[] {
	const template = t(locale, key, undefined, catalogs);
	const parts: MessagePart[] = [];
	let from = 0;
	for (const match of template.matchAll(PARAM_RE)) {
		const at = match.index ?? 0;
		if (at > from) parts.push({ kind: 'text', text: template.slice(from, at) });
		parts.push({ kind: 'param', name: match[1] ?? '' });
		from = at + match[0].length;
	}
	if (from < template.length) parts.push({ kind: 'text', text: template.slice(from) });
	return parts;
}

/**
 * Localized message for an engine failure — every EngineError code has a
 * catalog entry under `engine.<code>` (statically checked: a code without
 * one fails typecheck here).
 */
export function engineMessage(locale: Locale, code: ErrorCode): string {
	return t(locale, `engine.${code}`);
}

function stringList(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

/**
 * `engineMessage` for a whole error: messages that name terms
 * (`inputs/required`, `inputs/not-integer`) interpolate `{terms}` from
 * `details.keys` and `{solvable}` from `details.solvable`, each key
 * rendered by `termName`, since only the UI knows how a term key reads.
 */
export function engineErrorMessage(
	locale: Locale,
	error: EngineError,
	termName: (key: string) => string,
): string {
	const names = (value: unknown): string => stringList(value).map(termName).join(', ');
	return t(locale, `engine.${error.code}`, {
		terms: names(error.details?.keys),
		solvable: names(error.details?.solvable),
	});
}

/**
 * Localized group label for a collection name, echoing the raw name for a
 * collection the catalog does not know (future-proof for artifact data).
 */
export function collectionLabel(locale: Locale, collection: string): string {
	return isCollectionName(collection) ? t(locale, collectionLabelKey(collection)) : collection;
}

/**
 * EngineError codes that describe an incomplete fill-all-but-one state
 * rather than a failed computation — UIs show these as muted guidance,
 * not alerts.
 */
export const ENGINE_HINT_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
	'inputs/empty',
	'inputs/underdetermined',
	'inputs/overdetermined',
	'inputs/required',
]);

/**
 * Minimal structural shape of the schema's localizedText — English source
 * plus optional translations.
 */
export interface LocalizedText {
	en: string;
	es?: string | undefined;
}

/**
 * A content field resolved for one locale: `untranslated` is true when the
 * field fell back to English, so UIs can attach a notice.
 */
export interface LocalizedValue {
	value: string;
	untranslated: boolean;
}

export function pickLocalized(text: LocalizedText, locale: Locale): LocalizedValue {
	const localized = locale === 'en' ? text.en : text[locale];
	return localized === undefined
		? { value: text.en, untranslated: true }
		: { value: localized, untranslated: false };
}

/**
 * Convenience for the ubiquitous `entity.name` case: the localized name
 * string with silent English fallback.
 */
export function localizedName(entity: { name: LocalizedText }, locale: Locale): string {
	return pickLocalized(entity.name, locale).value;
}
