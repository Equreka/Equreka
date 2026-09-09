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

export const DIMENSION_ZERO: CompiledDimension = [0, 0, 0, 0, 0, 0, 0, 0];

export function dimensionsEqual(a: CompiledDimension, b: CompiledDimension): boolean {
	return a.every((value, index) => value === b[index]);
}

export function isDimensionless(dimension: CompiledDimension): boolean {
	return dimension.every((value) => value === 0);
}

export function dimensionAdd(a: CompiledDimension, b: CompiledDimension): CompiledDimension {
	return a.map((value, index) => value + (b[index] ?? 0)) as CompiledDimension;
}

export function dimensionSubtract(a: CompiledDimension, b: CompiledDimension): CompiledDimension {
	return a.map((value, index) => value - (b[index] ?? 0)) as CompiledDimension;
}

/**
 * Scales every exponent by num/den; undefined when any product is not an
 * integer — sqrt of an odd-power dimension has no physical meaning.
 */
export function dimensionScale(
	dimension: CompiledDimension,
	num: bigint,
	den: bigint,
): CompiledDimension | undefined {
	const scaled: number[] = [];
	for (const value of dimension) {
		const product = BigInt(value) * num;
		if (product % den !== 0n) {
			return undefined;
		}
		scaled.push(Number(product / den));
	}
	return scaled as CompiledDimension;
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
