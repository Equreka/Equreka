const FNV_OFFSET_BASIS = 0x811c9dc5;

const FNV_PRIME = 0x01000193;

const REPLACEMENT_CHARACTER = 0xfffd;

/**
 * The largest shard count `shardName` can spell in two hex digits.
 */
export const MAX_SHARD_COUNT = 256;

function utf8Bytes(text: string): number[] {
	return Array.from(text, (char): number[] => {
		const point = char.codePointAt(0) ?? REPLACEMENT_CHARACTER;
		const code = point >= 0xd800 && point <= 0xdfff ? REPLACEMENT_CHARACTER : point;
		if (code < 0x80) {
			return [code];
		}
		if (code < 0x800) {
			return [0xc0 | (code >> 6), 0x80 | (code & 0x3f)];
		}
		if (code < 0x10000) {
			return [0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)];
		}
		return [
			0xf0 | (code >> 18),
			0x80 | ((code >> 12) & 0x3f),
			0x80 | ((code >> 6) & 0x3f),
			0x80 | (code & 0x3f),
		];
	}).flat();
}

/**
 * Standard 32-bit FNV-1a over the UTF-8 bytes of `text`, unsigned, so any
 * other implementation of the published algorithm agrees with it. A lone
 * surrogate hashes as U+FFFD, the byte sequence TextEncoder produces for it.
 */
export function fnv1a32(text: string): number {
	return (
		utf8Bytes(text).reduce((hash, byte) => Math.imul(hash ^ byte, FNV_PRIME), FNV_OFFSET_BASIS) >>>
		0
	);
}

/**
 * Whether `count` can shard by low hash bits and be named by `shardName`.
 */
export function isValidShardCount(count: number): boolean {
	return (
		Number.isInteger(count) && count >= 1 && count <= MAX_SHARD_COUNT && (count & (count - 1)) === 0
	);
}

/**
 * The shard a key ships in: the low bits of its FNV-1a hash. A pure function
 * of the key, so a reader holding only the key finds its shard without a
 * manifest, and a key never moves while `count` is unchanged. `count` must
 * satisfy `isValidShardCount`; the constants passed here are checked by
 * tests, not on this hot path.
 */
export function shardOf(key: string, count: number): number {
	return fnv1a32(key) & (count - 1);
}

/**
 * The `<shard>` file name stem: two lowercase hex digits.
 */
export function shardName(shard: number): string {
	return shard.toString(16).padStart(2, '0');
}
