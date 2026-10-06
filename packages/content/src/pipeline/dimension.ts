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

const ANGLE_INDEX = DIMENSION_KEYS.indexOf('A');

/**
 * The dimension with its synthetic angle exponent cleared: equation checks
 * take the SI view that the radian is the number 1 (`s = r θ`, `ω = 2π f`,
 * `sin θ`), while unit conversion keeps `A` strict so 30° never converts to
 * a bare number.
 */
export function withoutAngle(dimension: CompiledDimension): CompiledDimension {
	return dimension.map((value, index) => (index === ANGLE_INDEX ? 0 : value)) as CompiledDimension;
}

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
 * The dimension a unit's magnitudes declare (`unitOf[0]`; integrity
 * separately enforces that every listed magnitude agrees). Undefined for a
 * magnitude-less compound unit or a dangling ref.
 */
export function declaredUnitDimension(unit: Unit, corpus: Corpus): CompiledDimension | undefined {
	const first = unit.unitOf[0];
	if (first === undefined) {
		return undefined;
	}
	const magnitude = corpus.magnitudes.get(first);
	return magnitude === undefined ? undefined : magnitudeDimension(magnitude);
}

/**
 * Σ expᵢ·dim(unitᵢ) over a compose form's operands; undefined when the unit
 * has no compose form or any operand's dimension is unknown. `visiting`
 * holds the operand slugs on the current walk so a derivation cycle (which
 * resolution reports) terminates here instead of recursing forever.
 */
export function composedUnitDimension(
	unit: Unit,
	corpus: Corpus,
	visiting: ReadonlySet<string> = new Set(),
): CompiledDimension | undefined {
	if (unit.compose === undefined) {
		return undefined;
	}
	let sum = DIMENSION_ZERO;
	for (const operand of unit.compose.of) {
		const operandUnit = corpus.units.get(operand.unit);
		if (operandUnit === undefined || visiting.has(operand.unit)) {
			return undefined;
		}
		const operandDimension = unitDimension(
			operandUnit,
			corpus,
			new Set([...visiting, operand.unit]),
		);
		if (operandDimension === undefined) {
			return undefined;
		}
		sum = dimensionAdd(
			sum,
			operandDimension.map((value) => value * operand.exp) as CompiledDimension,
		);
	}
	return sum;
}

/**
 * A unit's dimension: declared by its magnitudes when it has any, otherwise
 * derived from its compose operands (a magnitude-less compound unit).
 */
export function unitDimension(
	unit: Unit,
	corpus: Corpus,
	visiting: ReadonlySet<string> = new Set(),
): CompiledDimension | undefined {
	return declaredUnitDimension(unit, corpus) ?? composedUnitDimension(unit, corpus, visiting);
}
