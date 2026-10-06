import type { UnitRegistry } from '@equreka/engine/units';
import type { CompiledUnit } from '@equreka/schema';

export interface UnitPair {
	from: string;
	to: string;
}

/**
 * The converter's unit list for one magnitude. `hiddenByKind` counts the
 * same-dimension units the kind scope leaves out; the "show all with this
 * dimension" toggle is offered only when it is nonzero, so it never
 * appears as a control that changes nothing.
 */
export interface ConverterUnits {
	units: CompiledUnit[];
	hiddenByKind: number;
}

/**
 * Shared by the web island and the mobile screen so both scope units by
 * quantity kind (ADR 0006) with the same widening rule.
 */
export function converterUnits(
	registry: UnitRegistry,
	magnitude: string,
	showAllDimension: boolean,
): ConverterUnits {
	const byKind = registry.unitsForMagnitude(magnitude, 'kind');
	const byDimension = registry.unitsForMagnitude(magnitude, 'dimension');
	return {
		units: showAllDimension ? byDimension : byKind,
		hiddenByKind: byDimension.length - byKind.length,
	};
}

/**
 * A from/to pair drawn from `units`: each preferred slug survives when still
 * offered (a scope toggle keeps the user's choice); otherwise `from` falls
 * back to the base unit, then the first unit, and `to` to the first unit
 * that differs from `from`. Empty strings when `units` is empty.
 */
export function pickUnitPair(
	units: readonly Pick<CompiledUnit, 'slug'>[],
	baseUnit: string,
	preferred: { from?: string | undefined; to?: string | undefined } = {},
): UnitPair {
	const offered = (slug: string | undefined): slug is string =>
		slug !== undefined && units.some((unit) => unit.slug === slug);
	const from = offered(preferred.from)
		? preferred.from
		: offered(baseUnit)
			? baseUnit
			: (units[0]?.slug ?? '');
	const to = offered(preferred.to)
		? preferred.to
		: (units.find((unit) => unit.slug !== from)?.slug ?? from);
	return { from, to };
}
