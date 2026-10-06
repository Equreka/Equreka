import {
	type LocaleNode,
	SOURCE_LOCALE,
	TRANSLATION_LOCALES,
	type TranslationLocale,
} from '@equreka/schema';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A content filename split into its entity slug and, for a translation
 * sidecar (`<slug>.<locale>.yaml`), the locale it carries.
 */
export type ContentFilename =
	| { ok: true; slug: string; locale: TranslationLocale | null }
	| { ok: false; message: string };

export function parseContentFilename(name: string): ContentFilename {
	const stem = name.slice(0, -'.yaml'.length);
	const [slug = '', locale, ...rest] = stem.split('.');
	if (!SLUG_RE.test(slug) || rest.length > 0) {
		return {
			ok: false,
			message: 'filename must be <kebab-case-slug>.yaml or <kebab-case-slug>.<locale>.yaml',
		};
	}
	if (locale === undefined) {
		return { ok: true, slug, locale: null };
	}
	if (locale === SOURCE_LOCALE) {
		return {
			ok: false,
			message: `'${SOURCE_LOCALE}' is the source locale — its text lives in ${slug}.yaml, not a sidecar`,
		};
	}
	if (!isTranslationLocale(locale)) {
		return {
			ok: false,
			message: `unknown locale '${locale}' (supported: ${TRANSLATION_LOCALES.join(', ')})`,
		};
	}
	return { ok: true, slug, locale };
}

function isTranslationLocale(value: string): value is TranslationLocale {
	return (TRANSLATION_LOCALES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function childPath(at: string, key: string): string {
	return at === '' ? key : `${at}.${key}`;
}

/**
 * Every key other than the source locale found at a localized position of a
 * raw entity file — translations belong in sidecars only, so each hit is an
 * error; the paths address array items by id, matching the sidecar form.
 */
export function inlineLocaleKeys(node: LocaleNode, value: unknown, at = ''): string[] {
	switch (node.kind) {
		case 'text':
			return isRecord(value)
				? Object.keys(value)
						.filter((key) => key !== SOURCE_LOCALE)
						.map((key) => childPath(at, key))
				: [];
		case 'object':
			return isRecord(value)
				? Object.entries(node.fields).flatMap(([key, child]) =>
						inlineLocaleKeys(child, value[key], childPath(at, key)),
					)
				: [];
		case 'keyed': {
			if (node.by === 'key') {
				return isRecord(value)
					? Object.entries(value).flatMap(([key, item]) =>
							inlineLocaleKeys(node.item, item, childPath(at, key)),
						)
					: [];
			}
			return Array.isArray(value)
				? value.flatMap((item: unknown, index) => {
						const id = isRecord(item) && typeof item.id === 'string' ? item.id : String(index);
						return inlineLocaleKeys(node.item, item, childPath(at, id));
					})
				: [];
		}
	}
}

export interface SidecarMerge {
	data: unknown;
	errors: string[];
}

/**
 * Folds one validated sidecar into its entity's raw data, returning a new
 * value (the input is never mutated). Each translation must land on text the
 * entity actually authors — a step id, term key or optional field the entity
 * lacks is an error, never a silently dropped string.
 */
export function mergeSidecar(
	node: LocaleNode,
	target: unknown,
	sidecar: unknown,
	locale: TranslationLocale,
	at = '',
): SidecarMerge {
	const where = at === '' ? '(root)' : at;
	switch (node.kind) {
		case 'text':
			if (!isRecord(target)) {
				return {
					data: target,
					errors: [`${where}: the entity has no ${SOURCE_LOCALE} text here to translate`],
				};
			}
			return { data: { ...target, [locale]: sidecar }, errors: [] };
		case 'object': {
			if (!isRecord(target) || !isRecord(sidecar)) {
				return { data: target, errors: [`${where}: the entity has no such field to translate`] };
			}
			const errors: string[] = [];
			const data: Record<string, unknown> = { ...target };
			for (const [key, value] of Object.entries(sidecar)) {
				const child = node.fields[key];
				if (child === undefined) {
					errors.push(`${childPath(at, key)}: not a localized field`);
					continue;
				}
				const merged = mergeSidecar(child, target[key], value, locale, childPath(at, key));
				data[key] = merged.data;
				errors.push(...merged.errors);
			}
			return { data, errors };
		}
		case 'keyed':
			return node.by === 'id'
				? mergeById(node.item, target, sidecar, locale, where, at)
				: mergeByKey(node.item, target, sidecar, locale, where, at);
	}
}

function mergeById(
	item: LocaleNode,
	target: unknown,
	sidecar: unknown,
	locale: TranslationLocale,
	where: string,
	at: string,
): SidecarMerge {
	if (!Array.isArray(target) || !isRecord(sidecar)) {
		return { data: target, errors: [`${where}: the entity has no such list to translate`] };
	}
	const errors: string[] = [];
	let data: unknown[] = target;
	for (const [id, value] of Object.entries(sidecar)) {
		const index = data.findIndex((entry) => isRecord(entry) && entry.id === id);
		if (index === -1) {
			errors.push(`${childPath(at, id)}: the entity has no item with id '${id}'`);
			continue;
		}
		const merged = mergeSidecar(item, data[index], value, locale, childPath(at, id));
		data = data.map((entry, position) => (position === index ? merged.data : entry));
		errors.push(...merged.errors);
	}
	return { data, errors };
}

function mergeByKey(
	item: LocaleNode,
	target: unknown,
	sidecar: unknown,
	locale: TranslationLocale,
	where: string,
	at: string,
): SidecarMerge {
	if (!isRecord(target) || !isRecord(sidecar)) {
		return { data: target, errors: [`${where}: the entity has no such map to translate`] };
	}
	const errors: string[] = [];
	const data: Record<string, unknown> = { ...target };
	for (const [key, value] of Object.entries(sidecar)) {
		if (!(key in target)) {
			errors.push(`${childPath(at, key)}: the entity has no entry keyed '${key}'`);
			continue;
		}
		const merged = mergeSidecar(item, target[key], value, locale, childPath(at, key));
		data[key] = merged.data;
		errors.push(...merged.errors);
	}
	return { data, errors };
}
