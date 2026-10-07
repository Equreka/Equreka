/**
 * One cached payload: its root-relative URL and the SHA-256 (lowercase hex)
 * of the exact bytes this build emitted.
 */
export interface DataCacheFile {
	url: string;
	sha256: string;
}

/**
 * One locale's payload set. `cacheName` embeds a hash of every file's
 * digest, so a content change yields a new cache and a cache only ever
 * holds one build's bytes.
 */
export interface DataCacheLocale {
	cacheName: string;
	files: readonly DataCacheFile[];
}

/**
 * What the build injects into the service worker (ADR 0013). The default
 * locale owns the unprefixed URL tree; every other locale owns `/<locale>/`.
 */
export interface DataCacheManifest {
	defaultLocale: string;
	locales: Readonly<Record<string, DataCacheLocale>>;
}

/**
 * Distinct from the Workbox precache and the `equreka-pages` /
 * `equreka-assets` runtime caches, so activation purges only data caches.
 */
export const DATA_CACHE_PREFIX = 'equreka-data-';

export function dataCacheName(locale: string, version: string): string {
	return `${DATA_CACHE_PREFIX}${locale}-${version}`;
}

/**
 * Inverse of `dataCacheName`: the version is dash-free hex, so the locale
 * is everything before the last dash.
 */
export function localeOfDataCache(cacheName: string): string | undefined {
	if (!cacheName.startsWith(DATA_CACHE_PREFIX)) return undefined;
	const rest = cacheName.slice(DATA_CACHE_PREFIX.length);
	const separator = rest.lastIndexOf('-');
	return separator > 0 ? rest.slice(0, separator) : undefined;
}

/**
 * Own-property lookup: a path segment such as `constructor` must not
 * resolve through the prototype. `Object.hasOwn` is past the Safari 15 floor.
 */
export function manifestLocale(
	manifest: DataCacheManifest,
	locale: string,
): DataCacheLocale | undefined {
	return Object.hasOwn(manifest.locales, locale) ? manifest.locales[locale] : undefined;
}

/**
 * The interface locale a page path belongs to, mirroring Astro's
 * `prefixDefaultLocale: false` routing.
 */
export function localeOfPathname(pathname: string, manifest: DataCacheManifest): string {
	const segment = pathname.split('/')[1] ?? '';
	return segment !== manifest.defaultLocale && manifestLocale(manifest, segment) !== undefined
		? segment
		: manifest.defaultLocale;
}

export function dataFileOf(
	pathname: string,
	manifest: DataCacheManifest,
): { locale: DataCacheLocale; file: DataCacheFile } | undefined {
	for (const locale of Object.values(manifest.locales)) {
		const file = locale.files.find((candidate) => candidate.url === pathname);
		if (file !== undefined) return { locale, file };
	}
	return undefined;
}

/**
 * Data caches this build does not own: older versions of any locale and
 * locales the build no longer ships.
 */
export function staleDataCaches(
	cacheNames: readonly string[],
	manifest: DataCacheManifest,
): string[] {
	const current = new Set(Object.values(manifest.locales).map((locale) => locale.cacheName));
	return cacheNames.filter((name) => name.startsWith(DATA_CACHE_PREFIX) && !current.has(name));
}

/**
 * Locales an installing worker caches before it may activate: every locale
 * the reader has a data cache for, from any build, so an update never drops
 * offline data the reader had, plus the locale of every open window, which
 * on a first install is the page that registered the worker.
 */
export function localesToWarm(
	cacheNames: readonly string[],
	clientUrls: readonly string[],
	manifest: DataCacheManifest,
): string[] {
	const locales = new Set<string>();
	for (const name of cacheNames) {
		const locale = localeOfDataCache(name);
		if (locale !== undefined && manifestLocale(manifest, locale) !== undefined) locales.add(locale);
	}
	for (const url of clientUrls) {
		locales.add(localeOfPathname(new URL(url).pathname, manifest));
	}
	return [...locales].sort();
}

