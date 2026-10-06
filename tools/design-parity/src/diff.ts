import pixelmatch from 'pixelmatch';
import { createImage, type Image, pad, type Rgb } from './image.js';

/**
 * Distinct fills for the area one image has and the other lacks, so a
 * size mismatch always counts as different pixels instead of matching
 * padding against padding.
 */
const LEGACY_PAD: Rgb = [255, 0, 255];
const CURRENT_PAD: Rgb = [0, 255, 0];

export interface DiffResult {
	diffPixels: number;
	totalPixels: number;
	diff: Image;
	legacy: Image;
	current: Image;
}

export function diffImages(legacy: Image, current: Image, threshold: number): DiffResult {
	const width = Math.max(legacy.width, current.width);
	const height = Math.max(legacy.height, current.height);
	const left = pad(legacy, width, height, LEGACY_PAD);
	const right = pad(current, width, height, CURRENT_PAD);
	const diff = createImage(width, height, [255, 255, 255]);
	const diffPixels = pixelmatch(left.data, right.data, diff.data, width, height, { threshold });
	return { diffPixels, totalPixels: width * height, diff, legacy: left, current: right };
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
