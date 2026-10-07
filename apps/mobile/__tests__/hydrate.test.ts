import {
	type MathBody,
	type MathBodyV2,
	mathBodyGlyphs,
	mathBodySvg,
} from '@equreka/content/rich-text';
import { describe, expect, it } from '@jest/globals';
import { getAllMathBodies, getMathAtlas, getMathBody } from '../shared/content/artifact';
import { EX_PER_FONT_PX, hydrateForSvg } from '../shared/math/hydrate';

describe('hydrateForSvg', () => {
	const atlas = getMathAtlas();

	it('prepends exactly the glyphs the body references and scales ex metrics', () => {
		const body = getMathBody('m');
		expect(body).toBeDefined();
		if (body === undefined) return;
		const hydrated = hydrateForSvg(body, atlas, 16);
		expect(hydrated).not.toBeNull();
		if (hydrated === null) return;
		expect(hydrated.xml.startsWith('<svg')).toBe(true);
		expect(hydrated.xml).toContain('<defs>');
		const glyphs = mathBodyGlyphs(mathBodySvg(body));
		expect(glyphs.length).toBeGreaterThan(0);
		for (const id of glyphs) {
			expect(hydrated.xml).toContain(`<path id="${id}"`);
		}
		expect(hydrated.width).toBeCloseTo(body.wEx * 16 * EX_PER_FONT_PX);
		expect(hydrated.height).toBeCloseTo(body.hEx * 16 * EX_PER_FONT_PX);
		expect(hydrated.baselineShift).toBeCloseTo(body.dyEx * 16 * EX_PER_FONT_PX);
	});

	it('hydrates every body of the bundled artifact against the bundled atlas', () => {
		const bodies = getAllMathBodies();
		const failures = Object.entries(bodies)
			.filter(([, body]) => hydrateForSvg(body, atlas, 16) === null)
			.map(([tex]) => tex);
		expect(Object.keys(bodies).length).toBeGreaterThan(300);
		expect(failures).toEqual([]);
	});

	it('returns null instead of drawing a partial formula when a glyph is missing', () => {
		const raw: MathBody = {
			svg: '<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="#missing"></use></svg>',
			wEx: 1,
			hEx: 1,
			dyEx: 0,
			glyphs: ['MJX-NCM-MISSING'],
		};
		const lean: MathBodyV2 = {
			viewBox: '0 0 1 1',
			wEx: 1,
			hEx: 1,
			dyEx: 0,
			inner: '[MISSING]',
		};
		expect(hydrateForSvg(raw, atlas, 16)).toBeNull();
		expect(hydrateForSvg(lean, atlas, 16)).toBeNull();
	});

	it('returns null for a body without an svg root', () => {
		const body: MathBody = { svg: '<g></g>', wEx: 1, hEx: 1, dyEx: 0, glyphs: ['MJX-NCM-N-30'] };
		expect(hydrateForSvg(body, atlas, 16)).toBeNull();
	});
});
