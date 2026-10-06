import pixelmatch from 'pixelmatch';
import { createImage, fillBoxes, type Image, pad, type Rgb } from './image.js';
import type { Box } from './stability.js';

/**
 * Distinct fills for the area one image has and the other lacks, so a
 * size mismatch always counts as different pixels instead of matching
 * padding against padding.
 */
const LEGACY_PAD: Rgb = [255, 0, 255];
const CURRENT_PAD: Rgb = [0, 255, 0];
const MASK_FILL: Rgb = [128, 128, 128];

export interface DiffResult {
	diffPixels: number;
	totalPixels: number;
	maskedPixels: number;
	diff: Image;
	legacy: Image;
	current: Image;
}

/**
 * `masks` are painted the same color in both images after padding, so
 * their union never differs; the masked pixels leave the denominator
 * instead of diluting the percentage with guaranteed matches.
 */
export function diffImages(
	legacy: Image,
	current: Image,
	threshold: number,
	masks: readonly Box[] = [],
): DiffResult {
	const width = Math.max(legacy.width, current.width);
	const height = Math.max(legacy.height, current.height);
	const left = fillBoxes(pad(legacy, width, height, LEGACY_PAD), masks, MASK_FILL);
	const right = fillBoxes(pad(current, width, height, CURRENT_PAD), masks, MASK_FILL);
	const maskedPixels = left.filled;
	const diff = createImage(width, height, [255, 255, 255]);
	const diffPixels = pixelmatch(left.image.data, right.image.data, diff.data, width, height, {
		threshold,
	});
	return {
		diffPixels,
		totalPixels: width * height - maskedPixels,
		maskedPixels,
		diff,
		legacy: left.image,
		current: right.image,
	};
}

export interface RegionDiff {
	name: string;
	diffPixels: number;
	totalPixels: number;
	presence: 'both' | 'legacy-only' | 'current-only';
	result?: DiffResult;
}

/**
 * A region present in one app only is entirely different by definition;
 * its whole area enters the denominator and the numerator.
 */
export function diffRegion(
	name: string,
	legacy: Image | undefined,
	current: Image | undefined,
	threshold: number,
): RegionDiff | undefined {
	if (legacy === undefined && current === undefined) return undefined;
	if (legacy === undefined || current === undefined) {
		const present = legacy ?? current;
		const area = present === undefined ? 0 : present.width * present.height;
		return {
			name,
			diffPixels: area,
			totalPixels: area,
			presence: legacy === undefined ? 'current-only' : 'legacy-only',
		};
	}
	const result = diffImages(legacy, current, threshold);
	return {
		name,
		diffPixels: result.diffPixels,
		totalPixels: result.totalPixels,
		presence: 'both',
		result,
	};
}

export function percent(diffPixels: number, totalPixels: number): number {
	if (totalPixels === 0) return 0;
	return Math.round((diffPixels / totalPixels) * 100_000) / 1_000;
}
