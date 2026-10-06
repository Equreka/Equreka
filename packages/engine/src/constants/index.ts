import type { EngineSlice } from '@equreka/schema';
import { type EngineResult, err, ok } from '../errors.js';
import { formatSigFigs } from '../format/index.js';
import { createUnitRegistry, type UnitRegistry } from '../units/index.js';

/**
 * Significant figures used when a constant's display string must be
 * re-derived from a float64 conversion. 15 is the largest count every
 * float64 round-trips losslessly, so the string carries no binary noise.
 */
const CONVERTED_DISPLAY_SIG_FIGS = 15;

/**
 * A constant resolved for display and computation. `value` is float64;
 * `display` is the full-precision decimal string from content when the
 * constant's native unit is used. When another unit is requested, the
 * conversion runs in float64 and `display` is re-formatted from the
 * converted number — arbitrary precision is lost on that path by design
 * (ADR 0002: exact arithmetic ends at the build). `exact` then means the
 * constant is exactly defined AND the conversion path is exact.
 */
export interface ResolvedConstant {
	value: number;
	display: string;
	unit: string;
	exact: boolean;
}

export interface GetConstantOptions {
	unit?: string;
	registry?: UnitRegistry;
}

/**
 * Passing `opts.registry` avoids rebuilding a unit registry per call when a
 * requested-unit conversion is needed; without it one is constructed from
 * `slice` on demand.
 */
export function getConstant(
	slice: EngineSlice,
	constantSlug: string,
	opts?: GetConstantOptions,
): EngineResult<ResolvedConstant> {
	const constant = slice.constants[constantSlug];
	if (constant === undefined) {
		return err('units/unknown', `unknown constant: ${constantSlug}`, {
			kind: 'constant',
			slug: constantSlug,
		});
	}
	const value = Number(constant.value);
	const targetUnit = opts?.unit;
	if (targetUnit === undefined || targetUnit === constant.unit) {
		return ok({
			value,
			display: constant.value,
			unit: constant.unit,
			exact: constant.exact,
		});
	}
	const registry = opts?.registry ?? createUnitRegistry(slice);
	const converted = registry.convert(value, constant.unit, targetUnit);
	if (!converted.ok) return converted;
	return ok({
		value: converted.value,
		display: formatSigFigs(converted.value, CONVERTED_DISPLAY_SIG_FIGS),
		unit: targetUnit,
		exact: constant.exact && registry.isExactPath(constant.unit, targetUnit),
	});
}
