import rootPackage from '../../../../package.json';

/**
 * App version surfaced in the footer and settings page — the monorepo
 * version from the root package.json, resolved at build.
 */
export const SITE_VERSION: string = rootPackage.version;

export const GITHUB_URL = 'https://github.com/Equreka/Equreka';

export const LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';
