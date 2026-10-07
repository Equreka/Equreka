import { describe, expect, it } from 'vitest';
import {
	canonicalTex,
	fnv1a32,
	hydrateMathBody,
	isLeanMathBody,
	leanMathBody,
	MATH_SHARD_COUNT,
	type MathAtlas,
	type MathBody,
	mathBodyGlyphs,
	mathBodySvg,
	mathShardName,
	mathShardOf,
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

	it('unwraps font and text wrappers to their content before stripping', () => {
		expect(termIdentifier('\\mathrm{KE}')).toBe('KE');
		expect(termIdentifier('[\\mathrm{H}^{+}]')).toBe('H');
		expect(termIdentifier('E_{\\mathrm{k}}')).toBe('E_k');
		expect(termIdentifier('\\text{pH}')).toBe('pH');
		expect(termIdentifier('\\textrm{pOH}')).toBe('pOH');
		expect(termIdentifier('\\mathit{Re}')).toBe('Re');
		expect(termIdentifier('\\mathbf{F}_{\\mathsf{net}}')).toBe('F_net');
		expect(termIdentifier('\\boldsymbol{\\tau}')).toBe('tau');
		expect(termIdentifier('\\operatorname {Ma}')).toBe('Ma');
		expect(termIdentifier('\\mathtt{x}')).toBe('x');
		expect(termIdentifier('\\mathrm{\\mathbf{v}}_{0}')).toBe('v_0');
	});

	it('leaves keys without wrappers as before', () => {
		expect(termIdentifier('\\theta')).toBe('theta');
		expect(termIdentifier('\\varepsilon_0')).toBe('varepsilon_0');
		expect(termIdentifier('\\bar{x}')).toBe('barx');
		expect(termIdentifier('t_{1/2}')).toBe('t_12');
	});
});

