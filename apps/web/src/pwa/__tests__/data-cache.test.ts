import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	type DataCacheExtendableEvent,
	type DataCacheFetchEvent,
	type DataCacheManifest,
	type DataCacheScope,
	type DataCacheStorage,
	type DataCacheStore,
	dataCacheName,
	dataFileOf,
	hexDigest,
	installDataCache,
	localeOfDataCache,
	localeOfPathname,
	localesToWarm,
	staleDataCaches,
} from '../data-cache';

const ORIGIN = 'https://equreka.test';

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

const BUILD_FILES: Record<string, Record<string, string>> = {
	en: { '/search/en.json': '{"index":"en"}', '/data/reader.en.json': '{"reader":"en"}' },
	es: { '/search/es.json': '{"index":"es"}', '/data/reader.es.json': '{"reader":"es"}' },
};

function manifestOf(files: Record<string, Record<string, string>>, version: string) {
	const locales: DataCacheManifest['locales'] = Object.fromEntries(
		Object.entries(files).map(([locale, bodies]) => [
			locale,
			{
				cacheName: dataCacheName(locale, version),
				files: Object.entries(bodies).map(([url, body]) => ({ url, sha256: sha256(body) })),
			},
		]),
	);
	return { defaultLocale: 'en', locales } satisfies DataCacheManifest;
}

const MANIFEST = manifestOf(BUILD_FILES, '1111aaaa');

class MemoryStore implements DataCacheStore {
	readonly entries = new Map<string, Response>();

	async match(url: string): Promise<Response | undefined> {
		return this.entries.get(url)?.clone();
	}

	async put(url: string, response: Response): Promise<void> {
		this.entries.set(url, response);
	}
}

class MemoryStorage implements DataCacheStorage {
	readonly stores = new Map<string, MemoryStore>();

	async keys(): Promise<string[]> {
		return [...this.stores.keys()];
	}

	async delete(cacheName: string): Promise<boolean> {
		return this.stores.delete(cacheName);
	}

	async open(cacheName: string): Promise<MemoryStore> {
		const existing = this.stores.get(cacheName);
		if (existing !== undefined) return existing;
		const created = new MemoryStore();
		this.stores.set(cacheName, created);
		return created;
	}

	async match(url: string, options: { cacheName: string }): Promise<Response | undefined> {
		return this.stores.get(options.cacheName)?.match(url);
	}

	async seed(cacheName: string, bodies: Record<string, string>): Promise<void> {
		const store = await this.open(cacheName);
		for (const [url, body] of Object.entries(bodies)) {
			await store.put(url, new Response(body));
		}
	}

	async text(cacheName: string, url: string): Promise<string | undefined> {
		return (await this.match(url, { cacheName }))?.text();
	}
}

interface Harness {
	scope: DataCacheScope;
	storage: MemoryStorage;
	served: Map<string, string>;
	fetched: string[];
	setOnline(online: boolean): void;
	install(): Promise<void>;
	activate(): Promise<void>;
	fetch(
		path: string,
		init?: { mode?: string; method?: string; origin?: string },
	): Promise<{ response?: Response; stopped: boolean; responded: boolean }>;
}

/**
 * A fake worker scope over an in-memory Cache Storage and a server that
 * serves `served` (URL to body) while online.
 */
function harness(clientUrls: readonly string[], manifest: DataCacheManifest = MANIFEST): Harness {
	const storage = new MemoryStorage();
	const served = new Map(Object.values(BUILD_FILES).flatMap((bodies) => Object.entries(bodies)));
	const fetched: string[] = [];
	let online = true;
	const lifecycle = new Map<string, (event: DataCacheExtendableEvent) => void>();
	let onFetch: ((event: DataCacheFetchEvent) => void) | undefined;

	const scope: DataCacheScope = {
		caches: storage,
		clients: { matchAll: async () => clientUrls.map((url) => ({ url })) },
		crypto: globalThis.crypto,
		location: { origin: ORIGIN },
		fetch: async (input) => {
			const url = new URL(typeof input === 'string' ? input : input.url, ORIGIN).pathname;
			fetched.push(url);
			if (!online) throw new TypeError('Failed to fetch');
			const body = served.get(url);
			return body === undefined
				? new Response('not found', { status: 404 })
				: new Response(body, {
						headers: {
							'content-type': 'application/json; charset=utf-8',
							'content-encoding': 'gzip',
							'content-length': '7',
						},
					});
		},
		addEventListener: (
			type: 'install' | 'activate' | 'fetch',
			listener: ((event: DataCacheExtendableEvent) => void) &
				((event: DataCacheFetchEvent) => void),
		) => {
			if (type === 'fetch') onFetch = listener;
			else lifecycle.set(type, listener);
		},
	};
	installDataCache(scope, manifest);

	const extend = async (type: 'install' | 'activate'): Promise<void> => {
		const waits: Promise<unknown>[] = [];
		lifecycle.get(type)?.({ waitUntil: (promise) => waits.push(promise) });
		await Promise.all(waits);
	};

	return {
		scope,
		storage,
		served,
		fetched,
		setOnline: (value) => {
			online = value;
		},
		install: () => extend('install'),
		activate: () => extend('activate'),
		fetch: async (path, init = {}) => {
			const waits: Promise<unknown>[] = [];
			let response: Promise<Response> | undefined;
			let stopped = false;
			onFetch?.({
				request: {
					url: `${init.origin ?? ORIGIN}${path}`,
					method: init.method ?? 'GET',
					mode: init.mode ?? 'cors',
				},
				waitUntil: (promise) => waits.push(promise),
				respondWith: (promise) => {
					response = promise;
				},
				stopImmediatePropagation: () => {
					stopped = true;
				},
			});
			await Promise.all(waits);
			return {
				...(response === undefined ? {} : { response: await response }),
				stopped,
				responded: response !== undefined,
			};
		},
	};
}

