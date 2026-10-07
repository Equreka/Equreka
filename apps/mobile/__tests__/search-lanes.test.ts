import webIndexEn from '@equreka/content/artifact/search/en.json';
import webIndexEs from '@equreka/content/artifact/search/es.json';
import type { Locale } from '@equreka/core/i18n';
import { describe, expect, it } from '@jest/globals';
import { buildSearchLanes, runSearch } from '../features/search/use-search-lanes';

const WEB_INDEXES: Record<Locale, unknown> = { en: webIndexEn, es: webIndexEs };

describe('on-device search lanes', () => {
	it.each(['en', 'es'] as const)(
		'build the same index the web ships for %s, so ranking matches across platforms',
		(locale) => {
			const lanes = buildSearchLanes(locale);
			expect(JSON.parse(JSON.stringify(lanes.index))).toEqual(WEB_INDEXES[locale]);
		},
	);

	it('find an entry by a word of its lead but not by one only later paragraphs hold', () => {
		const lanes = buildSearchLanes('en');
		const keysOf = (query: string): string[] => runSearch(lanes, query).map((row) => row.key);
		expect(keysOf('navigation')).toContain('units:nautical-mile');
		expect(keysOf('abbreviation')).not.toContain('units:nautical-mile');
	});
});
