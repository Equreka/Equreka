import engineArtifact from '@equreka/content/artifact/engine.json';
import { createUnitRegistry, type UnitRegistry } from '@equreka/engine/units';
import type { EngineSlice } from '@equreka/schema';

/**
 * Build-time engine registry over the full engine.json artifact — server
 * only. Islands never import this module; they fetch the trimmed
 * /data/converter.en.json payload instead (equreka-assets integration).
 */
export const engineSlice = engineArtifact as unknown as EngineSlice;

export const unitRegistry: UnitRegistry = createUnitRegistry(engineSlice);
