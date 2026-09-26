/**
 * Platform-free rich-text and math-artifact contract shared by every
 * consumer of the presentation slices (web, mobile, the pipeline itself).
 * No Node imports: mobile bundles this file as-is.
 */

const MACRO_RE = /\\(mag|const|var)\{([^{}]*)\}/g;

const DASH_RE = /[–—−]/g;

const FRAGMENT_RE = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

/**
 * Math segments carry both forms of one `$…$` fragment: `tex` is canonical
 * (the `bodies.json` key) and `raw` is the fragment as authored, annotation
 * macros intact, for renderers that expand \mag{}/\const{}/\var{} into
 * term-highlighting markup. `canonicalTex(raw) === tex` always holds.
 */
export type RichTextSegment =
	| { t: 'text'; v: string }
	| { t: 'math'; tex: string; raw: string; display: boolean };

/**
 * One rendered math body of `presentation/math/bodies.json`, keyed by its
 * canonical TeX. `svg` is the MathJax SVG root with `<defs>` removed and the
 * data-, aria-, role, focusable and style attributes stripped; `glyphs` are the
 * atlas ids it references, in first-use order; `wEx`/`hEx`/`dyEx` are the
 * root's width, height and baseline shift in ex units (dyEx is CSS
 * vertical-align: negative moves the box below the baseline).
 */
export interface MathBody {
	svg: string;
	wEx: number;
	hEx: number;
	dyEx: number;
	glyphs: string[];
}

export interface MathAtlas {
	schemaVersion: 1;
	font: 'mathjax-newcm';
	glyphs: Record<string, string>;
}

export type MathBodies = Record<string, MathBody>;

/**
 * Replaces every annotation macro (\mag{}/\const{}/\var{}) by its
 * brace-grouped argument. Braces are kept so multi-letter arguments stay one
 * token under downstream parsers instead of fusing with neighbours.
 */
export function stripMacros(tex: string): string {
	return tex.replace(MACRO_RE, (_whole, _kind: string, arg: string) => `{${arg}}`);
}

/**
 * Replaces every annotation macro by its bare argument, braces dropped —
 * for plain-text consumers (offline reader, search) where a stray `{E}`
 * would leak into visible text.
 */
export function stripMacrosToText(text: string): string {
	return text.replace(MACRO_RE, (_whole, _kind: string, arg: string) => arg);
}

/**
 * The exact TeX string that is rendered and used as a `bodies.json` key:
 * annotation macros reduced to their arguments, dash-like Unicode (en dash,
 * em dash, minus sign) folded to '-'. Idempotent; every TeX-bearing string
 * in a presentation slice (`symbolTex`, `expressionTex`, math segments) is
 * already canonical, so consumers index bodies with the slice value as-is.
 */
export function canonicalTex(tex: string): string {
	return stripMacros(tex).replace(DASH_RE, '-');
}

/**
 * Canonical splitter for localized prose: `$...$` becomes an inline math
 * segment, `$$...$$` a display one, everything else literal text (kept
 * byte-for-byte — apostrophes, backslashes, unmatched `$`). Math segments
 * carry canonical TeX, so `bodies[segment.tex]` resolves directly, plus the
 * authored fragment in `raw`.
 */
export function splitRichText(text: string): RichTextSegment[] {
	const segments: RichTextSegment[] = [];
	let cursor = 0;
	for (const match of text.matchAll(FRAGMENT_RE)) {
		if (match.index > cursor) {
			segments.push({ t: 'text', v: text.slice(cursor, match.index) });
		}
		const display = match[1] !== undefined;
		const raw = match[1] ?? match[2] ?? '';
		segments.push({ t: 'math', tex: canonicalTex(raw), raw, display });
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) {
		segments.push({ t: 'text', v: text.slice(cursor) });
	}
	return segments;
}

export type LocalizedSegments = Record<string, RichTextSegment[]>;

/**
 * Splits every present locale of a localized prose field; absent locales
 * stay absent so readers fall back exactly as they do for the raw text.
 */
export function splitLocalizedText(text: Record<string, string | undefined>): LocalizedSegments {
	const segments: LocalizedSegments = {};
	for (const [locale, localized] of Object.entries(text)) {
		if (localized !== undefined) {
			segments[locale] = splitRichText(localized);
		}
	}
	return segments;
}

/**
 * Rebuilds a self-contained SVG document from one body and the atlas by
 * prepending a `<defs>` block with the body's glyph paths — `<use href>`
 * only resolves inside its own SVG root (react-native-svg included), so
 * hydration is per body. Throws on a glyph missing from the atlas: the
 * artifact guarantees closure, so a miss is a corrupt or mismatched pair.
 */
export function hydrateMathBody(body: MathBody, atlas: MathAtlas): string {
	if (body.glyphs.length === 0) {
		return body.svg;
	}
	const defs = body.glyphs
		.map((id) => {
			const d = atlas.glyphs[id];
			if (d === undefined) {
				throw new Error(`math atlas has no glyph '${id}'`);
			}
			return `<path id="${id}" d="${d}"></path>`;
		})
		.join('');
	const rootEnd = body.svg.indexOf('>');
	if (!body.svg.startsWith('<svg') || rootEnd === -1) {
		throw new Error('math body is not an <svg> root');
	}
	return `${body.svg.slice(0, rootEnd + 1)}<defs>${defs}</defs>${body.svg.slice(rootEnd + 1)}`;
}