describe('data cache naming', () => {
	it('round-trips the locale through the cache name', () => {
		expect(dataCacheName('es', '9a79172aad666af9')).toBe('equreka-data-es-9a79172aad666af9');
		expect(localeOfDataCache('equreka-data-es-9a79172aad666af9')).toBe('es');
		expect(localeOfDataCache('equreka-data-pt-BR-0f0f')).toBe('pt-BR');
	});

	it('owns no cache outside its prefix', () => {
		expect(localeOfDataCache('equreka-pages')).toBeUndefined();
		expect(localeOfDataCache('equreka-assets')).toBeUndefined();
		expect(localeOfDataCache('workbox-precache-v2-https://equreka.com/')).toBeUndefined();
		expect(localeOfDataCache('equreka-data-')).toBeUndefined();
	});

	it('maps page paths to the locale tree that owns them', () => {
		expect(localeOfPathname('/', MANIFEST)).toBe('en');
		expect(localeOfPathname('/units/kelvin/', MANIFEST)).toBe('en');
		expect(localeOfPathname('/es/', MANIFEST)).toBe('es');
		expect(localeOfPathname('/es', MANIFEST)).toBe('es');
		expect(localeOfPathname('/es/units/kelvin/', MANIFEST)).toBe('es');
		expect(localeOfPathname('/esperanto/', MANIFEST)).toBe('en');
		expect(localeOfPathname('/en/', MANIFEST)).toBe('en');
		expect(localeOfPathname('/constructor/', MANIFEST)).toBe('en');
		expect(localeOfPathname('/__proto__/', MANIFEST)).toBe('en');
	});

	it('finds the locale set a payload URL belongs to', () => {
		expect(dataFileOf('/data/reader.es.json', MANIFEST)?.locale.cacheName).toBe(
			MANIFEST.locales.es?.cacheName,
		);
		expect(dataFileOf('/data/reader.fr.json', MANIFEST)).toBeUndefined();
		expect(dataFileOf('/units/kelvin/', MANIFEST)).toBeUndefined();
	});

	it('hex-encodes a digest', () => {
		expect(hexDigest(new Uint8Array([0, 15, 255]).buffer)).toBe('000fff');
	});
});

describe('purge and warm selection', () => {
	const current = [MANIFEST.locales.en?.cacheName ?? '', MANIFEST.locales.es?.cacheName ?? ''];

	it('purges older versions and dropped locales, never foreign caches', () => {
		const names = [
			...current,
			'equreka-data-en-0000dead',
			'equreka-data-fr-1111aaaa',
			'equreka-pages',
			'equreka-assets',
			'workbox-precache-v2-https://equreka.com/',
		];
		expect(staleDataCaches(names, MANIFEST)).toEqual([
			'equreka-data-en-0000dead',
			'equreka-data-fr-1111aaaa',
		]);
	});

	it('warms the open windows locales on a first install', () => {
		expect(localesToWarm([], [`${ORIGIN}/units/kelvin/`], MANIFEST)).toEqual(['en']);
		expect(localesToWarm([], [`${ORIGIN}/es/search/`], MANIFEST)).toEqual(['es']);
		expect(localesToWarm([], [], MANIFEST)).toEqual([]);
	});

	it('keeps every locale the reader already had, from any build', () => {
		expect(
			localesToWarm(
				['equreka-data-es-0000dead', 'equreka-data-fr-0000dead', 'equreka-pages'],
				[`${ORIGIN}/`],
				MANIFEST,
			),
		).toEqual(['en', 'es']);
	});
});

