import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { localizedProse, localizedText } from '../common.js';
import { COLLECTIONS, collectionLocaleTrees, localeSidecarSchemas } from '../index.js';
import { type LocaleNode, localeTreeOf, SOURCE_LOCALE, TRANSLATION_LOCALES } from '../locale.js';

function outline(node: LocaleNode): unknown {
	switch (node.kind) {
		case 'text':
			return node.prose ? 'prose' : 'text';
		case 'object':
			return Object.fromEntries(
				Object.entries(node.fields).map(([key, child]) => [key, outline(child)]),
			);
		case 'keyed':
			return { by: node.by, item: outline(node.item) };
	}
}

describe('locale trees', () => {
	it('keeps TRANSLATION_LOCALES in step with the optional keys of localizedText', () => {
		const keys = Object.keys(localizedText.shape).filter((key) => key !== SOURCE_LOCALE);
		expect([...TRANSLATION_LOCALES]).toEqual(keys);
		expect(Object.keys(localizedProse.shape)).toEqual(Object.keys(localizedText.shape));
	});

	it('localizes name as plain text and description as prose in every collection', () => {
		for (const collection of COLLECTIONS) {
			expect(collectionLocaleTrees[collection].fields, collection).toMatchObject({
				name: { kind: 'text', prose: false },
				description: { kind: 'text', prose: true },
			});
		}
	});

	it('leaves textSources out of every locale tree: a credited title is not translated', () => {
		for (const collection of COLLECTIONS) {
			expect(collectionLocaleTrees[collection].fields.textSources, collection).toBeUndefined();
		}
	});

	it('keys path steps by id with the union of every step kind prose field', () => {
		expect(outline(collectionLocaleTrees.paths)).toEqual({
			name: 'text',
			description: 'prose',
			steps: {
				by: 'id',
				item: { note: 'prose', body: 'prose', prompt: 'prose', answer: 'prose' },
			},
		});
	});

	it('keys equation symbol-term labels by term key', () => {
		expect(outline(collectionLocaleTrees.equations)).toEqual({
			name: 'text',
			description: 'prose',
			terms: { by: 'key', item: { label: 'text' } },
		});
	});

	it('refuses union options that disagree on whether a field is prose', () => {
		const schema = z.union([
			z.object({ name: localizedText, note: localizedText }),
			z.object({ name: localizedText, note: localizedProse }),
		]);
		expect(() => localeTreeOf(schema)).toThrow(/union options disagree .* at \(root\)\.note/);
	});

	it('refuses a list of localized items that carry no id to key them by', () => {
		const schema = z.object({
			name: localizedText,
			notes: z.array(z.object({ text: localizedText })),
		});
		expect(() => localeTreeOf(schema)).toThrow(
			/notes holds localized text but its items have no id/,
		);
	});
});

describe('sidecar schemas', () => {
	it('accepts translations in the entity nesting with steps keyed by id', () => {
		const parsed = localeSidecarSchemas.paths.safeParse({
			name: 'Escalas de temperatura',
			steps: { intro: { body: 'Prosa.' }, 'check-boiling': { prompt: '¿?', answer: 'Sí.' } },
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects any key that is not a localized field', () => {
		const level = localeSidecarSchemas.paths.safeParse({ name: 'x', level: 'intro' });
		expect(level.success).toBe(false);
		const stepField = localeSidecarSchemas.paths.safeParse({ steps: { intro: { bdy: 'x' } } });
		expect(stepField.success).toBe(false);
		const nested = localeSidecarSchemas.units.safeParse({ name: { es: 'Metro' } });
		expect(nested.success).toBe(false);
	});

	it('rejects a step key that is not a slug', () => {
		const parsed = localeSidecarSchemas.paths.safeParse({ steps: { Intro: { body: 'x' } } });
		expect(parsed.success).toBe(false);
	});
});
