/**
 * Structural typing of the `mathjax` (bundled components) package, which
 * ships no declarations. Only the surface the pipeline touches is declared;
 * everything else stays `unknown` so nothing here can drift silently.
 */
declare module 'mathjax' {
	export interface MathJaxAdaptor {
		innerHTML(node: unknown): string;
		outerHTML(node: unknown): string;
	}

	export interface MathJaxConvertOptions {
		display: boolean;
		em: number;
		ex: number;
		containerWidth: number;
	}

	export interface MathJaxDocument {
		convert(tex: string, options: MathJaxConvertOptions): unknown;
	}

	export interface MathJaxFontCache {
		getCache(): unknown;
	}

	export interface MathJaxOutputJax {
		font: unknown;
		fontCache: MathJaxFontCache;
	}

	export interface MathJaxSvgOptions {
		fontData: unknown;
		fontCache: 'global' | 'local' | 'none';
		linebreaks: { inline: boolean };
	}

	export interface MathJaxInternals {
		mathjax: {
			mathjax: {
				document(html: string, options: { InputJax: unknown; OutputJax: unknown }): MathJaxDocument;
				handleRetriesFor<T>(code: () => T): Promise<T>;
			};
		};
		input: { tex_ts: { TeX: new (options: { packages: readonly string[] }) => unknown } };
		output: { svg_ts: { SVG: new (options: MathJaxSvgOptions) => MathJaxOutputJax } };
	}

	export interface MathJaxInstance {
		version: string;
		startup: { adaptor: MathJaxAdaptor; output: MathJaxOutputJax };
		_: MathJaxInternals;
		init(config: Record<string, unknown>): Promise<unknown>;
	}

	const MathJax: MathJaxInstance;
	export default MathJax;
}
