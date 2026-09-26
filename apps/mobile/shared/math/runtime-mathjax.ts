import { EX_PER_FONT_PX, type HydratedMath } from './hydrate';
import { createRuntimeMathCore, type RuntimeMathCore } from './runtime-mathjax-core';

/**
 * One on-device rendering: a self-contained `<svg>` root (glyph `<defs>`
 * inside, presentation attributes stripped, `currentColor` retained) plus
 * its ex metrics on the pipeline's 16 px em / 8 px ex basis.
 */
export interface RuntimeMathBody {
	svg: string;
	wEx: number;
	hEx: number;
	dyEx: number;
}

export interface RuntimeMath {
	render(tex: string, display?: boolean): Promise<RuntimeMathBody>;
}

/**
 * Wall-clock ceiling for one render, first-call MathJax boot included
 * (Spike A: ~30 ms init, 1–5 ms per warm render under Hermes). Past it the
 * caller shows the plain solution string; the numeric result never waits.
 */
export const RUNTIME_MATH_BUDGET_MS = 250;

export class RuntimeMathError extends Error {}

/**
 * `load` runs once, on the first render, and runs again on a later render
 * only if it rejected. A render that overruns `budgetMs` rejects while the
 * boot it started keeps warming the singleton for the next one.
 */
export function createRuntimeMath(
	load: () => Promise<RuntimeMathCore>,
	budgetMs: number = RUNTIME_MATH_BUDGET_MS,
): RuntimeMath {
	let core: Promise<RuntimeMathCore> | null = null;
	const boot = (): Promise<RuntimeMathCore> => {
		if (core === null) {
			core = load().catch((error: unknown) => {
				core = null;
				throw error;
			});
		}
		return core;
	};
	return {
		render: (tex, display = true) =>
			withBudget(
				boot()
					.then((loaded) => loaded.renderRaw(tex, display))
					.then(normalizeRuntimeMath),
				budgetMs,
			),
	};
}

function withBudget<T>(work: Promise<T>, budgetMs: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new RuntimeMathError(`render exceeded the ${budgetMs} ms budget`)),
			budgetMs,
		);
		work.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

const STRIP_ATTRIBUTES_RE = /\s(?:data-[a-z-]+|role|focusable|aria-[a-z-]+|style)="[^"]*"/g;

const MERROR_RE = /data-mml-node="merror"[^>]*data-mjx-error="([^"]*)"/;

/**
 * Raw MathJax container HTML → body. Throws when the output is not exactly
 * one `<svg>` root, when MathJax reported a TeX error inline (`merror`
 * never throws) or when an ex metric is missing; the metrics are read
 * before the `style` attribute that carries `vertical-align` is stripped.
 */
export function normalizeRuntimeMath(raw: string): RuntimeMathBody {
	const roots = raw.match(/<svg\b/g)?.length ?? 0;
	if (roots !== 1 || !raw.startsWith('<svg') || !raw.endsWith('</svg>')) {
		throw new RuntimeMathError(`expected exactly one <svg> root, got ${roots}`);
	}
	const merror = MERROR_RE.exec(raw);
	if (merror !== null) {
		throw new RuntimeMathError(`TeX error: ${merror[1] ?? ''}`);
	}
	const rootTag = raw.slice(0, raw.indexOf('>') + 1);
	return {
		svg: raw.replace(STRIP_ATTRIBUTES_RE, ''),
		wEx: exMetric(rootTag, /\swidth="(-?\d+(?:\.\d+)?)([a-z%]*)"/, 'width'),
		hEx: exMetric(rootTag, /\sheight="(-?\d+(?:\.\d+)?)([a-z%]*)"/, 'height'),
		dyEx: exMetric(
			rootTag,
			/\sstyle="vertical-align:\s*(-?\d+(?:\.\d+)?)([a-z%]*);?"/,
			'vertical-align',
		),
	};
}

function exMetric(rootTag: string, pattern: RegExp, name: string): number {
	const match = pattern.exec(rootTag);
	if (match === null) {
		throw new RuntimeMathError(`root <svg> has no ${name}`);
	}
	const value = Number(match[1]);
	if (match[2] !== 'ex' && value !== 0) {
		throw new RuntimeMathError(`root <svg> ${name} is not in ex: ${match[0].trim()}`);
	}
	return value;
}

export function layoutRuntimeMath(body: RuntimeMathBody, fontSize: number): HydratedMath {
	const ex = fontSize * EX_PER_FONT_PX;
	return {
		xml: body.svg,
		width: body.wEx * ex,
		height: body.hEx * ex,
		baselineShift: body.dyEx * ex,
	};
}

/**
 * The app-wide renderer. `createRuntimeMathCore` is referenced only inside
 * `load`, so under Metro's inlineRequires (metro.config.js) the MathJax
 * graph (~1.4 MB minified, ADR 0005 Spike A) is required on the first
 * calculator solve, never at app start.
 */
export const runtimeMath: RuntimeMath = createRuntimeMath(async () => createRuntimeMathCore());
