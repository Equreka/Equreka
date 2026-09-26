import type { KVStorage } from '@equreka/core';
import Storage from 'expo-sqlite/kv-store';

/**
 * Minimal surface of expo-sqlite/kv-store the adapter needs — injected so
 * tests and the memory fallback share one adapter implementation.
 */
export interface SyncKVBackend {
	getItemSync(key: string): string | null;
	setItemSync(key: string, value: string): void;
	removeItemSync(key: string): boolean;
}

/**
 * The mobile KVStorage adapter over expo-sqlite/kv-store's synchronous API
 * (ADR 0002: Expo Go-compatible, not MMKV). One JS context per app, so the
 * change channel is an in-process listener registry fired after every
 * write; reads are guarded so a locked or missing database degrades to
 * "no value" instead of crashing the hooks.
 */
export function createSqliteKVStorage(backend: SyncKVBackend): KVStorage {
	const listeners = new Map<string, Set<() => void>>();
	const notify = (key: string): void => {
		for (const listener of listeners.get(key) ?? []) listener();
	};
	return {
		get: (key) => {
			try {
				return backend.getItemSync(key);
			} catch {
				return null;
			}
		},
		set: (key, value) => {
			try {
				backend.setItemSync(key, value);
			} catch {
				return;
			}
			notify(key);
		},
		remove: (key) => {
			try {
				backend.removeItemSync(key);
			} catch {
				return;
			}
			notify(key);
		},
		subscribe: (key, listener) => {
			const bucket = listeners.get(key) ?? new Set<() => void>();
			bucket.add(listener);
			listeners.set(key, bucket);
			return () => {
				bucket.delete(listener);
			};
		},
	};
}

export const kvSqliteStorage: KVStorage = createSqliteKVStorage(Storage);
