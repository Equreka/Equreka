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

export function pad(source: Image, width: number, height: number, fill: Rgb): Image {
	if (source.width === width && source.height === height) return source;
	const target = createImage(width, height, fill);
	blit(target, source, 0, 0);
	return target;
}
