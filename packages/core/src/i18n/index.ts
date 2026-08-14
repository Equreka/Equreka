import type { ErrorCode } from '@equreka/engine';
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
 * Localized message for an engine failure — every EngineError code has a
 * catalog entry under `engine.<code>` (statically checked: a code without
 * one fails typecheck here).
 */
export function engineMessage(locale: Locale, code: ErrorCode): string {
	return t(locale, `engine.${code}`);
}

const COLLECTION_KEYS: Record<string, MessageKey> = {
	categories: 'collection.categories',
	magnitudes: 'collection.magnitudes',
	units: 'collection.units',
	prefixes: 'collection.prefixes',
	constants: 'collection.constants',
	variables: 'collection.variables',
	equations: 'collection.equations',
	paths: 'collection.paths',
};

/**
 * Localized group label for a collection name, echoing the raw name for a
 * collection the catalog does not know (future-proof for artifact data).
 */
export function collectionLabel(locale: Locale, collection: string): string {
	const key = COLLECTION_KEYS[collection];
	return key === undefined ? collection : t(locale, key);
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
]);

/**
 * Minimal structural shape of the schema's localizedText — English source
 * plus optional translations.
 */
export interface LocalizedText {
	en: string;
	es?: string;
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
