import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { KVStorage } from '../ports/kv-storage';

export const FAVORITES_KEY = 'equreka.v1.favorites';

/**
 * One favorited entry. `collection` uses the v2 collection names;
 * `addedAt` is an ISO-8601 timestamp (lexicographic order is
 * chronological order).
 */
export interface FavoriteEntry {
	collection: string;
	slug: string;
	addedAt: string;
}

/**
 * Portable export format. The version travels inside the file so a future
 * shape change stays importable.
 */
export interface FavoritesEnvelope {
	v: 1;
	favorites: FavoriteEntry[];
}

const LEGACY_PREFIX = 'equreka-favorites-';

/**
 * Legacy per-type keys → v2 collections. `formulas` merged into
 * `equations` in v2 (slugs pass through unchanged); the rest map 1:1.
 */
const LEGACY_COLLECTIONS: Record<string, string> = {
	equations: 'equations',
	formulas: 'equations',
	constants: 'constants',
	magnitudes: 'magnitudes',
	variables: 'variables',
	units: 'units',
	prefixes: 'prefixes',
};

/**
 * Content slugs renamed between the legacy corpus and v2.
 */
const LEGACY_SLUG_RENAMES: Record<string, string> = {
	'pithagoras-theorem': 'pythagorean-theorem',
};

function keyOf(entry: { collection: string; slug: string }): string {
	return `${entry.collection}:${entry.slug}`;
}

function isFavoriteEntry(value: unknown): value is FavoriteEntry {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.collection === 'string' &&
		typeof entry.slug === 'string' &&
		typeof entry.addedAt === 'string'
	);
}

function parseFavorites(raw: string | null): FavoriteEntry[] {
	if (raw === null) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter(isFavoriteEntry) : [];
	} catch {
		return [];
	}
}

function parseEnvelope(data: unknown): FavoriteEntry[] | null {
	if (typeof data !== 'object' || data === null) return null;
	const envelope = data as Record<string, unknown>;
	if (envelope.v !== 1 || !Array.isArray(envelope.favorites)) return null;
	return envelope.favorites.filter(isFavoriteEntry);
}

/**
 * Merges `incoming` into `current`, skipping entries whose collection:slug
 * already exists. Returns the merged list and how many entries were new.
 */
function mergeFavorites(
	current: FavoriteEntry[],
	incoming: FavoriteEntry[],
): { merged: FavoriteEntry[]; added: number } {
	const seen = new Set(current.map(keyOf));
	const merged = [...current];
	for (const entry of incoming) {
		if (seen.has(keyOf(entry))) continue;
		seen.add(keyOf(entry));
		merged.push(entry);
	}
	return { merged, added: merged.length - current.length };
}

/**
 * One-time migration of the legacy app's `equreka-favorites-<type>` keys
 * (JSON arrays of slugs). Idempotent: legacy keys are deleted after the
 * merge, so re-running finds nothing.
 */
export function migrateLegacyFavorites(storage: KVStorage): void {
	const incoming: FavoriteEntry[] = [];
	const foundKeys: string[] = [];
	const addedAt = new Date().toISOString();
	for (const [legacyType, collection] of Object.entries(LEGACY_COLLECTIONS)) {
		const legacyKey = `${LEGACY_PREFIX}${legacyType}`;
		const raw = storage.get(legacyKey);
		if (raw === null) continue;
		foundKeys.push(legacyKey);
		try {
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) continue;
			for (const slug of parsed) {
				if (typeof slug !== 'string') continue;
				incoming.push({ collection, slug: LEGACY_SLUG_RENAMES[slug] ?? slug, addedAt });
			}
		} catch {}
	}
	if (foundKeys.length === 0) return;
	const { merged, added } = mergeFavorites(parseFavorites(storage.get(FAVORITES_KEY)), incoming);
	if (added > 0) {
		storage.set(FAVORITES_KEY, JSON.stringify(merged));
	}
	for (const legacyKey of foundKeys) {
		storage.remove(legacyKey);
	}
}

export interface UseFavorites {
	favorites: readonly FavoriteEntry[];
	isFavorite(collection: string, slug: string): boolean;
	toggle(collection: string, slug: string): void;
	exportEnvelope(): FavoritesEnvelope;
	/**
	 * Merges a parsed export envelope into the stored favorites. Returns
	 * the number of newly added entries, or null when `data` is not a
	 * valid envelope.
	 */
	importEnvelope(data: unknown): number | null;
}

/**
 * Favorites over an injected KVStorage. All instances sharing an adapter
 * stay in sync through its subscribe channel; the legacy-key migration
 * runs once on mount.
 */
export function useFavorites(storage: KVStorage): UseFavorites {
	const raw = useSyncExternalStore(
		useCallback((onChange: () => void) => storage.subscribe(FAVORITES_KEY, onChange), [storage]),
		() => storage.get(FAVORITES_KEY),
		() => null,
	);
	const favorites = useMemo(() => parseFavorites(raw), [raw]);
	const keys = useMemo(() => new Set(favorites.map(keyOf)), [favorites]);

	useEffect(() => {
		migrateLegacyFavorites(storage);
	}, [storage]);

	const isFavorite = useCallback(
		(collection: string, slug: string) => keys.has(keyOf({ collection, slug })),
		[keys],
	);

	const toggle = useCallback(
		(collection: string, slug: string) => {
			const current = parseFavorites(storage.get(FAVORITES_KEY));
			const key = keyOf({ collection, slug });
			const next = current.some((entry) => keyOf(entry) === key)
				? current.filter((entry) => keyOf(entry) !== key)
				: [...current, { collection, slug, addedAt: new Date().toISOString() }];
			storage.set(FAVORITES_KEY, JSON.stringify(next));
		},
		[storage],
	);

	const exportEnvelope = useCallback(
		(): FavoritesEnvelope => ({ v: 1, favorites: parseFavorites(storage.get(FAVORITES_KEY)) }),
		[storage],
	);

	const importEnvelope = useCallback(
		(data: unknown): number | null => {
			const incoming = parseEnvelope(data);
			if (incoming === null) return null;
			const { merged, added } = mergeFavorites(
				parseFavorites(storage.get(FAVORITES_KEY)),
				incoming,
			);
			if (added > 0) {
				storage.set(FAVORITES_KEY, JSON.stringify(merged));
			}
			return added;
		},
		[storage],
	);

	return { favorites, isFavorite, toggle, exportEnvelope, importEnvelope };
}
