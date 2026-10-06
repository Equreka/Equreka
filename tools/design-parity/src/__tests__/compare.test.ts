import { describe, expect, it } from 'vitest';
import { MISSING, probeWaiver, valuesMatch } from '../compare.js';
import type { Waiver } from '../config.js';

const thresholds = { probeLengthTolerancePx: 1, probeTolerantProperties: ['height', 'max-width'] };

describe('valuesMatch', () => {
	it('matches identical computed values after whitespace normalization', () => {
		expect(valuesMatch('color', 'rgb(1, 2, 3)', ' rgb(1, 2,  3) ', thresholds)).toBe(true);
	});

	it('compares non-tolerant lengths exactly', () => {
		expect(valuesMatch('padding-top', '24px', '24.5px', thresholds)).toBe(false);
	});

	it('accepts tolerant lengths within the tolerance', () => {
		expect(valuesMatch('height', '98px', '98.9px', thresholds)).toBe(true);
		expect(valuesMatch('height', '98px', '99.5px', thresholds)).toBe(false);
	});

	it('never tolerates compound values', () => {
		expect(valuesMatch('max-width', '100px 2px', '100.5px 2px', thresholds)).toBe(false);
	});

	it('treats any zero-width border as no border', () => {
		expect(
			valuesMatch('border', '0px none rgb(1, 2, 3)', '0px solid rgb(9, 9, 9)', thresholds),
		).toBe(true);
		expect(
			valuesMatch('border', '1px solid rgb(1, 2, 3)', '1px solid rgb(9, 9, 9)', thresholds),
		).toBe(false);
	});

	it('drops fully transparent shadow layers', () => {
		expect(
			valuesMatch(
				'box-shadow',
				'rgba(0, 0, 0, 0.15) 0px 8px 16px -8px, rgba(249, 250, 250, 0) 0px 0px 0px 1px inset',
				'rgba(0, 0, 0, 0.15) 0px 8px 16px -8px',
				thresholds,
			),
		).toBe(true);
		expect(valuesMatch('box-shadow', 'rgba(0, 0, 0, 0) 0px 1px 2px', 'none', thresholds)).toBe(
			true,
		);
	});

	it('never matches a missing element, even against another missing one', () => {
		expect(valuesMatch('color', MISSING, MISSING, thresholds)).toBe(false);
	});
});

describe('probeWaiver', () => {
	const waivers: Waiver[] = [
		{ kind: 'probe', probe: 'card', property: 'box-shadow', reason: 'reason long enough' },
		{ kind: 'probe', probe: 'badge', reason: 'reason long enough' },
		{ kind: 'hide', app: 'current', selector: '.x', reason: 'reason long enough' },
	];

	it('matches a property-scoped waiver only on that property', () => {
		expect(probeWaiver(waivers, 'card', 'box-shadow')).toBeDefined();
		expect(probeWaiver(waivers, 'card', 'color')).toBeUndefined();
	});

	it('matches a probe-wide waiver on every property', () => {
		expect(probeWaiver(waivers, 'badge', 'color')).toBeDefined();
	});
});
