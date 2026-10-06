import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { App } from './config.js';
import { decodePng, type Image } from './image.js';

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PixelDelta {
	pixels: number;
	maxChannelDelta: number;
	box: Box | null;
	sizeChanged: boolean;
}

/**
 * Exact pixel comparison of two captures of the same page, unlike
 * pixelmatch, which forgives anti-aliasing and small color shifts. Any
 * channel difference counts, because a capture that is not
 * byte-identical between runs makes every diff built on it drift.
 */
export function pixelDelta(first: Image, second: Image): PixelDelta {
	const width = Math.min(first.width, second.width);
	const height = Math.min(first.height, second.height);
	let pixels = 0;
	let maxChannelDelta = 0;
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const a = (y * first.width + x) * 4;
			const b = (y * second.width + x) * 4;
			let delta = 0;
			for (let channel = 0; channel < 4; channel += 1) {
				delta = Math.max(
					delta,
					Math.abs((first.data[a + channel] ?? 0) - (second.data[b + channel] ?? 0)),
				);
			}
			if (delta === 0) continue;
			pixels += 1;
			maxChannelDelta = Math.max(maxChannelDelta, delta);
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}
	return {
		pixels,
		maxChannelDelta,
		box: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
		sizeChanged: first.width !== second.width || first.height !== second.height,
	};
}

export interface UnstableCapture {
	app: App;
	capture: string;
	unstableRuns: number;
	worst: PixelDelta;
}

/**
 * Tracks, across `--runs`, whether each capture is byte-identical to
 * the first run's. Run 1's PNGs are copied to `runs/first/`; a later
 * capture that differs is copied to `runs/<n>/` next to its delta, so
 * the unstable pixels can be inspected instead of inferred from a
 * drifting diffPct.
 */
export class StabilityTracker {
	readonly #dir: string;
	readonly #hashes = new Map<string, string>();
	readonly #unstable = new Map<string, UnstableCapture>();

	constructor(outDir: string) {
		this.#dir = join(outDir, 'runs');
		rmSync(this.#dir, { recursive: true, force: true });
	}

	observe(run: number, app: App, variantId: string, files: Record<string, string>): void {
		for (const [capture, file] of Object.entries(files)) {
			const key = `${app}/${variantId}/${capture}`;
			const buffer = readFileSync(file);
			const hash = createHash('sha256').update(buffer).digest('hex');
			const firstHash = this.#hashes.get(key);
			if (firstHash === undefined) {
				const dir = join(this.#dir, 'first', app);
				mkdirSync(dir, { recursive: true });
				copyFileSync(file, join(dir, basename(file)));
				this.#hashes.set(key, hash);
				continue;
			}
			if (firstHash === hash) continue;
			const first = decodePng(readFileSync(join(this.#dir, 'first', app, basename(file))));
			const delta = pixelDelta(first, decodePng(buffer));
			const dir = join(this.#dir, String(run), app);
			mkdirSync(dir, { recursive: true });
			copyFileSync(file, join(dir, basename(file)));
			const previous = this.#unstable.get(key);
			this.#unstable.set(key, {
				app,
				capture,
				unstableRuns: (previous?.unstableRuns ?? 0) + 1,
				worst:
					previous === undefined || delta.pixels > previous.worst.pixels ? delta : previous.worst,
			});
		}
	}

	unstableFor(variantId: string): UnstableCapture[] {
		return [...this.#unstable.entries()]
			.filter(([key]) => key.split('/')[1] === variantId)
			.map(([, value]) => value);
	}
}
