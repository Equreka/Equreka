import { solutions } from '@equreka/content/artifact/solutions.js';
import type { PRESENTATION_SHARDS, ShardedCollection } from '@equreka/content/presentation-shards';
import {
	type MATH_SHARD_COUNT,
	type MathAtlas,
	type MathBodyShard,
	type MathBodyV2,
	mathShardOf,
} from '@equreka/content/rich-text';
import type { CatalogLiteEntry, SearchLeads } from '@equreka/content/search-options';
import type { Locale } from '@equreka/core/i18n';
import type { SolutionsModule } from '@equreka/engine/solutions';
import type { EngineSlice } from '@equreka/schema';
import type {
	EntryCollection,
	PresentationDetailShard,
	PresentationIndexes,
} from '../../entities/content/types';

/**
 * The bundled content artifact as per-file JSON modules (ADR 0002), each
 * evaluated on its first read. Every file is reached through a literal
 * `require` inside the function that reads it: Metro bundles only literal
 * specifiers, and a default `import` of JSON compiles to an interop-wrapped
 * require at the top of this module, which evaluates every file the first
 * time any accessor runs (ADR 0010). Shapes are asserted, not validated:
 * the pipeline validated the corpus at build and the artifact is read-only
 * at runtime. A sharded collection's file is its index (ADR 0015): full
 * entries come from `getEntity` in `entities/content/lookup`.
 */
export function getPresentation<K extends EntryCollection>(collection: K): PresentationIndexes[K] {
	const slices: { [C in EntryCollection]: () => unknown } = {
		categories: () => require<unknown>('@equreka/content/artifact/presentation/categories.json'),
		branches: () => require<unknown>('@equreka/content/artifact/presentation/branches.json'),
		magnitudes: () => require<unknown>('@equreka/content/artifact/presentation/magnitudes.json'),
		units: () => require<unknown>('@equreka/content/artifact/presentation/units.json'),
		prefixes: () => require<unknown>('@equreka/content/artifact/presentation/prefixes.json'),
		constants: () => require<unknown>('@equreka/content/artifact/presentation/constants.json'),
		variables: () => require<unknown>('@equreka/content/artifact/presentation/variables.json'),
		equations: () => require<unknown>('@equreka/content/artifact/presentation/equations.json'),
		paths: () => require<unknown>('@equreka/content/artifact/presentation/paths.json'),
	};
	return slices[collection]() as PresentationIndexes[K];
}

export function getEngineSlice(): EngineSlice {
	return require<EngineSlice>('@equreka/content/artifact/engine.json');
}

export function getSolutions(): SolutionsModule {
	return solutions as SolutionsModule;
}

export function getMathAtlas(): MathAtlas {
	return require<MathAtlas>('@equreka/content/artifact/presentation/math/atlas.json');
}

type Tuple<T, N extends number, Built extends readonly T[] = []> = Built['length'] extends N
	? Built
	: Tuple<T, N, readonly [...Built, T]>;

/**
 * Loader `i` of a collection returns `presentation/<collection>/<shardName(i)>.json`,
 * so opening an entry evaluates only the shard its slug hashes to. The tuple
 * types turn a table that misses a shard after a PRESENTATION_SHARDS count
 * grows into a compile error.
 */
const PRESENTATION_SHARD_LOADERS: {
	[C in ShardedCollection]: Tuple<() => unknown, (typeof PRESENTATION_SHARDS)[C]['count']>;
} = {
	equations: [
		() => require<unknown>('@equreka/content/artifact/presentation/equations/00.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/01.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/02.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/03.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/04.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/05.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/06.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/07.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/08.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/09.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/0a.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/0b.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/0c.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/0d.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/0e.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/0f.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/10.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/11.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/12.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/13.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/14.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/15.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/16.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/17.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/18.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/19.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/1a.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/1b.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/1c.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/1d.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/1e.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/1f.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/20.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/21.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/22.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/23.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/24.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/25.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/26.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/27.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/28.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/29.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/2a.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/2b.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/2c.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/2d.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/2e.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/2f.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/30.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/31.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/32.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/33.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/34.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/35.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/36.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/37.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/38.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/39.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/3a.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/3b.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/3c.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/3d.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/3e.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/equations/3f.json'),
	],
	units: [
		() => require<unknown>('@equreka/content/artifact/presentation/units/00.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/01.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/02.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/03.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/04.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/05.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/06.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/07.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/08.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/09.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/0a.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/0b.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/0c.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/0d.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/0e.json'),
		() => require<unknown>('@equreka/content/artifact/presentation/units/0f.json'),
	],
};

export function getPresentationShard<C extends ShardedCollection>(
	collection: C,
	shard: number,
): PresentationDetailShard<C> | undefined {
	const loaders: readonly (() => unknown)[] = PRESENTATION_SHARD_LOADERS[collection];
	return loaders[shard]?.() as PresentationDetailShard<C> | undefined;
}

/**
 * Loader `i` returns `bodies/<mathShardName(i)>.json`, so a lookup evaluates
 * only the shard its TeX hashes to. The tuple type turns a table that
 * misses a shard after MATH_SHARD_COUNT grows into a compile error.
 */
const MATH_BODY_SHARDS: Tuple<() => MathBodyShard, typeof MATH_SHARD_COUNT> = [
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/00.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/01.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/02.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/03.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/04.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/05.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/06.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/07.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/08.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/09.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/0a.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/0b.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/0c.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/0d.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/0e.json'),
	() => require<MathBodyShard>('@equreka/content/artifact/presentation/math/bodies/0f.json'),
];

export function getMathBodyShard(shard: number): MathBodyShard | undefined {
	return MATH_BODY_SHARDS[shard]?.();
}

/**
 * The pre-rendered body of one canonical TeX string, evaluating only the
 * shard it hashes to.
 */
export function getMathBody(tex: string): MathBodyV2 | undefined {
	const shard = getMathBodyShard(mathShardOf(tex));
	return shard !== undefined && Object.hasOwn(shard, tex) ? shard[tex] : undefined;
}

/**
 * Every shard merged, which evaluates all of them: for tests and audits,
 * never a render path.
 */
export function getAllMathBodies(): MathBodyShard {
	return Object.assign({}, ...MATH_BODY_SHARDS.map((load) => load()));
}

export interface ArtifactMeta {
	schemaVersion: number;
	contentHash: string;
	counts: Record<string, number>;
}

export function getArtifactMeta(): ArtifactMeta {
	return require<ArtifactMeta>('@equreka/content/artifact/meta.json');
}

export function getCatalogLite(locale: Locale): CatalogLiteEntry[] {
	return locale === 'es'
		? require<CatalogLiteEntry[]>('@equreka/content/artifact/search/catalog-lite.es.json')
		: require<CatalogLiteEntry[]>('@equreka/content/artifact/search/catalog-lite.en.json');
}

export function getSearchLeads(locale: Locale): SearchLeads {
	return locale === 'es'
		? require<SearchLeads>('@equreka/content/artifact/search/leads.es.json')
		: require<SearchLeads>('@equreka/content/artifact/search/leads.en.json');
}
