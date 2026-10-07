import { describe, expect, it } from 'vitest';
import { LOCALES, t, tParts } from '../i18n/index';
import {
	CONTENT_ATTRIBUTION,
	CONTENT_LICENSE,
	textSourceLicenseLink,
	textSourceLicenseUrl,
} from '../license';

const paramsOf = (parts: ReturnType<typeof tParts>) =>
	parts.filter((part) => part.kind === 'param').map((part) => part.name);

describe('license metadata', () => {
	it('points the content license at the CC BY-SA 4.0 deed', () => {
		expect(CONTENT_LICENSE.url).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
		expect(textSourceLicenseUrl('CC-BY-SA-4.0')).toBe(CONTENT_LICENSE.url);
	});

	it('names CC licenses verbatim and localizes only the public domain', () => {
		expect(textSourceLicenseLink('es', 'CC-BY-SA-3.0')).toEqual({
			label: 'CC BY-SA 3.0',
			url: 'https://creativecommons.org/licenses/by-sa/3.0/',
		});
		expect(textSourceLicenseLink('en', 'public-domain').label).toBe('public domain');
		expect(textSourceLicenseLink('es', 'public-domain').label).toBe('dominio público');
		expect(textSourceLicenseLink('en', 'public-domain').url).toBe(
			'https://creativecommons.org/publicdomain/mark/1.0/',
		);
	});
});

describe('license messages', () => {
	it('splits the attribution line around the source and license links in every locale', () => {
		for (const locale of LOCALES) {
			expect(paramsOf(tParts(locale, 'license.textAdaptedFrom')), locale).toEqual([
				'source',
				'license',
			]);
			expect(paramsOf(tParts(locale, 'license.content')), locale).toEqual([
				'license',
				'attribution',
			]);
			expect(paramsOf(tParts(locale, 'license.code')), locale).toEqual(['license']);
			expect(paramsOf(tParts(locale, 'license.repository')), locale).toEqual(['repository']);
		}
	});

	it('keeps the attribution string verbatim across locales', () => {
		for (const locale of LOCALES) {
			expect(
				t(locale, 'license.content', { license: 'x', attribution: CONTENT_ATTRIBUTION }),
			).toContain('Equreka contributors');
		}
	});
});
