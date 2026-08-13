import {
	type CompiledDimension,
	DIMENSION_KEYS,
	type DimensionVector,
	type Magnitude,
	type Unit,
} from '@equreka/schema';
import type { Corpus } from './validate.js';

export function compileDimension(vector: DimensionVector): CompiledDimension {
	return DIMENSION_KEYS.map((key) => vector[key] ?? 0) as CompiledDimension;
}

export function dimensionsEqual(a: CompiledDimension, b: CompiledDimension): boolean {
	return a.every((value, index) => value === b[index]);
}

export function formatDimension(dimension: CompiledDimension): string {
	return `[${dimension.join(', ')}]`;
}

export function magnitudeDimension(magnitude: Magnitude): CompiledDimension {
	return compileDimension(magnitude.dimension);
}

/**
 * A unit's dimension is defined by its first magnitude (`unitOf[0]`);
 * integrity separately enforces that every listed magnitude agrees.
 */
export function unitDimension(unit: Unit, corpus: Corpus): CompiledDimension | undefined {
	const first = unit.unitOf[0];
	if (first === undefined) {
		return undefined;
	}
	const magnitude = corpus.magnitudes.get(first);
	return magnitude === undefined ? undefined : magnitudeDimension(magnitude);
}
