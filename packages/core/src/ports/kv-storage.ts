/**
 * Synchronous key-value persistence port. Web adapts localStorage, mobile
 * adapts expo-sqlite/kv-store; hooks stay platform-free by depending on
 * this shape only. `subscribe` must fire its listener on every change to
 * `key` visible to the adapter (same-document writes and, where the
 * platform supports it, cross-context ones) and returns an unsubscribe.
 */
export interface KVStorage {
	get(key: string): string | null;
	set(key: string, value: string): void;
	remove(key: string): void;
	subscribe(key: string, listener: () => void): () => void;
}
