import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { KVStorage } from '../ports/kv-storage';

export const PATH_PROGRESS_KEY = 'equreka.v1.path-progress';

/**
 * Completed step ids per path slug. Ids are the authored step ids (ADR
 * 0004), so renaming a step in content resets that step's progress.
 */
export type PathProgressRecord = Record<string, string[]>;

function uniqueStrings(value: unknown): string[] | null {
	if (!Array.isArray(value)) return null;
	const ids: string[] = [];
	for (const item of value) {
		if (typeof item === 'string' && !ids.includes(item)) ids.push(item);
	}
	return ids;
}

/**
 * Structural validation of a stored or imported progress record: a plain
 * object whose values are string arrays. Non-conforming entries are
 * dropped rather than failing the whole record.
 */
export function coercePathProgress(data: unknown): PathProgressRecord | null {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
	const record: PathProgressRecord = {};
	for (const [slug, ids] of Object.entries(data as Record<string, unknown>)) {
		const unique = uniqueStrings(ids);
		if (unique !== null && unique.length > 0) record[slug] = unique;
	}
	return record;
}

export function parsePathProgress(raw: string | null): PathProgressRecord {
	if (raw === null) return {};
	try {
		return coercePathProgress(JSON.parse(raw)) ?? {};
	} catch {
		return {};
	}
}

/**
 * Per-path union of `incoming` into `current`, preserving the order of
 * `current` and appending unseen ids. `added` counts newly completed steps
 * across all paths.
 */
export function mergePathProgress(
	current: PathProgressRecord,
	incoming: PathProgressRecord,
): { merged: PathProgressRecord; added: number } {
	const merged: PathProgressRecord = { ...current };
	let added = 0;
	for (const [slug, ids] of Object.entries(incoming)) {
		const existing = merged[slug] ?? [];
		const next = [...existing];
		for (const id of ids) {
			if (!next.includes(id)) {
				next.push(id);
				added += 1;
			}
		}
		if (next.length > 0) merged[slug] = next;
	}
	return { merged, added };
}

export interface UsePathProgress {
	done: ReadonlySet<string>;
	percent: number;
	isDone(stepId: string): boolean;
	toggleStep(stepId: string): void;
	reset(): void;
}

/**
 * Completion state of one path over an injected KVStorage. `stepIds` is the
 * path's authored step list: stored ids outside it are ignored (a step
 * removed from content stops counting) and `percent` is done ÷ total,
 * rounded to an integer. Instances sharing an adapter stay in sync through
 * its subscribe channel.
 */
export function usePathProgress(
	storage: KVStorage,
	pathSlug: string,
	stepIds: readonly string[],
): UsePathProgress {
	const raw = useSyncExternalStore(
		useCallback(
			(onChange: () => void) => storage.subscribe(PATH_PROGRESS_KEY, onChange),
			[storage],
		),
		() => storage.get(PATH_PROGRESS_KEY),
		() => null,
	);
	const stepKey = stepIds.join('\n');
	const done = useMemo(() => {
		const known = new Set(stepKey === '' ? [] : stepKey.split('\n'));
		const stored = parsePathProgress(raw)[pathSlug] ?? [];
		return new Set(stored.filter((id) => known.has(id)));
	}, [raw, pathSlug, stepKey]);
	const total = stepIds.length;
	const percent = total === 0 ? 0 : Math.round((done.size / total) * 100);

	const isDone = useCallback((stepId: string) => done.has(stepId), [done]);

	const write = useCallback(
		(ids: string[]) => {
			const record = parsePathProgress(storage.get(PATH_PROGRESS_KEY));
			if (ids.length === 0) {
				delete record[pathSlug];
			} else {
				record[pathSlug] = ids;
			}
			storage.set(PATH_PROGRESS_KEY, JSON.stringify(record));
		},
		[storage, pathSlug],
	);

	const toggleStep = useCallback(
		(stepId: string) => {
			const current = parsePathProgress(storage.get(PATH_PROGRESS_KEY))[pathSlug] ?? [];
			write(
				current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId],
			);
		},
		[storage, pathSlug, write],
	);

	const reset = useCallback(() => write([]), [write]);

	return { done, percent, isDone, toggleStep, reset };
}
