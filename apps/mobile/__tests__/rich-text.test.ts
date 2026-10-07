import { splitRichText } from '@equreka/content/rich-text';
import { describe, expect, it } from '@jest/globals';
import { pickRichText } from '../entities/content/text';
import { getPresentation } from '../shared/content/artifact';

describe('pickRichText', () => {
	it('splits bundled prose once and returns the same object on every later call', () => {
		const description = getPresentation('equations')['mass-energy-equivalence']?.description;
		expect(description).toBeDefined();
		const first = pickRichText(description, 'en');
		expect(first).toEqual({ segments: splitRichText(description?.en ?? ''), untranslated: false });
		expect(pickRichText(description, 'en')).toBe(first);
	});

	it('falls back to the English source with the untranslated flag', () => {
		const text = { en: 'speed $c$' };
		expect(pickRichText(text, 'es')).toEqual({
			segments: splitRichText('speed $c$'),
			untranslated: true,
		});
		expect(pickRichText({ en: 'a', es: 'b' }, 'es')?.untranslated).toBe(false);
		expect(pickRichText(undefined, 'en')).toBeUndefined();
	});
});
