import type { CalculatorUnitSource } from '@equreka/core/hooks/use-calculator-units';
import type { Locale } from '@equreka/core/i18n';
import { createUnitRegistry } from '@equreka/engine/units';
import type { ConverterPayload } from '../integrations/equreka-assets';
import { converterSliceOf } from './converter-slice';

/**
 * Default units of the variables an equation references, keyed by
 * variable slug. The converter payload carries no variables, so the
 * calculator page resolves them at build and hands them to the island.
 */
export type CalculatorVariableUnits = Record<string, { defaultUnit?: string | undefined }>;

/**
 * Fetches the per-locale converter payload the converter island already
 * ships; the calculator reuses it for unit lists instead of a second
 * payload, so the service worker's runtime cache serves both.
 */
export async function loadConverterPayload(locale: Locale): Promise<ConverterPayload> {
	const response = await fetch(`/data/converter.${locale}.json`);
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return (await response.json()) as ConverterPayload;
}

/**
 * The client-side unit source: a registry over the trimmed payload (the
 * same slice rebuild the converter uses) plus payload magnitudes for base
 * units. Unit `name.en` holds the payload's locale-resolved name.
 */
export function calculatorUnitSourceOf(
	payload: ConverterPayload,
	variables: CalculatorVariableUnits = {},
): CalculatorUnitSource {
	return {
		registry: createUnitRegistry(converterSliceOf(payload)),
		magnitudes: payload.magnitudes,
		variables,
	};
}
