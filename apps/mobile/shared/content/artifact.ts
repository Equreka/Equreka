import engineJson from '@equreka/content/artifact/engine.json';
import metaJson from '@equreka/content/artifact/meta.json';
import categoriesJson from '@equreka/content/artifact/presentation/categories.json';
import constantsJson from '@equreka/content/artifact/presentation/constants.json';
import equationsJson from '@equreka/content/artifact/presentation/equations.json';
import magnitudesJson from '@equreka/content/artifact/presentation/magnitudes.json';
import atlasJson from '@equreka/content/artifact/presentation/math/atlas.json';
import bodiesJson from '@equreka/content/artifact/presentation/math/bodies.json';
import pathsJson from '@equreka/content/artifact/presentation/paths.json';
import prefixesJson from '@equreka/content/artifact/presentation/prefixes.json';
import unitsJson from '@equreka/content/artifact/presentation/units.json';
import variablesJson from '@equreka/content/artifact/presentation/variables.json';
import catalogEnJson from '@equreka/content/artifact/search/catalog-lite.en.json';
import catalogEsJson from '@equreka/content/artifact/search/catalog-lite.es.json';
import { solutions } from '@equreka/content/artifact/solutions.js';
import type { MathAtlas, MathBodies } from '@equreka/content/rich-text';
import type { CatalogLiteEntry } from '@equreka/content/search-options';
import type { Locale } from '@equreka/core/i18n';
import type { SolutionsModule } from '@equreka/engine/solutions';
import type { EngineSlice } from '@equreka/schema';
import type { EntryCollection, PresentationSlices } from '../../entities/content/types';

/**
 * The bundled content artifact as per-collection JSON modules (ADR 0002).
 * Every accessor references its module inside a function body so Metro's
 * inlineRequires defers each JSON parse to the first screen that needs
 * that collection; a top-level object literal would evaluate all of them
 * on app start. Shapes are asserted, not validated: the pipeline validated
 * the corpus at build and the artifact is read-only at runtime.
 */
export function getPresentation<K extends EntryCollection>(collection: K): PresentationSlices[K] {
	const slices: { [C in EntryCollection]: () => unknown } = {
		categories: () => categoriesJson,
		magnitudes: () => magnitudesJson,
		units: () => unitsJson,
		prefixes: () => prefixesJson,
		constants: () => constantsJson,
		variables: () => variablesJson,
		equations: () => equationsJson,
		paths: () => pathsJson,
	};
	return slices[collection]() as PresentationSlices[K];
}

export function getEngineSlice(): EngineSlice {
	return engineJson as unknown as EngineSlice;
}

export function getSolutions(): SolutionsModule {
	return solutions as SolutionsModule;
}

export function getMathAtlas(): MathAtlas {
	return atlasJson as unknown as MathAtlas;
}

export function getMathBodies(): MathBodies {
	return bodiesJson as unknown as MathBodies;
}

export interface ArtifactMeta {
	schemaVersion: number;
	contentHash: string;
	counts: Record<string, number>;
}

export function getArtifactMeta(): ArtifactMeta {
	return metaJson as unknown as ArtifactMeta;
}

export function getCatalogLite(locale: Locale): CatalogLiteEntry[] {
	return (locale === 'es' ? catalogEsJson : catalogEnJson) as unknown as CatalogLiteEntry[];
}
