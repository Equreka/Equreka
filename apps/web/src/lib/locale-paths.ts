import type { Locale } from '@equreka/core/i18n';

/**
 * Site path for `path` (root-relative, en-tree form) in the given locale:
 * the default locale is unprefixed, es lives under /es (ADR 0002 i18n
 * routing, prefixDefaultLocale: false). Island-safe: pure strings.
 */
export function localePath(locale: Locale, path: string): string {
	return locale === 'en' ? path : `/es${path}`;
}
