import type { KVStorage } from '../ports/kv-storage';

/**
 * In-memory KVStorage implementing the full port contract, including
 * same-instance change notification — what the web localStorage adapter
 * provides via its custom event channel.
 */
export function createMemoryStorage(seed: Record<string, string> = {}): KVStorage {
	const data = new Map(Object.entries(seed));
	const listeners = new Map<string, Set<() => void>>();
	const notify = (key: string): void => {
		for (const listener of listeners.get(key) ?? []) {
			listener();
		}
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
			const bucket = listeners.get(key) ?? new Set();
			bucket.add(listener);
			listeners.set(key, bucket);
			return () => {
				bucket.delete(listener);
			};
		},
	};
}
