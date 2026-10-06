import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

/**
 * Placeholder app-icon rasterization from docs/brand/logo.png (82×50 RGBA):
 * a pure-Node PNG decode → bilinear upscale → encode, because the
 * workstation has no ImageMagick/PIL and the SVG logo needs a real
 * renderer. Replace the outputs with a designer export before store
 * submission; the geometry (1024² icon, transparent adaptive foreground
 * inside the 66% safe zone, transparent splash mark) already matches Expo's
 * requirements so only the pixels change.
 */
const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');
const logoPath = join(appRoot, '..', '..', 'docs', 'brand', 'logo.png');
const ACCENT = [0x4f, 0x46, 0xe5, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

const CRC_TABLE = new Int32Array(256).map((_, n) => {
	let c = n;
	for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c;
});

function crc32(bytes) {
	let crc = -1;
	for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, crc]);
}

function paeth(a, b, c) {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) return a;
	return pb <= pc ? b : c;
}

function decodePng(buffer) {
	let offset = 8;
	let width = 0;
	let height = 0;
	const idat = [];
	while (offset < buffer.length) {
		const length = buffer.readUInt32BE(offset);
		const type = buffer.toString('ascii', offset + 4, offset + 8);
		const data = buffer.subarray(offset + 8, offset + 8 + length);
		if (type === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
				throw new Error('brand-icons: logo.png must be 8-bit RGBA, non-interlaced');
			}
		} else if (type === 'IDAT') {
			idat.push(data);
		}
		offset += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * 4;
	const pixels = Buffer.alloc(stride * height);
	for (let y = 0; y < height; y += 1) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		for (let x = 0; x < stride; x += 1) {
			const a = x >= 4 ? pixels[y * stride + x - 4] : 0;
			const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
			const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
			let value = line[x];
			if (filter === 1) value += a;
			else if (filter === 2) value += b;
			else if (filter === 3) value += (a + b) >> 1;
			else if (filter === 4) value += paeth(a, b, c);
			pixels[y * stride + x] = value & 0xff;
		}
	}
	return { width, height, pixels };
}

function encodePng(width, height, pixels) {
	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0;
		pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

function sample(source, x, y, channel) {
	const cx = Math.min(source.width - 1, Math.max(0, x));
	const cy = Math.min(source.height - 1, Math.max(0, y));
	return source.pixels[(cy * source.width + cx) * 4 + channel];
}

function bilinear(source, fx, fy, channel) {
	const x0 = Math.floor(fx);
	const y0 = Math.floor(fy);
	const tx = fx - x0;
	const ty = fy - y0;
	const top = sample(source, x0, y0, channel) * (1 - tx) + sample(source, x0 + 1, y0, channel) * tx;
	const bottom =
		sample(source, x0, y0 + 1, channel) * (1 - tx) + sample(source, x0 + 1, y0 + 1, channel) * tx;
	return top * (1 - ty) + bottom * ty;
}

function compose(size, background, source, markWidth) {
	const scale = markWidth / source.width;
	const markHeight = Math.round(source.height * scale);
	const left = (size - markWidth) / 2;
	const top = (size - markHeight) / 2;
	const pixels = Buffer.alloc(size * size * 4);
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const at = (y * size + x) * 4;
			const sx = (x - left) / scale;
			const sy = (y - top) / scale;
			const inside = sx >= 0 && sy >= 0 && sx < source.width && sy < source.height;
			const alpha = inside ? bilinear(source, sx, sy, 3) / 255 : 0;
			for (let channel = 0; channel < 3; channel += 1) {
				const mark = inside ? bilinear(source, sx, sy, channel) : 0;
				const bg = background[channel] * (background[3] / 255);
				pixels[at + channel] = Math.round(mark * alpha + bg * (1 - alpha));
			}
			pixels[at + 3] = Math.round(255 * (alpha + (background[3] / 255) * (1 - alpha)));
		}
	}
	return encodePng(size, size, pixels);
}

const logo = decodePng(readFileSync(logoPath));
const outputs = [
	['icon.png', compose(1024, ACCENT, logo, 640)],
	['adaptive-icon.png', compose(1024, TRANSPARENT, logo, 560)],
	['splash-icon.png', compose(512, TRANSPARENT, logo, 400)],
];
for (const [name, png] of outputs) {
	writeFileSync(join(appRoot, 'assets', name), png);
	console.log(`brand-icons: wrote assets/${name} (${png.length} bytes)`);
}
