import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { hydrateMathBody, isLeanMathBody, type MathAtlas, type MathBody } from '../../rich-text.js';
import { loadContent } from '../load.js';
import { collectMathUses, type MathUse } from '../math-artifact.js';
import {
	createMathRenderer,
	MATH_CONFIG_HASH,
	MATHJAX_VERSION,
	MathRenderError,
	type MathRenderer,
	normalizeMathBody,
	stripPresentationAttributes,
} from '../math-render.js';
import { encodeMathBody } from '../math-shards.js';
import { validateContent } from '../validate.js';

const CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

const SAMPLE_SIZE = 10;

const FRACTION_OR_ROOT = /\\(frac|dfrac|sqrt)/;

let samples: [string, MathUse][];
let global: MathRenderer;

beforeAll(async () => {
	const corpus = validateContent(loadContent(CONTENT_DIR)).corpus;
	const uses = [...collectMathUses(corpus)].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	const stride = Math.floor(uses.length / (SAMPLE_SIZE - 1));
	const strided = Array.from(
		{ length: SAMPLE_SIZE - 1 },
		(_, index) => uses[index * stride] as [string, MathUse],
	);
	const fraction = uses.find(([tex]) => FRACTION_OR_ROOT.test(tex));
	samples = fraction ? [...strided, fraction] : strided;
	global = await createMathRenderer();
}, 60_000);

function atlasOf(renderer: MathRenderer): MathAtlas {
	return {
		schemaVersion: 2,
		font: 'mathjax-newcm',
		glyphs: Object.fromEntries(renderer.glyphPaths()),
	};
}

describe('math renderer', () => {
	it('pins the MathJax version the catalog declares', () => {
		expect(MATHJAX_VERSION).toBe('4.1.3');
		expect(MATH_CONFIG_HASH).toMatch(/^[0-9a-f]{16}$/);
	});

	it('hydrates atlas + body, rendered and lean, back to the fontCache:local rendering for sampled corpus math', async () => {
		const local = await createMathRenderer({ fontCache: 'local' });
		expect(samples.length).toBe(SAMPLE_SIZE);
		expect(samples.some(([tex]) => FRACTION_OR_ROOT.test(tex))).toBe(true);
		for (const [tex, use] of samples) {
			const body = await global.render(tex, use.display);
			const atlas = atlasOf(global);
			const hydrated = hydrateMathBody(body, atlas);
			const encoded = encodeMathBody(body, atlas);
			const expected = stripPresentationAttributes(await local.renderRaw(tex, use.display)).replace(
				/MJX-\d+-/g,
				'MJX-',
			);
			expect(hydrated, tex).toBe(expected);
			expect(isLeanMathBody(encoded), tex).toBe(true);
			expect(hydrateMathBody(encoded, atlas), tex).toBe(expected);
			expect(body.svg.includes('<defs>'), tex).toBe(false);
			expect(body.svg).toMatch(/fill="currentColor"/);
			expect(body.svg).not.toMatch(/\sdata-|\srole=|\sfocusable=|\sstyle=|\saria-/);
		}
	}, 60_000);

	it('rejects line-broken output: multiple <svg> roots fail the one-root assertion', async () => {
		const breaking = await createMathRenderer({
			linebreaks: { inline: true },
			containerWidth: 336,
		});
		const long = 'a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p+q+r+s+t+u+v+w+x+y+z+'.repeat(6);
		const raw = await breaking.renderRaw(long, false);
		expect(raw.match(/<svg\b/g)?.length ?? 0).toBeGreaterThan(1);
		expect(raw).toContain('<mjx-break');
		await expect(breaking.render(long, false)).rejects.toBeInstanceOf(MathRenderError);
		await expect(breaking.render(long, false)).rejects.toThrow(/exactly one <svg> root/);
		const unbroken = await global.render(long, false);
		expect(unbroken.svg.match(/<svg\b/g)?.length).toBe(1);
	}, 30_000);

	it('turns inline TeX errors and undefined control sequences into build errors', async () => {
		await expect(global.render('\\frac{', false)).rejects.toThrow(/TeX error: Missing close brace/);
		await expect(global.render('\\nosuchmacro x', false)).rejects.toThrow(
			/undefined control sequence \\nosuchmacro/,
		);
	});

	it('parses ex metrics, accepting a unitless zero vertical-align', async () => {
		const body = await global.render('°F', false);
		expect(body.wEx).toBeGreaterThan(0);
		expect(body.hEx).toBeGreaterThan(0);
		expect(body.dyEx).toBe(0);
		expect(body.glyphs.every((id) => id.startsWith('MJX-NCM-'))).toBe(true);
		expect(() =>
			normalizeMathBody(
				'<svg xmlns="http://www.w3.org/2000/svg" width="12px" height="1ex" style="vertical-align: 0;"></svg>',
			),
		).toThrow(/width is not in ex/);
	});

	it('renders byte-identical output across independent renderers', async () => {
		const first = await createMathRenderer();
		const second = await createMathRenderer();
		const render = async (
			renderer: MathRenderer,
		): Promise<[MathBody[], Record<string, string>]> => {
			const bodies: MathBody[] = [];
			for (const [tex, use] of samples) {
				bodies.push(await renderer.render(tex, use.display));
			}
			return [bodies, Object.fromEntries(renderer.glyphPaths())];
		};
		const [bodiesA, glyphsA] = await render(first);
		const [bodiesB, glyphsB] = await render(second);
		expect(JSON.stringify(bodiesA)).toBe(JSON.stringify(bodiesB));
		expect(JSON.stringify(glyphsA)).toBe(JSON.stringify(glyphsB));
	}, 30_000);
});
