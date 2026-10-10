import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE, LOCALES } from '@equreka/core/i18n';
import { build } from 'esbuild';
import { LOCALE_PAYLOADS, localePayloadUrl } from '../lib/locale-payloads';
import {
	type DataCacheFile,
	type DataCacheLocale,
	type DataCacheManifest,
	dataCacheName,
} from './data-cache';

export function sha256Hex(bytes: Uint8Array | string): string {
	return createHash('sha256').update(bytes).digest('hex');
}

/**
 * 64 bits of a digest over the locale's url/digest pairs: a cache name that
 * changes whenever any byte of the set changes.
 */
export function dataCacheVersion(files: readonly DataCacheFile[]): string {
	const lines = files.map((file) => `${file.url} ${file.sha256}\n`).sort();
	return sha256Hex(lines.join('')).slice(0, 16);
}

export interface DataCachePlan {
	manifest: DataCacheManifest;
	localeBytes: Record<string, number>;
}

/**
 * Reads every locale's payloads from the built site and describes them for
 * the service worker, with each locale's byte total for the budget.
 */
export function planDataCache(distDir: string): DataCachePlan {
	const locales: Record<string, DataCacheLocale> = {};
	const localeBytes: Record<string, number> = {};
	for (const locale of LOCALES) {
		let bytes = 0;
		const files = LOCALE_PAYLOADS.map((payload) => {
			const url = localePayloadUrl(payload, locale);
			const content = readFileSync(join(distDir, url.slice(1)));
			bytes += content.byteLength;
			return { url, sha256: sha256Hex(content) };
		});
		locales[locale] = { cacheName: dataCacheName(locale, dataCacheVersion(files)), files };
		localeBytes[locale] = bytes;
	}
	return { manifest: { defaultLocale: DEFAULT_LOCALE, locales }, localeBytes };
}

/**
 * Bundles the worker entry into a classic script for `importScripts`, with
 * the manifest compiled in. The file name carries the content hash, so a
 * changed manifest changes `sw.js` and browsers install the update.
 */
export async function bundleDataCacheWorker(
	entry: string,
	manifest: DataCacheManifest,
	target: readonly string[],
): Promise<{ fileName: string; contents: Uint8Array }> {
	const result = await build({
		entryPoints: [entry],
		bundle: true,
		format: 'iife',
		minify: true,
		write: false,
		target: [...target],
		define: { DATA_CACHE_MANIFEST: JSON.stringify(manifest) },
		legalComments: 'none',
		logLevel: 'silent',
	});
	const output = result.outputFiles[0];
	if (output === undefined) throw new Error(`esbuild emitted nothing for ${entry}`);
	return {
		fileName: `sw-data-cache.${sha256Hex(output.contents).slice(0, 10)}.js`,
		contents: output.contents,
	};
}
