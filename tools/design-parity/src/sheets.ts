import { join } from 'node:path';
import type { DiffResult, RegionDiff } from './diff.js';
import { blit, createImage, crop, type Image, type Rgb, writePng } from './image.js';

const GUTTER = 12;
const GUTTER_FILL: Rgb = [40, 40, 48];
const MAX_TILES = 8;

function triptych(parts: readonly Image[]): Image {
	const width = parts.reduce((sum, part) => sum + part.width, 0) + GUTTER * (parts.length - 1);
	const height = Math.max(...parts.map((part) => part.height));
	const sheet = createImage(width, height, GUTTER_FILL);
	let x = 0;
	for (const part of parts) {
		blit(sheet, part, x, 0);
		x += part.width + GUTTER;
	}
	return sheet;
}

/**
 * Writes `legacy | current | diff` sheets cut into viewport-tall tiles
 * so each file stays readable when an agent opens it as an image.
 * Returns the written paths.
 */
export function writeSheets(
	dir: string,
	id: string,
	result: DiffResult,
	tileHeight: number,
): string[] {
	const files: string[] = [];
	const tiles = Math.min(MAX_TILES, Math.ceil(result.diff.height / tileHeight));
	for (let tile = 0; tile < tiles; tile += 1) {
		const y = tile * tileHeight;
		const sheet = triptych([
			crop(result.legacy, y, tileHeight),
			crop(result.current, y, tileHeight),
			crop(result.diff, y, tileHeight),
		]);
		const file = join(dir, `${id}--${String(tile + 1).padStart(2, '0')}.png`);
		writePng(file, sheet);
		files.push(file);
	}
	return files;
}

/**
 * One sheet per scenario with every chrome region stacked vertically,
 * each row `legacy | current | diff`.
 */
export function writeRegionSheet(dir: string, id: string, regions: readonly RegionDiff[]): string {
	const rows = regions.flatMap((region) =>
		region.result === undefined
			? []
			: [triptych([region.result.legacy, region.result.current, region.result.diff])],
	);
	const width = Math.max(1, ...rows.map((row) => row.width));
	const height = Math.max(
		1,
		rows.reduce((sum, row) => sum + row.height + GUTTER, 0),
	);
	const sheet = createImage(width, height, GUTTER_FILL);
	let y = 0;
	for (const row of rows) {
		blit(sheet, row, 0, y);
		y += row.height + GUTTER;
	}
	const file = join(dir, `${id}--chrome.png`);
	writePng(file, sheet);
	return file;
}

export function writeAboveFoldSheet(dir: string, id: string, result: DiffResult): string {
	const file = join(dir, `${id}--above-fold.png`);
	writePng(file, triptych([result.legacy, result.current, result.diff]));
	return file;
}
