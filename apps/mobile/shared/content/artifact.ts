import { solutions } from '@equreka/content/artifact/solutions.js';
import {
	type MATH_SHARD_COUNT,
	type MathAtlas,
	type MathBodyShard,
	type MathBodyV2,
	mathShardOf,
} from '@equreka/content/rich-text';
import type { CatalogLiteEntry } from '@equreka/content/search-options';
import type { Locale } from '@equreka/core/i18n';
import type { SolutionsModule } from '@equreka/engine/solutions';
import type { EngineSlice } from '@equreka/schema';
import type { EntryCollection, PresentationSlices } from '../../entities/content/types';

/**
 * The bundled content artifact as per-file JSON modules (ADR 0002), each
 * evaluated on its first read. Every file is reached through a literal
 * `require` inside the function that reads it: Metro bundles only literal
 * specifiers, and a default `import` of JSON compiles to an interop-wrapped
 * require at the top of this module, which evaluates every file the first
 * time any accessor runs (ADR 0010). Shapes are asserted, not validated:
 * the pipeline validated the corpus at build and the artifact is read-only
 * at runtime.
 */
export function getPresentation<K extends EntryCollection>(collection: K): PresentationSlices[K] {
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
	return slices[collection]() as PresentationSlices[K];
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
