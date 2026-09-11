import { describe, expect, it } from 'vitest';
import { canonicalTex, hydrateMathBody, splitLocalizedText, splitRichText } from '../rich-text.js';

describe('splitRichText', () => {
	it('interleaves text and inline math, keeping text byte-for-byte', () => {
		expect(splitRichText('The ampere, symbol $A$, measures $I$.')).toEqual([
			{ t: 'text', v: 'The ampere, symbol ' },
			{ t: 'math', tex: 'A', display: false },
			{ t: 'text', v: ', measures ' },
			{ t: 'math', tex: 'I', display: false },
			{ t: 'text', v: '.' },
		]);
	});

	it('distinguishes display from inline fragments', () => {
		expect(splitRichText('Defined as $$E = mc^2$$ where $c$ is fixed.')).toEqual([
			{ t: 'text', v: 'Defined as ' },
			{ t: 'math', tex: 'E = mc^2', display: true },
			{ t: 'text', v: ' where ' },
			{ t: 'math', tex: 'c', display: false },
			{ t: 'text', v: ' is fixed.' },
		]);
	});

	it('strips annotation macros to brace-grouped arguments and folds dashes', () => {
		expect(splitRichText('$\\mag{E} = \\const{c}^{2} \\var{mu}$ and $10^{–19}$')).toEqual([
			{ t: 'math', tex: '{E} = {c}^{2} {mu}', display: false },
			{ t: 'text', v: ' and ' },
			{ t: 'math', tex: '10^{-19}', display: false },
		]);
	});

	it("preserves apostrophes, backslashes and unmatched '$' in text", () => {
		expect(splitRichText("Ohm's law: it's $V = IR$; costs $5 \\ plain")).toEqual([
			{ t: 'text', v: "Ohm's law: it's " },
			{ t: 'math', tex: 'V = IR', display: false },
			{ t: 'text', v: '; costs $5 \\ plain' },
		]);
		expect(splitRichText('$\\Delta ν_{Cs}$')).toEqual([
			{ t: 'math', tex: '\\Delta ν_{Cs}', display: false },
		]);
	});

	it('returns a single text segment for math-free prose and nothing for empty text', () => {
		expect(splitRichText('plain')).toEqual([{ t: 'text', v: 'plain' }]);
		expect(splitRichText('')).toEqual([]);
	});

	it('does not span inline math across lines', () => {
		expect(splitRichText('a $b\nc$ d')).toEqual([{ t: 'text', v: 'a $b\nc$ d' }]);
	});
});

describe('canonicalTex', () => {
	it('is idempotent', () => {
		const once = canonicalTex('\\mag{F} = \\var{k} · 10^{−1}');
		expect(canonicalTex(once)).toBe(once);
		expect(once).toBe('{F} = {k} · 10^{-1}');
	});
});

describe('splitLocalizedText', () => {
	it('splits present locales only', () => {
		const segments = splitLocalizedText({ en: 'x $y$', es: undefined });
		expect(Object.keys(segments)).toEqual(['en']);
		expect(segments.en).toEqual([
			{ t: 'text', v: 'x ' },
			{ t: 'math', tex: 'y', display: false },
		]);
	});
});

describe('hydrateMathBody', () => {
	const atlas = {
		schemaVersion: 1 as const,
		font: 'mathjax-newcm' as const,
		glyphs: { 'MJX-NCM-I-1D465': 'M1 2' },
	};

	it('prepends a defs block with the body glyphs in first-use order', () => {
		const svg =
			'<svg xmlns="http://www.w3.org/2000/svg" width="1ex"><g><use xlink:href="#MJX-NCM-I-1D465"></use></g></svg>';
		expect(
			hydrateMathBody({ svg, wEx: 1, hEx: 1, dyEx: 0, glyphs: ['MJX-NCM-I-1D465'] }, atlas),
		).toBe(
			'<svg xmlns="http://www.w3.org/2000/svg" width="1ex"><defs><path id="MJX-NCM-I-1D465" d="M1 2"></path></defs><g><use xlink:href="#MJX-NCM-I-1D465"></use></g></svg>',
		);
	});

	it('returns glyph-free bodies untouched and throws on a missing glyph', () => {
		const body = { svg: '<svg></svg>', wEx: 0, hEx: 0, dyEx: 0, glyphs: [] };
		expect(hydrateMathBody(body, atlas)).toBe('<svg></svg>');
		expect(() => hydrateMathBody({ ...body, glyphs: ['MJX-NCM-N-30'] }, atlas)).toThrow(
			/no glyph 'MJX-NCM-N-30'/,
		);
	});
});