describe('installDataCache', () => {
	it('caches only the registering window locale on a first install', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		expect(await worker.storage.keys()).toEqual([MANIFEST.locales.en?.cacheName]);
		expect(
			await worker.storage.text(MANIFEST.locales.en?.cacheName ?? '', '/data/reader.en.json'),
		).toBe('{"reader":"en"}');
		expect(worker.fetched.sort()).toEqual(['/data/reader.en.json', '/search/en.json']);
	});

	it('stores the decoded body with its content type and no transfer headers', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		const stored = await worker.storage.match('/search/en.json', {
			cacheName: MANIFEST.locales.en?.cacheName ?? '',
		});
		expect(stored?.headers.get('content-type')).toBe('application/json; charset=utf-8');
		expect(stored?.headers.get('content-encoding')).toBeNull();
		expect(stored?.headers.get('content-length')).toBeNull();
	});

	it('fails the install and stores nothing when the server holds another build', async () => {
		const worker = harness([`${ORIGIN}/`]);
		worker.served.set('/data/reader.en.json', '{"reader":"next build"}');
		await expect(worker.install()).rejects.toThrow('bytes do not match this build');
		const store = worker.storage.stores.get(MANIFEST.locales.en?.cacheName ?? '');
		expect(store?.entries.size).toBe(0);
	});

	it('fails the install offline, as the precache does', async () => {
		const worker = harness([`${ORIGIN}/`]);
		worker.setOnline(false);
		await expect(worker.install()).rejects.toThrow('Failed to fetch');
	});

	it('moves every locale the reader had to the new build, then purges the old', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.storage.seed('equreka-data-en-0000dead', { '/search/en.json': 'old en' });
		await worker.storage.seed('equreka-data-es-0000dead', { '/search/es.json': 'old es' });
		await worker.install();
		await worker.activate();
		expect((await worker.storage.keys()).sort()).toEqual(
			[MANIFEST.locales.en?.cacheName, MANIFEST.locales.es?.cacheName].sort(),
		);
		expect(await worker.storage.text(MANIFEST.locales.es?.cacheName ?? '', '/search/es.json')).toBe(
			'{"index":"es"}',
		);
	});

	it('completes a partial cache by fetching only what it lacks', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.storage.seed(MANIFEST.locales.en?.cacheName ?? '', {
			'/search/en.json': '{"index":"en"}',
		});
		await worker.install();
		expect(worker.fetched).toEqual(['/data/reader.en.json']);
	});

	it('serves a cached payload without the network and stops propagation', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		worker.setOnline(false);
		const result = await worker.fetch('/data/reader.en.json');
		expect(result.stopped).toBe(true);
		expect(await result.response?.text()).toBe('{"reader":"en"}');
	});

	it('falls back to the network for a locale it has not cached', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		const online = await worker.fetch('/data/reader.es.json');
		expect(await online.response?.text()).toBe('{"reader":"es"}');
		expect(await worker.storage.keys()).toEqual([MANIFEST.locales.en?.cacheName]);
	});

	it('rejects an uncached payload offline so the island shows its message', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		worker.setOnline(false);
		await expect(worker.fetch('/data/reader.es.json')).rejects.toThrow('Failed to fetch');
	});

	it('caches the other locale when the reader navigates to its tree', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		const navigation = await worker.fetch('/es/units/kelvin/', { mode: 'navigate' });
		expect(navigation.responded).toBe(false);
		expect(navigation.stopped).toBe(false);
		expect(await worker.storage.text(MANIFEST.locales.es?.cacheName ?? '', '/search/es.json')).toBe(
			'{"index":"es"}',
		);
	});

	it('retries a navigation warm that failed offline', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		worker.setOnline(false);
		await worker.fetch('/es/', { mode: 'navigate' });
		worker.setOnline(true);
		await worker.fetch('/es/', { mode: 'navigate' });
		expect(
			await worker.storage.text(MANIFEST.locales.es?.cacheName ?? '', '/data/reader.es.json'),
		).toBe('{"reader":"es"}');
	});

	it('leaves other requests to Workbox', async () => {
		const worker = harness([`${ORIGIN}/`]);
		await worker.install();
		for (const request of [
			worker.fetch('/_astro/island.js'),
			worker.fetch('/data/reader.en.json', { method: 'POST' }),
			worker.fetch('/data/reader.en.json', { origin: 'https://cdn.example' }),
		]) {
			expect(await request).toEqual({ stopped: false, responded: false });
		}
	});
});
