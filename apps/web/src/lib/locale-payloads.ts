import type { Locale } from '@equreka/core/i18n';

/**
 * The per-locale runtime data the islands fetch: search index, catalog-lite,
 * converter, offline reader and learning-path context. The service worker
 * caches exactly this set per locale for offline use (ADR 0013), so a
 * payload missing here would be fetched online only.
 */
export const LOCALE_PAYLOADS = ['search', 'catalog-lite', 'converter', 'reader', 'paths'] as const;

export type LocalePayload = (typeof LOCALE_PAYLOADS)[number];

/**
 * Root-relative URL of one locale payload. The build writes the files here,
 * the islands fetch them here and the service worker keys its data cache on
 * these URLs. Island-safe: pure strings.
 */
export function localePayloadUrl(payload: LocalePayload, locale: Locale): string {
	switch (payload) {
		case 'search':
			return `/search/${locale}.json`;
		case 'catalog-lite':
			return `/search/catalog-lite.${locale}.json`;
		case 'converter':
		case 'reader':
		case 'paths':
			return `/data/${payload}.${locale}.json`;
	}
}
