import type { KVStorage } from '@equreka/core';

/**
 * In-memory KVStorage implementing the full port contract, including
 * same-instance change notification — the shape the sqlite adapter
 * provides on device.
 */
export function createMemoryStorage(seed: Record<string, string> = {}): KVStorage {
	const data = new Map(Object.entries(seed));
	const listeners = new Map<string, Set<() => void>>();
	const notify = (key: string): void => {
		for (const listener of listeners.get(key) ?? []) listener();
	};
	return {
		get: (key) => data.get(key) ?? null,
		set: (key, value) => {
			data.set(key, value);
			notify(key);
		},
		remove: (key) => {
			data.delete(key);
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
