import type { MathBody } from '@equreka/content/rich-text';
import { describe, expect, it } from '@jest/globals';
import { getMathAtlas, getMathBodies } from '../shared/content/artifact';
import { EX_PER_FONT_PX, hydrateForSvg } from '../shared/math/hydrate';

describe('hydrateForSvg', () => {
	const atlas = getMathAtlas();
	const bodies = getMathBodies();

	it('prepends exactly the glyphs the body references and scales ex metrics', () => {
		const body = bodies.m;
		expect(body).toBeDefined();
		if (body === undefined) return;
		const hydrated = hydrateForSvg(body, atlas, 16);
		expect(hydrated).not.toBeNull();
		if (hydrated === null) return;
		expect(hydrated.xml.startsWith('<svg')).toBe(true);
		expect(hydrated.xml).toContain('<defs>');
		for (const id of body.glyphs) {
			expect(hydrated.xml).toContain(`<path id="${id}"`);
		}
		expect(hydrated.width).toBeCloseTo(body.wEx * 16 * EX_PER_FONT_PX);
		expect(hydrated.height).toBeCloseTo(body.hEx * 16 * EX_PER_FONT_PX);
		expect(hydrated.baselineShift).toBeCloseTo(body.dyEx * 16 * EX_PER_FONT_PX);
	});

	it('hydrates every body of the bundled artifact against the bundled atlas', () => {
		const failures = Object.keys(bodies).filter((tex) => {
			const body = bodies[tex];
			return body === undefined || hydrateForSvg(body, atlas, 16) === null;
		});
		expect(failures).toEqual([]);
	});

	it('returns null instead of drawing a partial formula when a glyph is missing', () => {
		const body: MathBody = {
			svg: '<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="#missing"></use></svg>',
			wEx: 1,
			hEx: 1,
			dyEx: 0,
			glyphs: ['MJX-NCM-MISSING'],
		};
		expect(hydrateForSvg(body, atlas, 16)).toBeNull();
	});

	it('returns null for a body without an svg root', () => {
		const body: MathBody = { svg: '<g></g>', wEx: 1, hEx: 1, dyEx: 0, glyphs: ['MJX-NCM-N-30'] };
		expect(hydrateForSvg(body, atlas, 16)).toBeNull();
	});
});
