import { describe, expect, it } from 'vitest';
import {
	hydrateMathBody,
	isLeanMathBody,
	MATH_SHARD_COUNT,
	type MathAtlas,
	type MathBody,
	mathShardOf,
} from '../../rich-text.js';
import { encodeMathBody, shardMathBodies } from '../math-shards.js';

const atlas: MathAtlas = {
	schemaVersion: 2,
	font: 'mathjax-newcm',
	glyphs: { 'MJX-NCM-N-30': 'M0 0', 'MJX-NCM-N-31': 'M1 1' },
};

function rendered(inner: string, glyphs: string[]): MathBody {
	return {
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="2.262ex" height="1.507ex" viewBox="0 -666 1000 666" xmlns:xlink="http://www.w3.org/1999/xlink"><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)">${inner}</g></svg>`,
		wEx: 2.262,
		hEx: 1.507,
		dyEx: 0,
		glyphs,
	};
}

const ten = rendered(
	'<g><use xlink:href="#MJX-NCM-N-31"></use><use xlink:href="#MJX-NCM-N-30" transform="translate(500,0)"></use></g>',
	['MJX-NCM-N-31', 'MJX-NCM-N-30'],
);

describe('encodeMathBody', () => {
	it('ships a conforming body lean, hydrating to the rendered XML', () => {
		const encoded = encodeMathBody(ten, atlas);
		expect(isLeanMathBody(encoded)).toBe(true);
		expect(hydrateMathBody(encoded, atlas)).toBe(hydrateMathBody(ten, atlas));
	});

	it('ships the rendered body itself when its markup falls outside the lean grammar', () => {
		const bracketed = { ...ten, svg: ten.svg.replace('<g>', '<g data-x="[1]">') };
		expect(encodeMathBody(bracketed, atlas)).toBe(bracketed);
	});

	it('ships the rendered body itself when the lean form would hydrate differently', () => {
		const reordered = { ...ten, glyphs: ['MJX-NCM-N-30', 'MJX-NCM-N-31'] };
		expect(encodeMathBody(reordered, atlas)).toBe(reordered);
		expect(hydrateMathBody(reordered, atlas)).toContain('<defs><path id="MJX-NCM-N-30"');
	});

	it('ships the rendered body itself when the lean form would fail to hydrate', () => {
		const unlisted = { ...ten, svg: ten.svg.replace('N-30', 'N-39'), glyphs: [] };
		expect(encodeMathBody(unlisted, atlas)).toBe(unlisted);
		expect(() => hydrateMathBody(unlisted, atlas)).not.toThrow();
	});
});

describe('shardMathBodies', () => {
	it('emits every shard, empty ones included, each body in the shard its TeX hashes to', () => {
		const result = shardMathBodies({ '10': ten, x: ten }, atlas);
		expect(result.shards).toHaveLength(MATH_SHARD_COUNT);
		expect(result.shards.flatMap((shard) => Object.keys(shard)).sort()).toEqual(['10', 'x']);
		result.shards.forEach((shard, index) => {
			for (const tex of Object.keys(shard)) {
				expect(mathShardOf(tex), tex).toBe(index);
			}
		});
		expect(result.shards.some((shard) => Object.keys(shard).length === 0)).toBe(true);
		expect(result.raw).toEqual([]);
		expect(result.issues).toEqual([]);
	});

	it('reports raw bodies in one warning', () => {
		const bracketed = { ...ten, svg: ten.svg.replace('<g>', '<g data-x="[1]">') };
		const result = shardMathBodies({ '10': ten, b: bracketed, a: bracketed }, atlas);
		expect(result.raw).toEqual(['a', 'b']);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			severity: 'warning',
			stage: 'math',
			message: expect.stringContaining('2 math bodies fall outside the lean encoding'),
		});
	});
});
