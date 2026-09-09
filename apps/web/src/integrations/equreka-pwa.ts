import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '@equreka/tokens';
import type { AstroIntegration } from 'astro';
import { generateSW } from 'workbox-build';

/**
 * Explicit precache globs per ADR 0002: app-shell routes (both locale
 * trees) + island bundles + KaTeX + the per-locale data bundles.
 * Deliberately not a catch-all HTML glob — entry pages are runtime-cached,
 * so a chunk change never invalidates all of them; never-visited entries
 * resolve through the offline reader and its precached reader payload.
 */
const PRECACHE_GLOBS = [
	'{,es/}index.html',
	'{,es/}offline/index.html',
	'{,es/}converter/index.html',
	'{,es/}search/index.html',
	'{,es/}favorites/index.html',
	'{,es/}settings/index.html',
	'{,es/}paths/index.html',
	'_astro/*.js',
	'_astro/*.css',
	'katex/katex.min.css',
	'katex/fonts/*.woff2',
	'search/{en,es}.json',
	'search/catalog-lite.{en,es}.json',
	'data/converter.{en,es}.json',
	'data/reader.{en,es}.json',
	'data/paths.{en,es}.json',
	'manifest.webmanifest',
	'icons/*.svg',
	'pwa-register.js',
];

const PRECACHE_BUDGET_BYTES = 6 * 1024 * 1024;

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
			theme_color: tokens.color.accent.light,
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
 * Offline layer per ADR 0002 (shell + bundle precache, never full-HTML).
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
 */
export function equrekaPwa(): AstroIntegration {
	return {
		name: 'equreka-pwa',
		hooks: {
			'astro:config:setup': ({ config }) => {
				const publicDir = fileURLToPath(config.publicDir);
				const iconsDir = join(publicDir, 'icons');
				mkdirSync(iconsDir, { recursive: true });
				writeFileSync(join(iconsDir, 'icon.svg'), iconSvg(false));
				writeFileSync(join(iconsDir, 'icon-maskable.svg'), iconSvg(true));
				writeFileSync(join(publicDir, 'manifest.webmanifest'), webManifest());
			},
			'astro:build:done': async ({ dir, logger }) => {
				const distDir = fileURLToPath(dir);
				const { count, size, warnings } = await generateSW({
					swDest: join(distDir, 'sw.js'),
					globDirectory: distDir,
					globPatterns: [...PRECACHE_GLOBS],
					maximumFileSizeToCacheInBytes: PRECACHE_BUDGET_BYTES,
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
				logger.info(
					`precache manifest: ${count} URLs, ${(size / 1024).toFixed(1)} KiB (budget ${PRECACHE_BUDGET_BYTES / 1024} KiB)`,
				);
				if (size > PRECACHE_BUDGET_BYTES) {
					throw new Error(
						`equreka-pwa: precache manifest ${size} bytes exceeds the ${PRECACHE_BUDGET_BYTES}-byte budget (ADR 0002)`,
					);
				}
			},
		},
	};
}
