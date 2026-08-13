import type { Unit } from '@equreka/schema';
import { unitRegistry } from './server/engine-registry';

/**
 * Plain-text symbol for an authored unit, preferring the pipeline-computed
 * form from the engine artifact so pages and search agree on one rendering.
 */
export function symbolTextOf(unit: Unit & { slug: string }): string {
	return unitRegistry.getUnit(unit.slug)?.symbolText ?? unit.symbol.text ?? unit.symbol.tex;
}
