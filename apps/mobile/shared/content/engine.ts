import { createUnitRegistry, type UnitRegistry } from '@equreka/engine/units';
import { getEngineSlice } from './artifact';

let registry: UnitRegistry | undefined;

/**
 * Process-wide unit registry over the bundled engine slice, constructed on
 * first use (the float64 parse of every factor happens once per session).
 */
export function getUnitRegistry(): UnitRegistry {
	registry ??= createUnitRegistry(getEngineSlice());
	return registry;
}
