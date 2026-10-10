import meta from '@equreka/content/artifact/meta.json';
import { SHARDED_COLLECTIONS } from '@equreka/content/presentation-shards';
import { stripMacrosToText } from '@equreka/content/rich-text';
import { COLLECTIONS } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { buildReaderPayload, type ReaderPayload, readPresentation } from '../equreka-assets';

interface FullEntry {
	name: { en: string };
	description?: { en: string; es?: string };
	textSources: unknown[];
}

describe('readPresentation', () => {
	it('reads every entry of every collection with its detail fields, sharded slices reassembled', () => {
		expect(SHARDED_COLLECTIONS.length).toBeGreaterThan(0);
		for (const collection of COLLECTIONS) {
			const slice = readPresentation<FullEntry>(collection);
			expect(Object.keys(slice), collection).toHaveLength(meta.counts[collection] ?? -1);
			for (const [slug, entry] of Object.entries(slice)) {
				expect(entry.name.en, `${collection}/${slug}`).not.toBe('');
				expect(Array.isArray(entry.textSources), `${collection}/${slug}`).toBe(true);
			}
		}
	});
});

describe('buildReaderPayload', () => {
	it('carries the description of every sharded entry, as the offline reader needs', () => {
		const payload = JSON.parse(buildReaderPayload('en')) as ReaderPayload;
		for (const collection of SHARDED_COLLECTIONS) {
			for (const [slug, entry] of Object.entries(readPresentation<FullEntry>(collection))) {
				expect(payload[collection]?.[slug]?.description, `${collection}/${slug}`).toBe(
					stripMacrosToText(entry.description?.en ?? ''),
				);
			}
		}
		expect(payload.equations?.['mass-energy-equivalence']?.description).toMatch(/\S/);
	});
});
