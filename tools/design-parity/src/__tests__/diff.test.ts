import { describe, expect, it } from 'vitest';
import { diffImages, percent } from '../diff.js';
import { createImage, fillBoxes, type Image } from '../image.js';
import { pixelDelta } from '../stability.js';

function withPixel(image: Image, x: number, y: number, value: number): Image {
	const copy = { ...image, data: image.data.slice() };
	copy.data.set([value, value, value, 255], (y * image.width + x) * 4);
	return copy;
}

describe('pixelDelta', () => {
	it('reports zero for byte-identical images', () => {
		const image = createImage(4, 3, [10, 20, 30]);
		expect(pixelDelta(image, image)).toEqual({
			pixels: 0,
			maxChannelDelta: 0,
			box: null,
			sizeChanged: false,
		});
	});

	it('counts any channel difference and bounds it', () => {
		const base = createImage(5, 5, [0, 0, 0]);
		const changed = withPixel(withPixel(base, 1, 1, 1), 3, 4, 200);
		expect(pixelDelta(base, changed)).toEqual({
			pixels: 2,
			maxChannelDelta: 200,
			box: { x: 1, y: 1, width: 3, height: 4 },
			sizeChanged: false,
		});
	});

	it('flags a size change', () => {
		expect(pixelDelta(createImage(2, 2, [0, 0, 0]), createImage(2, 3, [0, 0, 0])).sizeChanged).toBe(
			true,
		);
	});
});

describe('fillBoxes', () => {
	it('counts overlapping boxes once and clips to the image', () => {
		const { filled } = fillBoxes(
			createImage(10, 10, [0, 0, 0]),
			[
				{ x: 0, y: 0, width: 4, height: 4 },
				{ x: 2, y: 2, width: 4, height: 4 },
				{ x: 8, y: 8, width: 10, height: 10 },
			],
			[128, 128, 128],
		);
		expect(filled).toBe(16 + 16 - 4 + 4);
	});

	it('leaves the source untouched', () => {
		const source = createImage(2, 2, [0, 0, 0]);
		fillBoxes(source, [{ x: 0, y: 0, width: 2, height: 2 }], [255, 255, 255]);
		expect(source.data[0]).toBe(0);
	});
});

describe('diffImages with masks', () => {
	const legacy = createImage(10, 10, [255, 255, 255]);
	const current = createImage(10, 10, [255, 255, 255]);
	for (let y = 0; y < 2; y += 1) {
		for (let x = 0; x < 10; x += 1) current.data.set([0, 0, 0, 255], (y * 10 + x) * 4);
	}

	it('counts the difference without masks', () => {
		const result = diffImages(legacy, current, 0.1);
		expect(result.diffPixels).toBe(20);
		expect(percent(result.diffPixels, result.totalPixels)).toBe(20);
	});

	it('removes the masked union from numerator and denominator', () => {
		const result = diffImages(legacy, current, 0.1, [{ x: 0, y: 0, width: 10, height: 2 }]);
		expect(result.diffPixels).toBe(0);
		expect(result.maskedPixels).toBe(20);
		expect(result.totalPixels).toBe(80);
	});

	it('still counts missing area of a shorter image as different', () => {
		const result = diffImages(createImage(10, 8, [255, 255, 255]), legacy, 0.1);
		expect(result.diffPixels).toBe(20);
	});
});