describe('hydrateMathBody', () => {
	const atlas: MathAtlas = {
		schemaVersion: 2,
		font: 'mathjax-newcm',
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

describe('lean math bodies', () => {
	const atlas: MathAtlas = {
		schemaVersion: 2,
		font: 'mathjax-newcm',
		glyphs: { 'MJX-NCM-N-30': 'M0 0', 'MJX-NCM-N-31': 'M1 1', 'MJX-NCM-I-1D465': 'M2 2' },
	};

	const root = (width: string, height: string, viewBox: string): string =>
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" xmlns:xlink="http://www.w3.org/1999/xlink"><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)">`;

	const rendered: MathBody = {
		svg: `${root('3.393ex', '1.507ex', '0 -666 1500 666')}<g><g><use xlink:href="#MJX-NCM-N-31"></use><use xlink:href="#MJX-NCM-N-30" transform="translate(500,0)"></use><use xlink:href="#MJX-NCM-N-31" transform="translate(1000,0)"></use></g><rect width="1500" height="60" x="0" y="220"></rect></g></g></svg>`,
		wEx: 3.393,
		hEx: 1.507,
		dyEx: -0.025,
		glyphs: ['MJX-NCM-N-31', 'MJX-NCM-N-30'],
	};

	it('keeps only the varying root fields and compacts glyph references', () => {
		expect(leanMathBody(rendered)).toEqual({
			viewBox: '0 -666 1500 666',
			wEx: 3.393,
			hEx: 1.507,
			dyEx: -0.025,
			inner:
				'<g><g>[N-31][N-30 translate(500,0)][N-31 translate(1000,0)]</g><rect width="1500" height="60" x="0" y="220"></rect></g>',
		});
	});

	it('reassembles the rendered svg and hydrates to the same XML as the rendered body', () => {
		const lean = leanMathBody(rendered);
		expect(lean).toBeDefined();
		if (lean === undefined) return;
		expect(isLeanMathBody(lean)).toBe(true);
		expect(isLeanMathBody(rendered)).toBe(false);
		expect(mathBodySvg(lean)).toBe(rendered.svg);
		expect(mathBodySvg(rendered)).toBe(rendered.svg);
		expect(mathBodyGlyphs(mathBodySvg(lean))).toEqual(rendered.glyphs);
		expect(hydrateMathBody(lean, atlas)).toBe(hydrateMathBody(rendered, atlas));
	});

	it('hydrates a lean body without glyph references with no defs block', () => {
		const lean = leanMathBody({
			svg: `${root('1ex', '0.5ex', '0 0 500 250')}<rect width="500" height="60" x="0" y="0"></rect></g></svg>`,
			wEx: 1,
			hEx: 0.5,
			dyEx: 0,
			glyphs: [],
		});
		expect(lean).toBeDefined();
		if (lean === undefined) return;
		expect(hydrateMathBody(lean, atlas)).not.toContain('<defs>');
		expect(hydrateMathBody(lean, atlas)).toBe(mathBodySvg(lean));
	});

	it('throws when a lean body references a glyph the atlas lacks', () => {
		const lean = leanMathBody({ ...rendered, svg: rendered.svg.replace('N-30', 'N-39') });
		expect(lean).toBeDefined();
		if (lean === undefined) return;
		expect(() => hydrateMathBody(lean, atlas)).toThrow(/no glyph 'MJX-NCM-N-39'/);
	});

	it('refuses markup outside the lean grammar', () => {
		const outside: [string, MathBody][] = [
			[
				'an unexpected root attribute',
				{ ...rendered, svg: rendered.svg.replace('<svg ', '<svg class="x" ') },
			],
			[
				'another top-level group',
				{ ...rendered, svg: rendered.svg.replace('stroke-width="0"', 'stroke-width="1"') },
			],
			['a width that is not wEx in ex', { ...rendered, wEx: 3.39 }],
			[
				'a bracket anywhere',
				{ ...rendered, svg: rendered.svg.replace('<rect ', '<rect data-x="[" ') },
			],
			['no viewBox', { ...rendered, svg: rendered.svg.replace(' viewBox="0 -666 1500 666"', '') }],
			['text after the root', { ...rendered, svg: `${rendered.svg}\n` }],
		];
		for (const [reason, body] of outside) {
			expect(leanMathBody(body), reason).toBeUndefined();
		}
	});

	it('derives glyphs in first-use order without repeats', () => {
		expect(mathBodyGlyphs(rendered.svg)).toEqual(['MJX-NCM-N-31', 'MJX-NCM-N-30']);
		expect(mathBodyGlyphs('<svg></svg>')).toEqual([]);
	});
});

describe('math shards', () => {
	it('hashes with standard FNV-1a 32 over UTF-8, matching published vectors', () => {
		expect(fnv1a32('')).toBe(0x811c9dc5);
		expect(fnv1a32('a')).toBe(0xe40c292c);
		expect(fnv1a32('foobar')).toBe(0xbf9cf968);
	});

	it('encodes non-ASCII TeX exactly as TextEncoder, astral characters and lone surrogates included', () => {
		const reference = (text: string): number =>
			Array.from(new TextEncoder().encode(text)).reduce(
				(hash, byte) => Math.imul(hash ^ byte, 0x01000193),
				0x811c9dc5,
			) >>> 0;
		for (const text of ['°F', 'ℓ', 'Å', 'α_{0}', '\\mathcal{E}', '𝔼', '\ud800', 'x\udc00y']) {
			expect(fnv1a32(text), JSON.stringify(text)).toBe(reference(text));
		}
	});

	it('pins the shard of known TeX, so a hash or count change cannot pass unnoticed', () => {
		expect(MATH_SHARD_COUNT).toBe(16);
		const golden: [string, number, number][] = [
			['m', 0xe80c2f78, 8],
			['0', 0x350ca8af, 15],
			['\\theta', 0x6e786b6d, 13],
			['\\frac{1}{2}mv^{2}', 0xdf5404df, 15],
			['\\mathrm{J}\\,\\mathrm{K}^{-1}', 0xbba9b8d8, 8],
			['°F', 0x772ba00b, 11],
			['ℓ', 0x4e8245e0, 0],
			['\\mathcal{E}', 0xb64f525a, 10],
			['𝔼', 0x1d52918e, 14],
		];
		for (const [tex, hash, shard] of golden) {
			expect(fnv1a32(tex), tex).toBe(hash);
			expect(mathShardOf(tex), tex).toBe(shard);
		}
	});

	it('keeps the shard count a power of two that two hex digits can name', () => {
		expect(MATH_SHARD_COUNT & (MATH_SHARD_COUNT - 1)).toBe(0);
		expect(MATH_SHARD_COUNT).toBeLessThanOrEqual(256);
		expect(mathShardName(0)).toBe('00');
		expect(mathShardName(15)).toBe('0f');
		expect(mathShardName(255)).toBe('ff');
		for (const tex of ['', 'a', '\\sqrt{2}', 'E=mc^{2}']) {
			expect(mathShardOf(tex)).toBeGreaterThanOrEqual(0);
			expect(mathShardOf(tex)).toBeLessThan(MATH_SHARD_COUNT);
		}
	});
});
