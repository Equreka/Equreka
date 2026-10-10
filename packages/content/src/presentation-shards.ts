import type { CollectionName } from '@equreka/schema';
import { shardName, shardOf } from './shard-hash.js';

/**
 * How each sharded presentation slice splits (ADR 0015).
 * `presentation/<collection>.json` keeps only `indexFields`: the fields list,
 * browse, filing and cross-reference screens read for many entries at once.
 * Every other field of an entry ships in `presentation/<collection>/<shard>.json`,
 * the shard `presentationShardOf` names, which only a screen showing that one
 * entry evaluates. `count` must satisfy `isValidShardCount`; raise it by
 * doubling when a shard nears its ARTIFACT_BUDGETS cap, then extend the mobile
 * loader table, typed as a tuple of exactly `count` loaders. A collection
 * absent here ships whole.
 */
export const PRESENTATION_SHARDS = {
	equations: { count: 64, indexFields: ['branches', 'categories', 'name'] },
	units: {
		count: 16,
		indexFields: ['branches', 'categories', 'name', 'symbolTex', 'symbolText'],
	},
} as const satisfies Partial<
	Record<CollectionName, { count: number; indexFields: readonly string[] }>
>;

export type ShardedCollection = keyof typeof PRESENTATION_SHARDS;

export type PresentationIndexField<C extends ShardedCollection> =
	(typeof PRESENTATION_SHARDS)[C]['indexFields'][number];

/**
 * A presentation slice, an index or one shard: slug → that entry's fields.
 */
export type PresentationRecord = Record<string, Record<string, unknown>>;

export const SHARDED_COLLECTIONS = Object.keys(PRESENTATION_SHARDS) as ShardedCollection[];

export function isShardedCollection(collection: string): collection is ShardedCollection {
	return Object.hasOwn(PRESENTATION_SHARDS, collection);
}

/**
 * The shard an entry's details ship in: a pure function of its slug, so a
 * screen holding the slug evaluates one shard and no manifest ships.
 */
export function presentationShardOf(collection: ShardedCollection, slug: string): number {
	return shardOf(slug, PRESENTATION_SHARDS[collection].count);
}

/**
 * The dist-relative path of one shard, the form `ARTIFACT_BUDGETS` classifies.
 */
export function presentationShardPath(collection: ShardedCollection, shard: number): string {
	return `presentation/${collection}/${shardName(shard)}.json`;
}

export interface SplitPresentationSlice {
	index: PresentationRecord;
	shards: PresentationRecord[];
}

/**
 * Every slug lands in the index and in exactly one shard, an entry with no
 * detail field as `{}`, and every shard exists, empty ones included, so the
 * loader table always matches the files on disk.
 */
export function splitPresentationSlice(
	collection: ShardedCollection,
	slice: PresentationRecord,
): SplitPresentationSlice {
	const indexFields: readonly string[] = PRESENTATION_SHARDS[collection].indexFields;
	const index: PresentationRecord = {};
	const shards = Array.from(
		{ length: PRESENTATION_SHARDS[collection].count },
		(): PresentationRecord => ({}),
	);
	for (const [slug, entry] of Object.entries(slice)) {
		const fields = Object.entries(entry);
		index[slug] = Object.fromEntries(fields.filter(([field]) => indexFields.includes(field)));
		const shard = shards[presentationShardOf(collection, slug)];
		if (shard !== undefined) {
			shard[slug] = Object.fromEntries(fields.filter(([field]) => !indexFields.includes(field)));
		}
	}
	return { index, shards };
}

/**
 * One full presentation entry from its index row and its shard row. The
 * split is disjoint, so neither side overrides the other.
 */
export function mergePresentationEntry<Index extends object, Detail extends object>(
	index: Index,
	detail: Detail,
): Index & Detail {
	return { ...index, ...detail };
}

/**
 * A collection's full presentation slice, reassembled from the index and
 * every shard when it is sharded. `readJson` reads one dist-relative path,
 * so build-time readers on any filesystem layout share the assembly. Throws
 * when an indexed slug is missing from its shard: the artifact is corrupt or
 * mixes two builds.
 */
export function readPresentationSlice(
	collection: CollectionName,
	readJson: (relPath: string) => unknown,
): PresentationRecord {
	const slice = readJson(`presentation/${collection}.json`) as PresentationRecord;
	if (!isShardedCollection(collection)) {
		return slice;
	}
	const shards = Array.from(
		{ length: PRESENTATION_SHARDS[collection].count },
		(_, shard) => readJson(presentationShardPath(collection, shard)) as PresentationRecord,
	);
	return Object.fromEntries(
		Object.entries(slice).map(([slug, entry]) => {
			const shard = presentationShardOf(collection, slug);
			const detail = shards[shard]?.[slug];
			if (detail === undefined) {
				throw new Error(
					`${presentationShardPath(collection, shard)} has no entry for indexed slug '${slug}'`,
				);
			}
			return [slug, mergePresentationEntry(entry, detail)];
		}),
	);
}
