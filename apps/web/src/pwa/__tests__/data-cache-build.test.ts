import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { LOCALES } from '@equreka/core/i18n';
import { afterEach, describe, expect, it } from 'vitest';
import { BROWSER_TARGETS } from '../../integrations/browser-targets';
import { LOCALE_PAYLOADS, localePayloadUrl } from '../../lib/locale-payloads';
import { dataCacheName } from '../data-cache';
import {
	bundleDataCacheWorker,
	dataCacheVersion,
	planDataCache,
	sha256Hex,
} from '../data-cache-build';

const WORKER_ENTRY = fileURLToPath(new URL('../data-cache-worker.ts', import.meta.url));

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function distWith(bodyOf: (url: string) => string): string {
	const distDir = mkdtempSync(join(tmpdir(), 'equreka-data-cache-'));
	tempDirs.push(distDir);
	for (const locale of LOCALES) {
		for (const payload of LOCALE_PAYLOADS) {
			const url = localePayloadUrl(payload, locale);
			const path = join(distDir, url.slice(1));
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, bodyOf(url));
		}
	}
	return distDir;
}

describe('planDataCache', () => {
	it('describes every locale payload with the digest of its bytes', () => {
		const { manifest, localeBytes } = planDataCache(distWith((url) => `{"url":"${url}"}`));
		expect(manifest.defaultLocale).toBe('en');
		expect(Object.keys(manifest.locales)).toEqual([...LOCALES]);
		for (const locale of LOCALES) {
			const entry = manifest.locales[locale];
			const urls = LOCALE_PAYLOADS.map((payload) => localePayloadUrl(payload, locale));
			expect(entry?.files.map((file) => file.url)).toEqual(urls);
			expect(entry?.files.map((file) => file.sha256)).toEqual(
				urls.map((url) => sha256Hex(`{"url":"${url}"}`)),
			);
			expect(entry?.cacheName).toBe(dataCacheName(locale, dataCacheVersion(entry?.files ?? [])));
			expect(localeBytes[locale]).toBe(
				urls.reduce((sum, url) => sum + Buffer.byteLength(`{"url":"${url}"}`), 0),
			);
		}
	});

	it('renames a locale cache when any of its bytes change, and only that locale', () => {
		const before = planDataCache(distWith(() => '{}')).manifest;
		const after = planDataCache(
			distWith((url) => (url === '/data/reader.es.json' ? '{"changed":true}' : '{}')),
		).manifest;
		expect(after.locales.en?.cacheName).toBe(before.locales.en?.cacheName);
		expect(after.locales.es?.cacheName).not.toBe(before.locales.es?.cacheName);
	});

	it('fails when a locale payload is missing from the build', () => {
		const distDir = distWith(() => '{}');
		rmSync(join(distDir, 'data', 'paths.es.json'));
		expect(() => planDataCache(distDir)).toThrow(/paths\.es\.json/);
	});
});

describe('dataCacheVersion', () => {
	it('is a 64-bit hex digest independent of file order', () => {
		const files = [
			{ url: '/a.json', sha256: 'aa' },
			{ url: '/b.json', sha256: 'bb' },
		];
		expect(dataCacheVersion(files)).toMatch(/^[0-9a-f]{16}$/);
		expect(dataCacheVersion([...files].reverse())).toBe(dataCacheVersion(files));
		expect(dataCacheVersion([{ url: '/a.json', sha256: 'ab' }, files[1] ?? files[0]])).not.toBe(
			dataCacheVersion(files),
		);
	});
});

describe('bundleDataCacheWorker', () => {
	it('emits a hashed classic script that installs the data cache with the manifest', async () => {
		const { manifest } = planDataCache(distWith(() => '{}'));
		const worker = await bundleDataCacheWorker(WORKER_ENTRY, manifest, BROWSER_TARGETS);
		expect(worker.fileName).toMatch(/^sw-data-cache\.[0-9a-f]{10}\.js$/);

		const code = new TextDecoder().decode(worker.contents);
		expect(code).not.toMatch(/^\s*(?:import|export)\b/m);
		expect(code).toContain(manifest.locales.es?.cacheName);

		const registered: string[] = [];
		const self = {
			addEventListener: (type: string) => {
				registered.push(type);
			},
		};
		runInNewContext(code, { self });
		expect(registered).toEqual(['install', 'activate', 'fetch']);
	});

	it('renames the script when the manifest changes', async () => {
		const first = planDataCache(distWith(() => '{}')).manifest;
		const second = planDataCache(distWith(() => '{"next":true}')).manifest;
		const [a, b] = await Promise.all([
			bundleDataCacheWorker(WORKER_ENTRY, first, BROWSER_TARGETS),
			bundleDataCacheWorker(WORKER_ENTRY, second, BROWSER_TARGETS),
		]);
		expect(a.fileName).not.toBe(b.fileName);
	});
});
