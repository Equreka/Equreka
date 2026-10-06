import type { CompiledDimension, EngineSlice } from '@equreka/schema';
import type { ConverterPayload } from '../integrations/equreka-assets';

/**
 * Rebuilds an EngineSlice-shaped object from the trimmed client payload so
 * the shared createUnitRegistry runs unchanged in the browser. Unit
 * `magnitudes` and magnitude `kindOf` are carried because the registry's
 * kind scope reads them; fields it never reads (TeX, prefixes, constants,
 * equations) are stubs — the full engine.json never ships to the client.
 */
export function converterSliceOf(payload: ConverterPayload): EngineSlice {
	const units: EngineSlice['units'] = {};
	for (const [slug, unit] of Object.entries(payload.units)) {
		units[slug] = {
			slug,
			name: { en: unit.name },
			symbolTex: '',
			symbolText: unit.symbolText,
			magnitudes: unit.magnitudes,
			system: 'other',
			dimension: unit.dimension as CompiledDimension,
			factor: unit.factor,
			offset: unit.offset,
			exact: unit.exact,
			affine: unit.affine,
		};
	}
	const magnitudes: EngineSlice['magnitudes'] = {};
	for (const [slug, magnitude] of Object.entries(payload.magnitudes)) {
		magnitudes[slug] = {
			slug,
			name: { en: magnitude.name },
			symbolTex: '',
			baseUnit: magnitude.baseUnit,
			dimension: magnitude.dimension as CompiledDimension,
			...(magnitude.kindOf === undefined ? {} : { kindOf: magnitude.kindOf }),
			nonNegative: false,
		};
	}
	return {
		schemaVersion: 0,
		contentHash: '',
		magnitudes,
		units,
		prefixes: {},
		constants: {},
		equations: {},
	};
}
