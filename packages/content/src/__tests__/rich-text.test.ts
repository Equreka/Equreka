import { describe, expect, it } from 'vitest';
import {
	canonicalTex,
	hydrateMathBody,
	splitLocalizedText,
	splitRichText,
	stripMacros,
	stripMacrosToText,
	termIdentifier,
	termMacroPattern,
} from '../rich-text.js';

describe('splitRichText', () => {
	it('interleaves text and inline math, keeping text byte-for-byte', () => {
		expect(splitRichText('The ampere, symbol $A$, measures $I$.')).toEqual([
			{ t: 'text', v: 'The ampere, symbol ' },
			{ t: 'math', tex: 'A', raw: 'A', display: false },
			{ t: 'text', v: ', measures ' },
			{ t: 'math', tex: 'I', raw: 'I', display: false },
			{ t: 'text', v: '.' },
		]);
	});

	it('distinguishes display from inline fragments', () => {
		expect(splitRichText('Defined as $$E = mc^2$$ where $c$ is fixed.')).toEqual([
			{ t: 'text', v: 'Defined as ' },
			{ t: 'math', tex: 'E = mc^2', raw: 'E = mc^2', display: true },
			{ t: 'text', v: ' where ' },
			{ t: 'math', tex: 'c', raw: 'c', display: false },
			{ t: 'text', v: ' is fixed.' },
		]);
	});

	it('carries canonical tex (macros stripped, dashes folded) next to the authored raw', () => {
		expect(splitRichText('$\\mag{E} = \\const{c}^{2} \\var{mu}$ and $10^{–19}$')).toEqual([
			{
				t: 'math',
				tex: '{E} = {c}^{2} {mu}',
				raw: '\\mag{E} = \\const{c}^{2} \\var{mu}',
				display: false,
			},
			{ t: 'text', v: ' and ' },
			{ t: 'math', tex: '10^{-19}', raw: '10^{–19}', display: false },
		]);
	});

	it('keeps raw byte-for-byte so canonicalTex(raw) is exactly tex', () => {
		const authored = 'Force $\\mag{F} = \\var{m} · \\mag{a}$ over $$\\Delta t = t_{2} − t_{1}$$.';
		for (const segment of splitRichText(authored)) {
			if (segment.t === 'math') {
				expect(canonicalTex(segment.raw)).toBe(segment.tex);
				expect(authored).toContain(segment.raw);
			}
		}
	});

	it("preserves apostrophes, backslashes and unmatched '$' in text", () => {
		expect(splitRichText("Ohm's law: it's $V = IR$; costs $5 \\ plain")).toEqual([
			{ t: 'text', v: "Ohm's law: it's " },
			{ t: 'math', tex: 'V = IR', raw: 'V = IR', display: false },
			{ t: 'text', v: '; costs $5 \\ plain' },
		]);
		expect(splitRichText('$\\Delta ν_{Cs}$')).toEqual([
			{ t: 'math', tex: '\\Delta ν_{Cs}', raw: '\\Delta ν_{Cs}', display: false },
		]);
	});

	it('returns a single text segment for math-free prose and nothing for empty text', () => {
		expect(splitRichText('plain')).toEqual([{ t: 'text', v: 'plain' }]);
		expect(splitRichText('')).toEqual([]);
	});

	it('does not span inline math across lines', () => {
		expect(splitRichText('a $b\nc$ d')).toEqual([{ t: 'text', v: 'a $b\nc$ d' }]);
	});

	it('keeps a hard line break after inline math in the following text segment', () => {
		expect(splitRichText('squared $(\\const{c}^{2})$.\nBecause $c$ is large')).toEqual([
			{ t: 'text', v: 'squared ' },
			{ t: 'math', tex: '({c}^{2})', raw: '(\\const{c}^{2})', display: false },
			{ t: 'text', v: '.\nBecause ' },
			{ t: 'math', tex: 'c', raw: 'c', display: false },
			{ t: 'text', v: ' is large' },
		]);
	});
});

describe('canonicalTex', () => {
	it('is idempotent', () => {
		const once = canonicalTex('\\mag{F} = \\var{k} · 10^{−1}');
		expect(canonicalTex(once)).toBe(once);
		expect(once).toBe('{F} = {k} · 10^{-1}');
	});
});

describe('stripMacros / stripMacrosToText', () => {
	it('keeps the brace group for TeX and drops it for plain text', () => {
		const authored = 'where $x = \\mag{E}$ is energy and \\const{c} the speed of light';
		expect(stripMacros(authored)).toBe('where $x = {E}$ is energy and {c} the speed of light');
		expect(stripMacrosToText(authored)).toBe('where $x = E$ is energy and c the speed of light');
	});

	it('leaves macro-free text untouched', () => {
		expect(stripMacrosToText('plain $x^{2}$')).toBe('plain $x^{2}$');
	});

	it('carries term keys with one level of nested braces', () => {
		expect(stripMacros('\\var{v_{0}}^{2}+\\var{[\\mathrm{H}^{+}]}')).toBe(
			'{v_{0}}^{2}+{[\\mathrm{H}^{+}]}',
		);
		expect(stripMacrosToText('$\\mag{v_{0}}$')).toBe('$v_{0}$');
	});
});

describe('termMacroPattern', () => {
	it('returns an independent global RegExp per call', () => {
		const first = termMacroPattern();
		first.exec('\\var{x} \\var{y}');
		expect(first.lastIndex).toBeGreaterThan(0);
		expect(termMacroPattern().lastIndex).toBe(0);
		expect(termMacroPattern().exec('\\var{y}')?.[2]).toBe('y');
	});
});

describe('termIdentifier', () => {
	it('derives from the key and lets an override win', () => {
		expect(termIdentifier('\\pi')).toBe('pi');
		expect(termIdentifier('v_{0}')).toBe('v_0');
		expect(termIdentifier('\\Delta x')).toBe('Deltax');
		expect(termIdentifier('[\\mathrm{H}^{+}]', 'cH')).toBe('cH');
	});
});

describe('splitLocalizedText', () => {
	it('splits present locales only', () => {
		const segments = splitLocalizedText({ en: 'x $y$', es: undefined });
		expect(Object.keys(segments)).toEqual(['en']);
		expect(segments.en).toEqual([
			{ t: 'text', v: 'x ' },
			{ t: 'math', tex: 'y', raw: 'y', display: false },
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
