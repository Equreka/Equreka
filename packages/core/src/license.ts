import type { TextSourceLicense } from '@equreka/schema';
import { type Locale, t } from './i18n';

export interface LicenseLink {
	label: string;
	url: string;
}

export const REPOSITORY_URL = 'https://github.com/Equreka/Equreka';

export const REPOSITORY_LINK: LicenseLink = {
	label: 'github.com/Equreka/Equreka',
	url: REPOSITORY_URL,
};

/**
 * The attribution reusers give the content (ADR 0011), kept verbatim in
 * every locale so a credit is always the same string.
 */
export const CONTENT_ATTRIBUTION = 'Equreka contributors';

/**
 * Content (YAML prose and data, and every artifact built from it) is
 * CC BY-SA 4.0; this URL is the page's `rel="license"` and JSON-LD
 * `license`.
 */
export const CONTENT_LICENSE: LicenseLink = {
	label: 'CC BY-SA 4.0',
	url: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

export const CODE_LICENSE: LicenseLink = {
	label: 'GNU General Public License',
	url: 'https://www.gnu.org/licenses/gpl-3.0.html',
};

/**
 * Canonical deed of each license a `textSources` entry may cite. Public
 * domain points at the Public Domain Mark so every credit links somewhere
 * machine-readable.
 */
const TEXT_SOURCE_LICENSE_URLS: Record<TextSourceLicense, string> = {
	'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
	'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
	'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
	'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
	'public-domain': 'https://creativecommons.org/publicdomain/mark/1.0/',
};

/**
 * License names are proper names shown as-is in every locale, except the
 * public domain, which is a phrase.
 */
const TEXT_SOURCE_LICENSE_LABELS: Record<Exclude<TextSourceLicense, 'public-domain'>, string> = {
	'CC-BY-SA-4.0': 'CC BY-SA 4.0',
	'CC-BY-SA-3.0': 'CC BY-SA 3.0',
	'CC-BY-4.0': 'CC BY 4.0',
	'CC0-1.0': 'CC0 1.0',
};

export function textSourceLicenseUrl(license: TextSourceLicense): string {
	return TEXT_SOURCE_LICENSE_URLS[license];
}

export function textSourceLicenseLink(locale: Locale, license: TextSourceLicense): LicenseLink {
	return {
		label:
			license === 'public-domain'
				? t(locale, 'license.publicDomain')
				: TEXT_SOURCE_LICENSE_LABELS[license],
		url: textSourceLicenseUrl(license),
	};
}
