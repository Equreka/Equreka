import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export interface Image {
	width: number;
	height: number;
	data: Uint8Array;
}

export type Rgb = readonly [number, number, number];

export function createImage(width: number, height: number, fill: Rgb): Image {
	const data = new Uint8Array(width * height * 4);
	for (let offset = 0; offset < data.length; offset += 4) {
		data[offset] = fill[0];
		data[offset + 1] = fill[1];
		data[offset + 2] = fill[2];
		data[offset + 3] = 255;
	}
	return { width, height, data };
}

export function decodePng(buffer: Buffer): Image {
	const png = PNG.sync.read(buffer);
	return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

export function readPng(file: string): Image {
	return decodePng(readFileSync(file));
}

export function writePng(file: string, image: Image): void {
	const png = new PNG({ width: image.width, height: image.height });
	png.data = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
	writeFileSync(file, PNG.sync.write(png));
}

/**
 * Copies `source` into `target` at (x, y), clipping whatever falls
 * outside the target.
 */
export function blit(target: Image, source: Image, x: number, y: number): void {
	const rows = Math.min(source.height, target.height - y);
	const columns = Math.min(source.width, target.width - x);
	if (rows <= 0 || columns <= 0) return;
	for (let row = 0; row < rows; row += 1) {
		const from = row * source.width * 4;
		const to = ((y + row) * target.width + x) * 4;
		target.data.set(source.data.subarray(from, from + columns * 4), to);
	}
}

export function crop(source: Image, y: number, height: number): Image {
	const rows = Math.max(0, Math.min(height, source.height - y));
	const start = y * source.width * 4;
	return {
		width: source.width,
		height: rows,
		data: source.data.slice(start, start + rows * source.width * 4),
	};
}

/**
 * Returns a copy with every box (clipped to the image) filled, and the
 * number of distinct pixels the boxes covered. Without boxes the source
 * is returned as is.
 */
export function fillBoxes(
	source: Image,
	boxes: readonly { x: number; y: number; width: number; height: number }[],
	fill: Rgb,
): { image: Image; filled: number } {
	if (boxes.length === 0) return { image: source, filled: 0 };
	const image = { width: source.width, height: source.height, data: source.data.slice() };
	const covered = new Uint8Array(source.width * source.height);
	let filled = 0;
	for (const box of boxes) {
		const x0 = Math.max(0, box.x);
		const y0 = Math.max(0, box.y);
		const x1 = Math.min(source.width, box.x + box.width);
		const y1 = Math.min(source.height, box.y + box.height);
		for (let y = y0; y < y1; y += 1) {
			for (let x = x0; x < x1; x += 1) {
				const index = y * source.width + x;
				if (covered[index] === 0) {
					covered[index] = 1;
					filled += 1;
				}
				image.data.set([fill[0], fill[1], fill[2], 255], index * 4);
			}
		}
	}
	return { image, filled };
}

export function pad(source: Image, width: number, height: number, fill: Rgb): Image {
	if (source.width === width && source.height === height) return source;
	const target = createImage(width, height, fill);
	blit(target, source, 0, 0);
	return target;
}
