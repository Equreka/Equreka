import codepoints from 'bootstrap-icons/font/bootstrap-icons.json';
import { describe, expect, it } from 'vitest';
import { LEGACY_GLYPHS } from '../legacy-glyph';

describe('island legacy glyphs', () => {
	it('match the code points of the pinned bootstrap-icons font', () => {
		for (const [name, codepoint] of Object.entries(LEGACY_GLYPHS)) {
			expect(codepoint, name).toBe((codepoints as Record<string, number>)[name]);
		}
	});
});
