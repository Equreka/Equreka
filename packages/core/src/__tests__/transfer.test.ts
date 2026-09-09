import { describe, expect, it } from 'vitest';
import { FAVORITES_KEY } from '../hooks/use-favorites';
import { PATH_PROGRESS_KEY } from '../hooks/use-path-progress';
import { exportEnvelope, importEnvelope } from '../transfer';
import { createMemoryStorage } from './memory-storage';

const metre = { collection: 'units', slug: 'metre', addedAt: '2026-01-01T00:00:00.000Z' };
const density = { collection: 'equations', slug: 'density', addedAt: '2026-01-02T00:00:00.000Z' };

describe('exportEnvelope', () => {
	it('omits pathProgress when nothing is completed', () => {
		const storage = createMemoryStorage({ [FAVORITES_KEY]: JSON.stringify([metre]) });
		expect(exportEnvelope(storage)).toEqual({ v: 1, favorites: [metre] });
	});

	it('includes completed steps per path', () => {
		const storage = createMemoryStorage({
			[FAVORITES_KEY]: JSON.stringify([metre]),
			[PATH_PROGRESS_KEY]: JSON.stringify({ 'si-base-units': ['intro', 'metre'] }),
		});
		expect(exportEnvelope(storage)).toEqual({
			v: 1,
			favorites: [metre],
			pathProgress: { 'si-base-units': ['intro', 'metre'] },
		});
	});
});

describe('importEnvelope', () => {
	it('round-trips export → import, merging both favorites and progress', () => {
		const source = createMemoryStorage({
			[FAVORITES_KEY]: JSON.stringify([metre, density]),
			[PATH_PROGRESS_KEY]: JSON.stringify({ si: ['intro', 'metre'], geo: ['pi'] }),
		});
		const target = createMemoryStorage({
			[FAVORITES_KEY]: JSON.stringify([metre]),
			[PATH_PROGRESS_KEY]: JSON.stringify({ si: ['metre', 'kilogram'] }),
		});
		const envelope = JSON.parse(JSON.stringify(exportEnvelope(source)));

		expect(importEnvelope(target, envelope)).toEqual({ favorites: 1, steps: 2 });
		expect(JSON.parse(target.get(FAVORITES_KEY) ?? '[]')).toEqual([metre, density]);
		expect(JSON.parse(target.get(PATH_PROGRESS_KEY) ?? '{}')).toEqual({
			si: ['metre', 'kilogram', 'intro'],
			geo: ['pi'],
		});
	});

	it('accepts a pre-paths v1 file with no pathProgress field', () => {
		const storage = createMemoryStorage();
		expect(importEnvelope(storage, { v: 1, favorites: [metre] })).toEqual({
			favorites: 1,
			steps: 0,
		});
		expect(storage.get(PATH_PROGRESS_KEY)).toBeNull();
	});

	it('is idempotent: a second import adds nothing', () => {
		const storage = createMemoryStorage();
		const envelope = { v: 1, favorites: [metre], pathProgress: { si: ['intro'] } };
		importEnvelope(storage, envelope);
		expect(importEnvelope(storage, envelope)).toEqual({ favorites: 0, steps: 0 });
	});

	it('rejects invalid envelopes with null and writes nothing', () => {
		const storage = createMemoryStorage();
		expect(importEnvelope(storage, { v: 2, favorites: [] })).toBeNull();
		expect(importEnvelope(storage, '[]')).toBeNull();
		expect(importEnvelope(storage, { v: 1, favorites: [metre], pathProgress: 'bad' })).toBeNull();
		expect(storage.get(FAVORITES_KEY)).toBeNull();
		expect(storage.get(PATH_PROGRESS_KEY)).toBeNull();
	});
});
