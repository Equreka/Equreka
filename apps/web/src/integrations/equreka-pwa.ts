import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '@equreka/tokens';
import type { AstroIntegration } from 'astro';
import { generateSW } from 'workbox-build';
import { bundleDataCacheWorker, planDataCache } from '../pwa/data-cache-build';
import {
	accountOfflineInstall,
	budgetVerdict,
	describeOfflineInstall,
	OFFLINE_BUDGET_BYTES,
	SHELL_PRECACHE_GLOBS,
} from '../pwa/precache';
import { BROWSER_TARGETS } from './browser-targets';

const DATA_CACHE_WORKER_ENTRY = 'src/pwa/data-cache-worker.ts';

/**
 * The seven-circle brand mark from docs/brand/logo-circles.svg, inlined so
 * the icons regenerate from tokens without a rasterizer dependency.
 */
const BRAND_CIRCLES: readonly { cx: number; cy: number; r: number }[] = [
	{ cx: 570, cy: 250, r: 250 },
	{ cx: 150, cy: 350, r: 150 },
	{ cx: 92.5, cy: 92.5, r: 92.5 },
	{ cx: 250, cy: 50, r: 50 },
	{ cx: 270, cy: 155, r: 30 },
	{ cx: 212.5, cy: 172.5, r: 12.5 },
	{ cx: 212.5, cy: 137.5, r: 12.5 },
];

function circlesMarkup(fill: string): string {
	return BRAND_CIRCLES.map(
		(circle) => `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${fill}"/>`,
	).join('');
}

/**
 * The mark is 820x500; "any" centers it in a square transparent canvas,
 * "maskable" shrinks it into the 80% safe zone on a full-bleed accent tile.
 */
function iconSvg(maskable: boolean): string {
	const accent = tokens.color.accent.light;
	if (!maskable) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 820"><title>Equreka</title><g transform="translate(0 160)">${circlesMarkup(accent)}</g></svg>\n`;
	}
	const inkOnAccent = tokens.color.accentInk.light;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Equreka</title><rect width="1024" height="1024" fill="${accent}"/><g transform="translate(102 262) scale(0.999)">${circlesMarkup(inkOnAccent)}</g></svg>\n`;
}

function webManifest(): string {
	return `${JSON.stringify(
		{
			name: 'Equreka',
			short_name: 'Equreka',
			description:
				'Open-source educational wiki and calculator for units, magnitudes, constants, and equations.',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			background_color: tokens.color.bg.light,
			theme_color: tokens.color.bg.light,
			icons: [
				{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
				{
					src: '/icons/icon-maskable.svg',
					sizes: 'any',
					type: 'image/svg+xml',
					purpose: 'maskable',
				},
			],
		},
		null,
		'\t',
	)}\n`;
}

/**
 * Offline layer per ADR 0002 (shell precache, never full-HTML).
 * config:setup materializes the manifest + icons from tokens; build:done
 * runs workbox-build generateSW over dist/. Navigations are NetworkFirst
 * into a runtime cache with the precached offline reader as fallback
 * (precacheFallback — generateSW's navigateFallback would shadow the
 * NetworkFirst route, serving the reader without ever trying the network);
 * /es/ navigations fall back to the es reader shell, registered first
 * because the first matching route wins. Other same-origin requests are
 * StaleWhileRevalidate. `from`/`magnitude`/`path`/`step` query params are
 * ignored for precache matching so shell routes still hit, and page-cache
 * lookups ignore the search string: static HTML never depends on it, so an
 * entry visited plain must still serve when revisited with `?path=`.
 *
 * Locale payloads are not precached (ADR 0013): build:done bundles the data
 * cache worker with this build's payload digests and generateSW imports it
 * ahead of Workbox, so it caches the reader's locale and owns those URLs.
 * The build fails when the shell plus the largest locale's payloads exceed
 * OFFLINE_BUDGET_BYTES and warns from the shared budget warn ratio.
 */
export function equrekaPwa(): AstroIntegration {
	let rootDir = '';
	return {
		name: 'equreka-pwa',
		hooks: {
			'astro:config:setup': ({ config }) => {
				rootDir = fileURLToPath(config.root);
				const publicDir = fileURLToPath(config.publicDir);
				const iconsDir = join(publicDir, 'icons');
				mkdirSync(iconsDir, { recursive: true });
				writeFileSync(join(iconsDir, 'icon.svg'), iconSvg(false));
				writeFileSync(join(iconsDir, 'icon-maskable.svg'), iconSvg(true));
				writeFileSync(join(publicDir, 'manifest.webmanifest'), webManifest());
			},
			'astro:build:done': async ({ dir, logger }) => {
				const distDir = fileURLToPath(dir);
				const { manifest, localeBytes } = planDataCache(distDir);
				const worker = await bundleDataCacheWorker(
					join(rootDir, DATA_CACHE_WORKER_ENTRY),
					manifest,
					BROWSER_TARGETS,
				);
				writeFileSync(join(distDir, worker.fileName), worker.contents);
				const { count, size, warnings } = await generateSW({
					swDest: join(distDir, 'sw.js'),
					globDirectory: distDir,
					globPatterns: [...SHELL_PRECACHE_GLOBS],
					importScripts: [`/${worker.fileName}`],
					maximumFileSizeToCacheInBytes: OFFLINE_BUDGET_BYTES,
					skipWaiting: false,
					clientsClaim: true,
					cleanupOutdatedCaches: true,
					sourcemap: false,
					inlineWorkboxRuntime: true,
					dontCacheBustURLsMatching: /^_astro\//,
					ignoreURLParametersMatching: [
						/^utm_/,
						/^fbclid$/,
						/^from$/,
						/^magnitude$/,
						/^path$/,
						/^step$/,
					],
					runtimeCaching: [
						{
							urlPattern: ({ request, url }) =>
								request.mode === 'navigate' && url.pathname.startsWith('/es/'),
							handler: 'NetworkFirst',
							options: {
								cacheName: 'equreka-pages',
								networkTimeoutSeconds: 4,
								matchOptions: { ignoreSearch: true },
								precacheFallback: { fallbackURL: '/es/offline/index.html' },
							},
						},
						{
							urlPattern: ({ request }) => request.mode === 'navigate',
							handler: 'NetworkFirst',
							options: {
								cacheName: 'equreka-pages',
								networkTimeoutSeconds: 4,
								matchOptions: { ignoreSearch: true },
								precacheFallback: { fallbackURL: '/offline/index.html' },
							},
						},
						{
							urlPattern: ({ sameOrigin, request }) => sameOrigin && request.mode !== 'navigate',
							handler: 'StaleWhileRevalidate',
							options: {
								cacheName: 'equreka-assets',
								expiration: { maxEntries: 200 },
							},
						},
					],
				});
				for (const warning of warnings) {
					logger.warn(warning);
				}
				const account = accountOfflineInstall(size, localeBytes);
				const summary = describeOfflineInstall(account, count);
				switch (budgetVerdict(account.totalBytes)) {
					case 'over':
						throw new Error(`equreka-pwa: ${summary}: over budget (ADR 0013)`);
					case 'warn':
						logger.warn(summary);
						break;
					case 'within':
						logger.info(summary);
						break;
				}
			},
		},
	};
}
