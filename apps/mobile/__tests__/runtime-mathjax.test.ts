import { describe, expect, it, jest } from '@jest/globals';
import { EX_PER_FONT_PX } from '../shared/math/hydrate';
import {
	createRuntimeMath,
	layoutRuntimeMath,
	normalizeRuntimeMath,
	RuntimeMathError,
	runtimeMath,
} from '../shared/math/runtime-mathjax';
import { createRuntimeMathCore, type RuntimeMathCore } from '../shared/math/runtime-mathjax-core';

const SYMBOLIC = 'm = \\frac{E}{c^{2}}';
const SUBSTITUTED = 'm = \\frac{8.99\\times10^{16}}{\\left(299792458\\right)^{2}}';

/**
 * Cold jest transforms MathJax's module graph on first require, which is
 * not what the on-device budget measures; the real-core suites therefore
 * boot with a generous budget, and the budget itself is proven with stubs.
 */
const TEST_BUDGET_MS = 60_000;

const STUB_SVG =
	'<svg style="vertical-align: -0.5ex;" xmlns="http://www.w3.org/2000/svg" width="4ex" height="2ex" role="img" focusable="false" viewBox="0 0 1 1"><defs></defs><g stroke="currentColor" fill="currentColor" data-mml-node="math"></g></svg>';

function stubCore(raw: string = STUB_SVG): RuntimeMathCore {
	return { renderRaw: async () => raw };
}

describe('runtime MathJax', () => {
	it('renders the solved form to one svg root with local glyph defs and ex metrics', async () => {
		const math = createRuntimeMath(async () => createRuntimeMathCore(), TEST_BUDGET_MS);
		const body = await math.render(SYMBOLIC);
		expect(body.svg.startsWith('<svg')).toBe(true);
		expect(body.svg.endsWith('</svg>')).toBe(true);
		expect(body.svg.match(/<svg\b/g)).toHaveLength(1);
		expect(body.svg).toContain('<defs>');
		expect(body.svg).toContain('fill="currentColor"');
		expect(body.svg).toContain('xlink:href="#');
		expect(body.svg).not.toMatch(/\s(?:data-[a-z-]+|role|focusable|aria-[a-z-]+|style)="/);
		expect(body.wEx).toBeGreaterThan(0);
		expect(body.hEx).toBeGreaterThan(0);
		expect(Number.isFinite(body.dyEx)).toBe(true);
		const laid = layoutRuntimeMath(body, 16);
		expect(laid.xml).toBe(body.svg);
		expect(laid.width).toBeCloseTo(body.wEx * 16 * EX_PER_FONT_PX);
		expect(laid.height).toBeCloseTo(body.hEx * 16 * EX_PER_FONT_PX);
		expect(laid.baselineShift).toBeCloseTo(body.dyEx * 16 * EX_PER_FONT_PX);
	});

	it('boots the core once across renders', async () => {
		const load = jest.fn(async () => createRuntimeMathCore());
		const math = createRuntimeMath(load, TEST_BUDGET_MS);
		const first = await math.render(SYMBOLIC);
		const second = await math.render(SUBSTITUTED);
		expect(load).toHaveBeenCalledTimes(1);
		expect(second.wEx).toBeGreaterThan(first.wEx);
	});

	it('the app-wide singleton renders within the default budget once its modules are loaded', async () => {
		const body = await runtimeMath.render('x', false);
		expect(body.svg.match(/<svg\b/g)).toHaveLength(1);
		expect(body.wEx).toBeGreaterThan(0);
	});

	it('rejects when the loader rejects and retries the boot on the next render', async () => {
		let attempts = 0;
		const load = jest.fn(async () => {
			attempts += 1;
			if (attempts === 1) throw new Error('boot failed');
			return stubCore();
		});
		const math = createRuntimeMath(load, TEST_BUDGET_MS);
		await expect(math.render('x')).rejects.toThrow('boot failed');
		await expect(math.render('x')).resolves.toMatchObject({ wEx: 4, hEx: 2, dyEx: -0.5 });
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('rejects past the budget while the boot it started keeps warming', async () => {
		let release: ((core: RuntimeMathCore) => void) | undefined;
		const load = jest.fn(
			() =>
				new Promise<RuntimeMathCore>((resolve) => {
					release = resolve;
				}),
		);
		const math = createRuntimeMath(load, 20);
		await expect(math.render('x')).rejects.toBeInstanceOf(RuntimeMathError);
		release?.(stubCore());
		await expect(math.render('x')).resolves.toMatchObject({ wEx: 4 });
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('rejects a render whose core throws', async () => {
		const math = createRuntimeMath(
			async () => ({
				renderRaw: async () => {
					throw new Error('no font');
				},
			}),
			TEST_BUDGET_MS,
		);
		await expect(math.render('x')).rejects.toThrow('no font');
	});
});

describe('normalizeRuntimeMath', () => {
	it('strips presentation attributes and keeps the local defs', () => {
		const body = normalizeRuntimeMath(STUB_SVG);
		expect(body.svg).toBe(
			'<svg xmlns="http://www.w3.org/2000/svg" width="4ex" height="2ex" viewBox="0 0 1 1"><defs></defs><g stroke="currentColor" fill="currentColor"></g></svg>',
		);
		expect(body).toMatchObject({ wEx: 4, hEx: 2, dyEx: -0.5 });
	});

	it('rejects several roots, inline TeX errors and missing metrics', () => {
		expect(() => normalizeRuntimeMath(`${STUB_SVG}<mjx-break></mjx-break>${STUB_SVG}`)).toThrow(
			RuntimeMathError,
		);
		expect(() =>
			normalizeRuntimeMath(
				STUB_SVG.replace(
					'<g stroke',
					'<g data-mml-node="merror" data-mjx-error="Missing close brace"></g><g stroke',
				),
			),
		).toThrow('Missing close brace');
		expect(() => normalizeRuntimeMath(STUB_SVG.replace(' width="4ex"', ''))).toThrow(
			'root <svg> has no width',
		);
		expect(() => normalizeRuntimeMath(STUB_SVG.replace('width="4ex"', 'width="4px"'))).toThrow(
			'not in ex',
		);
	});
});
