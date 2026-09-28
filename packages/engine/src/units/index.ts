import type { CompiledDimension, CompiledUnit, EngineSlice } from '@equreka/schema';
import { type EngineError, type EngineResult, err, ok } from '../errors.js';
import { kindFamily } from './kinds.js';

export * from './kinds.js';

/**
 * Which units a magnitude offers: `kind` keeps to units whose unitOf meets
 * the magnitude's kind family (ADR 0006); `dimension` is every unit
 * convert() accepts for it.
 */
export type UnitScope = 'kind' | 'dimension';

/**
 * A compiled unit with its decimal-string factor/offset parsed to float64
 * exactly once, at registry construction (ADR 0002: exact arithmetic ends at
 * the build; the runtime is float64).
 */
interface ParsedUnit {
	unit: CompiledUnit;
	factor: number;
	offset: number;
	dimensionKey: string;
}

/**
 * Dimensional unit conversion over one EngineSlice. Convertibility is
 * dimension-vector equality on the full 8-tuple — the synthetic angle
 * component keeps rad/s (A·T⁻¹) from converting to Hz (T⁻¹) while units
 * sharing a genuine dimension (Hz ↔ Bq) do convert.
 */
export interface UnitRegistry {
	convert(value: number, from: string, to: string): EngineResult<number>;
	convertDelta(value: number, from: string, to: string): EngineResult<number>;
	compatibleUnits(unitOrDimension: string | CompiledDimension): CompiledUnit[];
	unitsForMagnitude(magnitude: string, scope?: UnitScope): CompiledUnit[];
	areCompatible(a: string, b: string): boolean;
	getUnit(slug: string): CompiledUnit | undefined;
	isExactPath(from: string, to: string): boolean;
}

function unknownUnit(slug: string): { ok: false; error: EngineError } {
	return err('units/unknown', `unknown unit: ${slug}`, { slug });
}

export function createUnitRegistry(slice: EngineSlice): UnitRegistry {
	const bySlug = new Map<string, ParsedUnit>();
	const byDimension = new Map<string, CompiledUnit[]>();

	for (const unit of Object.values(slice.units)) {
		const parsed: ParsedUnit = {
			unit,
			factor: Number(unit.factor),
			offset: Number(unit.offset),
			dimensionKey: unit.dimension.join(','),
		};
		bySlug.set(unit.slug, parsed);
		const bucket = byDimension.get(parsed.dimensionKey);
		if (bucket === undefined) {
			byDimension.set(parsed.dimensionKey, [unit]);
		} else {
			bucket.push(unit);
		}
	}

	function resolve(
		value: number,
		from: string,
		to: string,
	): EngineResult<{ from: ParsedUnit; to: ParsedUnit }> {
		if (!Number.isFinite(value)) {
			return err('inputs/not-a-number', `value is not a finite number: ${value}`, { value });
		}
		const fromUnit = bySlug.get(from);
		if (fromUnit === undefined) return unknownUnit(from);
		const toUnit = bySlug.get(to);
		if (toUnit === undefined) return unknownUnit(to);
		if (fromUnit.dimensionKey !== toUnit.dimensionKey) {
			return err('units/incompatible-dimensions', `cannot convert ${from} to ${to}`, {
				from,
				to,
				fromDimension: fromUnit.unit.dimension,
				toDimension: toUnit.unit.dimension,
			});
		}
		return ok({ from: fromUnit, to: toUnit });
	}

	/**
	 * Absolute conversion through the SI-coherent base:
	 * si = value·factorF + offsetF; out = (si − offsetT) / factorT.
	 * Offsets are "0" for non-affine units, so one code path serves both.
	 */
	function convert(value: number, from: string, to: string): EngineResult<number> {
		const pair = resolve(value, from, to);
		if (!pair.ok) return pair;
		const { from: f, to: t } = pair.value;
		return ok((value * f.factor + f.offset - t.offset) / t.factor);
	}

	/**
	 * Interval conversion — factors only, offsets ignored. A temperature
	 * difference of 1 K is 1 °C and 1.8 °F regardless of anchor points.
	 */
	function convertDelta(value: number, from: string, to: string): EngineResult<number> {
		const pair = resolve(value, from, to);
		if (!pair.ok) return pair;
		const { from: f, to: t } = pair.value;
		return ok((value * f.factor) / t.factor);
	}

	function compatibleUnits(unitOrDimension: string | CompiledDimension): CompiledUnit[] {
		const key =
			typeof unitOrDimension === 'string'
				? bySlug.get(unitOrDimension)?.dimensionKey
				: unitOrDimension.join(',');
		if (key === undefined) return [];
		const bucket = byDimension.get(key);
		return bucket === undefined ? [] : [...bucket];
	}

	/**
	 * The kind scope is always a subset of the dimension scope, so every
	 * pair it offers converts; order follows the slice like compatibleUnits.
	 */
	function unitsForMagnitude(magnitude: string, scope: UnitScope = 'kind'): CompiledUnit[] {
		const compiled = slice.magnitudes[magnitude];
		if (compiled === undefined) return [];
		const sameDimension = compatibleUnits(compiled.dimension);
		if (scope === 'dimension') return sameDimension;
		const family = new Set(kindFamily(slice.magnitudes, magnitude));
		return sameDimension.filter((unit) => unit.magnitudes.some((slug) => family.has(slug)));
	}

	function areCompatible(a: string, b: string): boolean {
		const unitA = bySlug.get(a);
		const unitB = bySlug.get(b);
		return unitA !== undefined && unitB !== undefined && unitA.dimensionKey === unitB.dimensionKey;
	}

	function getUnit(slug: string): CompiledUnit | undefined {
		return bySlug.get(slug)?.unit;
	}

	/**
	 * True when both units carry build-verified exact factors, i.e. the only
	 * rounding in the conversion is float64 itself. Unknown slugs report
	 * false rather than erroring — this is advisory display state.
	 */
	function isExactPath(from: string, to: string): boolean {
		const fromUnit = bySlug.get(from);
		const toUnit = bySlug.get(to);
		return (
			fromUnit !== undefined && toUnit !== undefined && fromUnit.unit.exact && toUnit.unit.exact
		);
	}

	return {
		convert,
		convertDelta,
		compatibleUnits,
		unitsForMagnitude,
		areCompatible,
		getUnit,
		isExactPath,
	};
}
