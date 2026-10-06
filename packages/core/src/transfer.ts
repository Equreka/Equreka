import {
	FAVORITES_KEY,
	type FavoriteEntry,
	isFavoriteEntry,
	mergeFavorites,
	parseFavorites,
} from './hooks/use-favorites';
import {
	coercePathProgress,
	mergePathProgress,
	PATH_PROGRESS_KEY,
	type PathProgressRecord,
	parsePathProgress,
} from './hooks/use-path-progress';
import type { KVStorage } from './ports/kv-storage';

/**
 * Portable export of everything a device holds for the reader: favorites
 * and, since paths shipped, completed path steps. The version travels
 * inside the file; `pathProgress` is optional so v1 files written before
 * paths existed import unchanged.
 */
export interface TransferEnvelope {
	v: 1;
	favorites: FavoriteEntry[];
	pathProgress?: PathProgressRecord;
}

export type FavoritesEnvelope = TransferEnvelope;

export interface ImportResult {
	favorites: number;
	steps: number;
}

export function exportEnvelope(storage: KVStorage): TransferEnvelope {
	const envelope: TransferEnvelope = {
		v: 1,
		favorites: parseFavorites(storage.get(FAVORITES_KEY)),
	};
	const pathProgress = parsePathProgress(storage.get(PATH_PROGRESS_KEY));
	if (Object.keys(pathProgress).length > 0) envelope.pathProgress = pathProgress;
	return envelope;
}

function parseEnvelope(data: unknown): TransferEnvelope | null {
	if (typeof data !== 'object' || data === null) return null;
	const envelope = data as Record<string, unknown>;
	if (envelope.v !== 1 || !Array.isArray(envelope.favorites)) return null;
	const parsed: TransferEnvelope = { v: 1, favorites: envelope.favorites.filter(isFavoriteEntry) };
	if (envelope.pathProgress !== undefined) {
		const pathProgress = coercePathProgress(envelope.pathProgress);
		if (pathProgress === null) return null;
		parsed.pathProgress = pathProgress;
	}
	return parsed;
}

/**
 * Merges a parsed envelope into storage — favorites by collection:slug,
 * path progress by per-path union — and reports how much was new. Returns
 * null, writing nothing, when `data` is not a valid envelope.
 */
export function importEnvelope(storage: KVStorage, data: unknown): ImportResult | null {
	const envelope = parseEnvelope(data);
	if (envelope === null) return null;
	const favorites = mergeFavorites(parseFavorites(storage.get(FAVORITES_KEY)), envelope.favorites);
	if (favorites.added > 0) {
		storage.set(FAVORITES_KEY, JSON.stringify(favorites.merged));
	}
	const progress = mergePathProgress(
		parsePathProgress(storage.get(PATH_PROGRESS_KEY)),
		envelope.pathProgress ?? {},
	);
	if (progress.added > 0) {
		storage.set(PATH_PROGRESS_KEY, JSON.stringify(progress.merged));
	}
	return { favorites: favorites.added, steps: progress.added };
}
