import type { Thresholds, Waiver } from './config.js';

export const MISSING = '(missing)';

const PX_LENGTH = /^(-?\d+(?:\.\d+)?)px$/;
const ZERO_WIDTH_BORDER = /^0px\b/;
const TRANSPARENT_COLOR = /rgba\([^)]*,\s*0\)/;

function splitLayers(value: string): string[] {
	const layers: string[] = [];
	let depth = 0;
	let start = 0;
	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		if (char === '(') depth += 1;
		if (char === ')') depth -= 1;
		if (char === ',' && depth === 0) {
			layers.push(value.slice(start, index).trim());
			start = index + 1;
		}
	}
	layers.push(value.slice(start).trim());
	return layers;
}

/**
 * Collapses computed values that differ as strings but render
 * identically: a zero-width border paints nothing whatever its style
 * and color, and a shadow layer in a fully transparent color is
 * invisible.
 */
export function normalize(property: string, value: string): string {
	const collapsed = value.trim().replace(/\s+/g, ' ');
	if (property.startsWith('border') && !property.includes('radius')) {
		return ZERO_WIDTH_BORDER.test(collapsed) ? '0px' : collapsed;
	}
	if (property === 'box-shadow') {
		const visible = splitLayers(collapsed).filter((layer) => !TRANSPARENT_COLOR.test(layer));
		return visible.length === 0 ? 'none' : visible.join(', ');
	}
	return collapsed;
}

/**
 * Exact string equality on the computed value, except properties listed
 * as tolerant, which match when both sides are single px lengths within
 * the configured tolerance (sub-pixel layout rounding).
 */
export function valuesMatch(
	property: string,
	legacy: string,
	current: string,
	thresholds: Pick<Thresholds, 'probeLengthTolerancePx' | 'probeTolerantProperties'>,
): boolean {
	const left = normalize(property, legacy);
	const right = normalize(property, current);
	if (left === right) return left !== MISSING;
	if (!thresholds.probeTolerantProperties.includes(property)) return false;
	const leftPx = PX_LENGTH.exec(left);
	const rightPx = PX_LENGTH.exec(right);
	if (leftPx === null || rightPx === null) return false;
	return Math.abs(Number(leftPx[1]) - Number(rightPx[1])) <= thresholds.probeLengthTolerancePx;
}

export function probeWaiver(
	waivers: readonly Waiver[],
	probe: string,
	property: string,
): Waiver | undefined {
	return waivers.find(
		(waiver) =>
			waiver.kind === 'probe' &&
			waiver.probe === probe &&
			(waiver.property === undefined || waiver.property === property),
	);
}
