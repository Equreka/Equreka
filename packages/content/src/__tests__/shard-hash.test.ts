import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fnv1a32, isValidShardCount, MAX_SHARD_COUNT, shardName, shardOf } from '../shard-hash.js';

describe('fnv1a32', () => {
	it('hashes with standard FNV-1a 32 over UTF-8, matching published vectors', () => {
		expect(fnv1a32('')).toBe(0x811c9dc5);
		expect(fnv1a32('a')).toBe(0xe40c292c);
		expect(fnv1a32('foobar')).toBe(0xbf9cf968);
	});

	it('encodes non-ASCII text exactly as TextEncoder, astral characters and lone surrogates included', () => {
		const reference = (text: string): number =>
			Array.from(new TextEncoder().encode(text)).reduce(
				(hash, byte) => Math.imul(hash ^ byte, 0x01000193),
				0x811c9dc5,
			) >>> 0;
		for (const text of ['°F', 'ℓ', 'Å', 'α_{0}', '\\mathcal{E}', '𝔼', '\ud800', 'x\udc00y']) {
			expect(fnv1a32(text), JSON.stringify(text)).toBe(reference(text));
		}
	});
});

describe('shardOf', () => {
	it('is the low bits of the hash, inside [0, count) for every valid count', () => {
		const counts = Array.from({ length: 9 }, (_, power) => 2 ** power);
		expect(counts.every(isValidShardCount)).toBe(true);
		fc.assert(
			fc.property(fc.string({ unit: 'binary' }), fc.constantFrom(...counts), (key, count) => {
				const shard = shardOf(key, count);
				return shard === fnv1a32(key) % count && shard >= 0 && shard < count;
			}),
		);
	});

	it('keeps a key in the shard named by the lower count when the count doubles', () => {
		fc.assert(fc.property(fc.string(), (key) => shardOf(key, 32) % 16 === shardOf(key, 16)));
	});

	it('accepts only powers of two that two hex digits can name', () => {
		for (const count of [0, 3, 12, 2 * MAX_SHARD_COUNT, 1.5, -2]) {
			expect(isValidShardCount(count), String(count)).toBe(false);
		}
		expect(shardName(0)).toBe('00');
		expect(shardName(15)).toBe('0f');
		expect(shardName(MAX_SHARD_COUNT - 1)).toBe('ff');
	});
});
