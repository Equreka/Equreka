import { createRequire } from 'node:module';
import type { MathJaxAdaptor, MathJaxDocument, MathJaxInstance, MathJaxOutputJax } from 'mathjax';
import { type MathBody, mathBodyGlyphs } from '../rich-text.js';
import { sha256 } from './load.js';
import { stableStringify } from './stable-json.js';

/**
 * Exactly the TeX packages the mobile runtime bundle registers (ADR 0005),
 * so a string that renders at build renders identically on-device later.
 */
export const MATH_PACKAGES = [
	'base',
	'ams',
	'newcommand',
	'noundefined',
	'unicode',
	'textmacros',
] as const;

const MATH_FONT = 'mathjax-newcm';

/**
 * Unbounded so MathJax never line-breaks display math into several `<svg>`
 * roots; inline breaking is switched off explicitly for the same reason.
 * em/ex fix the metric basis every `ex` value in the artifact is relative to.
 */
const MATH_CONVERT = { em: 16, ex: 8, containerWidth: 1_000_000 } as const;

const MATH_RENDER_CONFIG = {
	packages: MATH_PACKAGES,
	font: MATH_FONT,
	fontCache: 'global',
	linebreaks: { inline: false },
	convert: MATH_CONVERT,
} as const;

const requireHere = createRequire(import.meta.url);

const MATHJAX_ENTRY = requireHere.resolve('mathjax');

export const MATHJAX_VERSION: string = (requireHere('mathjax/package.json') as { version: string })
	.version;

export const MATH_CONFIG_HASH: string = sha256(
	Buffer.from(stableStringify(MATH_RENDER_CONFIG), 'utf8'),
).slice(0, 16);

export type MathFontCache = 'global' | 'local';

export interface MathRendererOptions {
	fontCache: MathFontCache;
	linebreaks: { inline: boolean };
	containerWidth: number;
}

/**
 * `renderRaw` is the container's innerHTML untouched; `render` passes it
 * through `normalizeMathBody`; `glyphPaths` is every glyph path this
 * renderer's font cache has accumulated so far, by atlas id.
 */
export interface MathRenderer {
	renderRaw(tex: string, display: boolean): Promise<string>;
	render(tex: string, display: boolean): Promise<MathBody>;
	glyphPaths(): Map<string, string>;
}

export class MathRenderError extends Error {}

let bootstrap: Promise<MathJaxInstance> | null = null;

/**
 * The bundled `mathjax` package is a process-wide singleton (`init` once).
 * Components are loaded through a `require` rooted at MathJax's own entry:
 * its default loader `import()`s bare Windows paths (invalid URLs), and the
 * font sub-dependency only resolves from inside MathJax's node_modules under
 * pnpm's isolated layout. Dynamic glyph ranges load on demand through the
 * retry protocol, so the atlas carries exactly the glyphs the corpus uses.
 */
async function bootstrapMathJax(): Promise<MathJaxInstance> {
	if (bootstrap === null) {
		bootstrap = (async () => {
			const module = (await import('mathjax')) as { default: MathJaxInstance };
			const MathJax = module.default;
			await MathJax.init({
				loader: {
					load: ['input/tex', 'output/svg', '[tex]/unicode', '[tex]/textmacros'],
					require: createRequire(MATHJAX_ENTRY),
					versionWarnings: false,
				},
				tex: { packages: [...MATH_PACKAGES] },
				svg: { fontCache: 'global', linebreaks: { inline: false } },
				output: { font: MATH_FONT },
			});
			return MathJax;
		})();
	}
	return bootstrap;
}

/**
 * A renderer is one TeX input jax + one SVG output jax with its own font
 * cache. The artifact uses the defaults (global cache, no line breaks,
 * unbounded width); tests build local-cache and line-breaking variants to
 * prove hydration and the one-root assertion against MathJax itself.
 */
