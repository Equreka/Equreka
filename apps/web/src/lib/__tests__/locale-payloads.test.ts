import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES } from '@equreka/core/i18n';
import { describe, expect, it } from 'vitest';
import { LOCALE_PAYLOADS, localePayloadUrl } from '../locale-payloads';

const SRC_DIR = fileURLToPath(new URL('../../', import.meta.url));

/**
 * A string literal naming a payload path, which would fetch a payload the
 * service worker's data cache does not know about.
 */
const HARDCODED_PAYLOAD_URL = /['"`]\/(?:data|search)\/[^'"`]*\.json/;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
		return /\.(?:ts|tsx|astro)$/.test(entry.name) ? [path] : [];
	});
}

describe('localePayloadUrl', () => {
	it('gives each locale payload a distinct root-relative JSON URL', () => {
		const urls = LOCALES.flatMap((locale) =>
			LOCALE_PAYLOADS.map((payload) => localePayloadUrl(payload, locale)),
		);
		expect(new Set(urls).size).toBe(urls.length);
		expect(urls).toContain('/search/es.json');
		expect(urls).toContain('/search/catalog-lite.en.json');
		expect(urls).toContain('/data/reader.es.json');
		for (const url of urls) expect(url).toMatch(/^\/(?:data|search)\/[a-z.-]+\.json$/);
	});

	it('is the only source of payload URLs in the web app', () => {
		const offenders = sourceFiles(SRC_DIR)
			.filter((path) => !path.endsWith(join('lib', 'locale-payloads.ts')))
			.filter((path) => HARDCODED_PAYLOAD_URL.test(readFileSync(path, 'utf8')))
			.map((path) => relative(SRC_DIR, path));
		expect(offenders).toEqual([]);
	});
});