export function hexDigest(digest: ArrayBuffer): string {
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The fields of a FetchEvent's request the data cache reads.
 */
export interface DataCacheRequest {
	readonly url: string;
	readonly method: string;
	readonly mode: string;
}

export interface DataCacheExtendableEvent {
	waitUntil(promise: Promise<unknown>): void;
}

export interface DataCacheFetchEvent extends DataCacheExtendableEvent {
	readonly request: DataCacheRequest;
	respondWith(response: Promise<Response>): void;
	stopImmediatePropagation(): void;
}

export interface DataCacheStore {
	match(url: string): Promise<Response | undefined>;
	put(url: string, response: Response): Promise<void>;
}

export interface DataCacheStorage {
	keys(): Promise<string[]>;
	delete(cacheName: string): Promise<boolean>;
	open(cacheName: string): Promise<DataCacheStore>;
	match(url: string, options: { cacheName: string }): Promise<Response | undefined>;
}

/**
 * The slice of ServiceWorkerGlobalScope the data cache uses. The worker
 * entry passes `self`; tests pass an in-memory fake.
 */
export interface DataCacheScope {
	readonly caches: DataCacheStorage;
	readonly clients: {
		matchAll(options: {
			type: 'window';
			includeUncontrolled: boolean;
		}): Promise<readonly { readonly url: string }[]>;
	};
	readonly crypto: { readonly subtle: Pick<SubtleCrypto, 'digest'> };
	readonly location: { readonly origin: string };
	fetch(input: string | DataCacheRequest, init?: RequestInit): Promise<Response>;
	addEventListener(
		type: 'install' | 'activate',
		listener: (event: DataCacheExtendableEvent) => void,
	): void;
	addEventListener(type: 'fetch', listener: (event: DataCacheFetchEvent) => void): void;
}

/**
 * Fetches past the HTTP cache and rejects bytes that are not this build's:
 * during a deploy the server may already serve the next build, and storing
 * those under this build's cache name would mix versions. The stored
 * response carries the content type only: the body is already decoded, so
 * the server's encoding and length headers would misdescribe it.
 */
async function fetchVerified(
	scope: DataCacheScope,
	file: DataCacheFile,
): Promise<{ url: string; response: Response }> {
	const response = await scope.fetch(file.url, { cache: 'no-cache', credentials: 'same-origin' });
	if (!response.ok) throw new Error(`${file.url}: HTTP ${response.status}`);
	const body = await response.arrayBuffer();
	const digest = hexDigest(await scope.crypto.subtle.digest('SHA-256', body));
	if (digest !== file.sha256) throw new Error(`${file.url}: bytes do not match this build`);
	const contentType = response.headers.get('content-type') ?? 'application/json';
	return {
		url: file.url,
		response: new Response(body, { headers: { 'content-type': contentType } }),
	};
}

/**
 * Stores whatever the locale's cache lacks. Nothing is written until every
 * missing file has arrived and verified; a write cut short leaves a cache
 * that the next warm completes, never one that mixes builds.
 */
async function warmLocale(scope: DataCacheScope, locale: DataCacheLocale): Promise<void> {
	const cache = await scope.caches.open(locale.cacheName);
	const present = await Promise.all(locale.files.map((file) => cache.match(file.url)));
	const missing = locale.files.filter((_, index) => present[index] === undefined);
	if (missing.length === 0) return;
	const verified = await Promise.all(missing.map((file) => fetchVerified(scope, file)));
	await Promise.all(verified.map(({ url, response }) => cache.put(url, response)));
}

/**
 * Registers the data cache's install, activate and fetch listeners. They
 * must run before Workbox's: the generated worker calls `importScripts`
 * ahead of its own registrations, and a data request answered here stops
 * propagation so Workbox's same-origin runtime route never sees it.
 *
 * - install: warms `localesToWarm` and fails the install if that fails,
 *   as the precache does, so a worker never activates without them.
 * - activate: deletes `staleDataCaches`.
 * - navigation: warms the page's locale in the background (a locale switch).
 * - data request: cache first, network on a miss; offline, the island shows
 *   its own unavailable message.
 */
export function installDataCache(scope: DataCacheScope, manifest: DataCacheManifest): void {
	const warming = new Map<string, Promise<void>>();

	const warm = (localeCode: string): Promise<void> => {
		const locale = manifestLocale(manifest, localeCode);
		if (locale === undefined) return Promise.resolve();
		const known = warming.get(localeCode);
		if (known !== undefined) return known;
		const started = warmLocale(scope, locale).catch((error: unknown) => {
			warming.delete(localeCode);
			throw error;
		});
		warming.set(localeCode, started);
		return started;
	};

	scope.addEventListener('install', (event) => {
		event.waitUntil(
			Promise.all([
				scope.caches.keys(),
				scope.clients.matchAll({ type: 'window', includeUncontrolled: true }),
			]).then(([cacheNames, clients]) =>
				Promise.all(
					localesToWarm(
						cacheNames,
						clients.map((client) => client.url),
						manifest,
					).map(warm),
				),
			),
		);
	});

	scope.addEventListener('activate', (event) => {
		event.waitUntil(
			scope.caches
				.keys()
				.then((cacheNames) =>
					Promise.all(
						staleDataCaches(cacheNames, manifest).map((name) => scope.caches.delete(name)),
					),
				),
		);
	});

	scope.addEventListener('fetch', (event) => {
		const { request } = event;
		if (request.method !== 'GET') return;
		const url = new URL(request.url);
		if (url.origin !== scope.location.origin) return;
		if (request.mode === 'navigate') {
			event.waitUntil(warm(localeOfPathname(url.pathname, manifest)).catch(() => undefined));
			return;
		}
		const target = dataFileOf(url.pathname, manifest);
		if (target === undefined) return;
		event.respondWith(
			scope.caches
				.match(target.file.url, { cacheName: target.locale.cacheName })
				.then((cached) => cached ?? scope.fetch(request)),
		);
		event.stopImmediatePropagation();
	});
}