export async function createMathRenderer(
	options: Partial<MathRendererOptions> = {},
): Promise<MathRenderer> {
	const MathJax = await bootstrapMathJax();
	const fontCache = options.fontCache ?? 'global';
	const linebreaks = options.linebreaks ?? { inline: false };
	const containerWidth = options.containerWidth ?? MATH_CONVERT.containerWidth;
	const core = MathJax._.mathjax.mathjax;
	const adaptor: MathJaxAdaptor = MathJax.startup.adaptor;
	const output: MathJaxOutputJax = new MathJax._.output.svg_ts.SVG({
		fontData: MathJax.startup.output.font,
		fontCache,
		linebreaks,
	});
	const input = new MathJax._.input.tex_ts.TeX({ packages: MATH_PACKAGES });
	const document: MathJaxDocument = core.document('', { InputJax: input, OutputJax: output });

	const renderRaw = async (tex: string, display: boolean): Promise<string> => {
		let node: unknown;
		await core.handleRetriesFor(() => {
			node = document.convert(tex, {
				display,
				em: MATH_CONVERT.em,
				ex: MATH_CONVERT.ex,
				containerWidth,
			});
		});
		return adaptor.innerHTML(node);
	};

	return {
		renderRaw,
		render: async (tex, display) => normalizeMathBody(await renderRaw(tex, display)),
		glyphPaths: () => parseGlyphPaths(adaptor.outerHTML(output.fontCache.getCache())),
	};
}

const STRIP_ATTRIBUTES_RE = /\s(?:data-[a-z-]+|role|focusable|aria-[a-z-]+|style)="[^"]*"/g;

const GLYPH_PATH_RE = /<path id="([^"]+)" d="([^"]*)"><\/path>/g;

const MERROR_RE = /data-mml-node="merror"[^>]*data-mjx-error="([^"]*)"/;

const UNDEFINED_MACRO_RE = /<g data-mml-node="mtext" fill="red" stroke="red" data-latex="([^"]*)"/;

/**
 * Turns raw MathJax output into an artifact body. Throws MathRenderError
 * when the output is not exactly one `<svg>` root (line-breaking emitted
 * `<mjx-break>` siblings), when MathJax reported a TeX error inline
 * (`merror`, since noundefined/TeX errors never throw), when an undefined
 * control sequence was rendered as red text, or when the ex metrics are
 * missing — MathJax emits width/height/vertical-align in ex, with a bare `0`
 * for a zero vertical-align.
 */
export function normalizeMathBody(raw: string): MathBody {
	const roots = raw.match(/<svg\b/g)?.length ?? 0;
	if (roots !== 1 || !raw.startsWith('<svg') || !raw.endsWith('</svg>')) {
		throw new MathRenderError(`expected exactly one <svg> root, got ${roots}`);
	}
	const merror = MERROR_RE.exec(raw);
	if (merror !== null) {
		throw new MathRenderError(`TeX error: ${decodeAttribute(merror[1] ?? '')}`);
	}
	const undefinedMacro = UNDEFINED_MACRO_RE.exec(raw);
	if (undefinedMacro !== null) {
		throw new MathRenderError(
			`undefined control sequence ${decodeAttribute(undefinedMacro[1] ?? '')}`,
		);
	}
	const rootTag = raw.slice(0, raw.indexOf('>') + 1);
	const wEx = exMetric(rootTag, /\swidth="(-?\d+(?:\.\d+)?)([a-z%]*)"/, 'width');
	const hEx = exMetric(rootTag, /\sheight="(-?\d+(?:\.\d+)?)([a-z%]*)"/, 'height');
	const dyEx = exMetric(
		rootTag,
		/\sstyle="vertical-align:\s*(-?\d+(?:\.\d+)?)([a-z%]*);?"/,
		'vertical-align',
	);
	const glyphs = mathBodyGlyphs(raw);
	const svg = stripPresentationAttributes(raw.replace(/<defs>[\s\S]*?<\/defs>/, ''));
	return { svg, wEx, hEx, dyEx, glyphs };
}

/**
 * Drops the attributes MathJax emits for browsers and assistive technology
 * (data-*, aria-*, role, focusable, style): react-native-svg ignores them,
 * the ex metrics have already been parsed out of `style`, and they are the
 * bulk of the semantic markup by bytes.
 */
export function stripPresentationAttributes(svg: string): string {
	return svg.replace(STRIP_ATTRIBUTES_RE, '');
}

function exMetric(rootTag: string, pattern: RegExp, name: string): number {
	const match = pattern.exec(rootTag);
	if (match === null) {
		throw new MathRenderError(`root <svg> has no ${name}`);
	}
	const value = Number(match[1]);
	if (match[2] !== 'ex' && value !== 0) {
		throw new MathRenderError(`root <svg> ${name} is not in ex: ${match[0].trim()}`);
	}
	return value;
}

function parseGlyphPaths(defs: string): Map<string, string> {
	const paths = new Map<string, string>();
	for (const match of defs.matchAll(GLYPH_PATH_RE)) {
		paths.set(match[1] ?? '', match[2] ?? '');
	}
	return paths;
}

function decodeAttribute(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}
