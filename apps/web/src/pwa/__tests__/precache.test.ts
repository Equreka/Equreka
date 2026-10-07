import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { BUDGET_WARN_RATIO } from '@equreka/content/artifact-budgets';
import { LOCALES } from '@equreka/core/i18n';
import { afterAll, describe, expect, it } from 'vitest';
import { getManifest } from 'workbox-build';
import { LOCALE_PAYLOADS, localePayloadUrl } from '../../lib/locale-payloads';
import {
	accountOfflineInstall,
	budgetVerdict,
	describeOfflineInstall,
	OFFLINE_BUDGET_BYTES,
	SHELL_PRECACHE_GLOBS,
} from '../precache';

const SHELL_FILES = [
	'index.html',
	'es/index.html',
	'offline/index.html',
	'es/offline/index.html',
	'converter/index.html',
	'es/converter/index.html',
	'search/index.html',
	'es/search/index.html',
	'favorites/index.html',
	'es/favorites/index.html',
	'settings/index.html',
	'es/settings/index.html',
	'paths/index.html',
	'es/paths/index.html',
	'_astro/island.abc123.js',
	'_astro/global.def456.css',
	'katex/katex.min.css',
	'katex/fonts/KaTeX_Main-Regular.woff2',
	'fonts/poppins-latin-500-normal.woff2',
	'manifest.webmanifest',
	'icons/icon.svg',
	'brand/logo.svg',
	'pwa-register.js',
];

const NOT_PRECACHED = [
	'units/kelvin/index.html',
	'es/units/kelvin/index.html',
	'sw.js',
	'sw-data-cache.0123456789.js',
	'sitemap-index.xml',
	...LOCALES.flatMap((locale) =>
		LOCALE_PAYLOADS.map((payload) => localePayloadUrl(payload, locale).slice(1)),
	),
];

const distDir = mkdtempSync(join(tmpdir(), 'equreka-precache-'));

afterAll(() => {
	rmSync(distDir, { recursive: true, force: true });
});

describe('SHELL_PRECACHE_GLOBS', () => {
	it('selects the locale-neutral shell and no locale payload or entry page', async () => {
		for (const file of [...SHELL_FILES, ...NOT_PRECACHED]) {
			const path = join(distDir, file);
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, file);
		}
		const { manifestEntries } = await getManifest({
			globDirectory: distDir,
			globPatterns: [...SHELL_PRECACHE_GLOBS],
		});
		const urls = (manifestEntries ?? []).map((entry) =>
			typeof entry === 'string' ? entry : entry.url,
		);
		expect(urls.sort()).toEqual([...SHELL_FILES].sort());
	});
});

describe('accountOfflineInstall', () => {
	it('counts the shell plus the largest locale only', () => {
		const account = accountOfflineInstall(1000, { en: 300, es: 450 });
		expect(account.largestLocale).toBe('es');
		expect(account.totalBytes).toBe(1450);
	});

	it('keeps the first locale on a tie', () => {
		expect(accountOfflineInstall(10, { en: 5, es: 5 }).largestLocale).toBe('en');
	});

	it('describes the account for the build log', () => {
		const line = describeOfflineInstall(accountOfflineInstall(2048, { en: 1024, es: 3072 }), 12);
		expect(line).toBe(
			'offline install: shell 12 URLs 2.0 KiB + largest locale data (es) = 5.0 KiB of 6144.0 KiB (0.1%); locale data: en 1.0 KiB, es 3.0 KiB',
		);
	});
});

describe('budgetVerdict', () => {
	const warnFrom = Math.ceil(OFFLINE_BUDGET_BYTES * BUDGET_WARN_RATIO);

	it('warns from the shared warn ratio and fails over the budget', () => {
		expect(budgetVerdict(warnFrom - 1)).toBe('within');
		expect(budgetVerdict(warnFrom)).toBe('warn');
		expect(budgetVerdict(OFFLINE_BUDGET_BYTES)).toBe('warn');
		expect(budgetVerdict(OFFLINE_BUDGET_BYTES + 1)).toBe('over');
	});
});
