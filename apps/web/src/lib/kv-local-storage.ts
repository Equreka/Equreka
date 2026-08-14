import type { KVStorage } from '@equreka/core';

/**
 * Same-document change channel: localStorage's native 'storage' event only
 * fires in *other* tabs, so the adapter (and any vanilla script writing the
 * same keys, e.g. the header theme toggle) dispatches this CustomEvent with
 * `detail.key` after every write.
 */
export const KV_EVENT = 'equreka:kv';

function dispatchChange(key: string): void {
	window.dispatchEvent(new CustomEvent(KV_EVENT, { detail: { key } }));
}

/**
 * The web KVStorage adapter over localStorage. Reads and writes are
 * try/catch-guarded (private mode, storage denied); subscribe merges the
 * cross-tab 'storage' event with the same-document KV_EVENT channel.
 */
export const kvLocalStorage: KVStorage = {
	get: (key) => {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set: (key, value) => {
		try {
			localStorage.setItem(key, value);
		} catch {
			return;
		}
		dispatchChange(key);
	},
	remove: (key) => {
		try {
			localStorage.removeItem(key);
		} catch {
			return;
		}
		dispatchChange(key);
	},
	subscribe: (key, listener) => {
		const onStorage = (event: StorageEvent): void => {
			if (event.key === key || event.key === null) listener();
		};
		const onLocal = (event: Event): void => {
			if ((event as CustomEvent<{ key?: string }>).detail?.key === key) listener();
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener(KV_EVENT, onLocal);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener(KV_EVENT, onLocal);
		};
	},
};
