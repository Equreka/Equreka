import './mathjax-host';
import { MathJaxNewcmFont } from '@mathjax/mathjax-newcm-font/js/svg.js';
import type { LiteElement } from '@mathjax/src/js/adaptors/lite/Element.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import '@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js';
import '@mathjax/src/js/input/tex/unicode/UnicodeConfiguration.js';
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { SVG } from '@mathjax/src/js/output/svg.js';

/**
 * The content pipeline's package set and em/ex basis (ADR 0005: build =
 * runtime), so a string that rendered into the atlas renders identically
 * on device.
 */
export const RUNTIME_MATH_PACKAGES = [
	'base',
	'ams',
	'newcommand',
	'noundefined',
	'unicode',
	'textmacros',
] as const;

const CONVERT = { em: 16, ex: 8, containerWidth: 1_000_000 } as const;

export interface RuntimeMathCore {
	renderRaw(tex: string, display: boolean): Promise<string>;
}

/**
 * One liteAdaptor document with a TeX input jax and an SVG output jax over
 * the static newcm tables. `fontCache: 'local'` keeps every glyph `<defs>`
 * inside its own root, the only scope react-native-svg resolves `<use>`
 * against; `mathjax.asyncLoad` stays unset, so no dynamic glyph range is
 * ever fetched (a glyph outside the static tables draws MathJax's
 * missing-character fallback). Line-breaking is off so a wide expression is
 * still exactly one `<svg>` root.
 */
export function createRuntimeMathCore(): RuntimeMathCore {
	const adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const document = mathjax.document('', {
		InputJax: new TeX({ packages: [...RUNTIME_MATH_PACKAGES] }),
		OutputJax: new SVG({
			fontData: MathJaxNewcmFont,
			fontCache: 'local',
			linebreaks: { inline: false },
		}),
	});
	return {
		async renderRaw(tex, display) {
			let node: unknown;
			await mathjax.handleRetriesFor(() => {
				node = document.convert(tex, { display, ...CONVERT });
			});
			return adaptor.innerHTML(node as LiteElement);
		},
	};
}
