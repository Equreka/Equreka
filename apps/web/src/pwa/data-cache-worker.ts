import { type DataCacheManifest, type DataCacheScope, installDataCache } from './data-cache';

/**
 * The service worker global, typed as the subset the data cache uses.
 */
declare const self: DataCacheScope;

/**
 * Replaced with the build's manifest literal by the bundler's `define`.
 */
declare const DATA_CACHE_MANIFEST: DataCacheManifest;

installDataCache(self, DATA_CACHE_MANIFEST);
