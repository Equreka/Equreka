/**
 * The single definition of an annotation macro (`\mag{}`/`\const{}`/`\var{}`):
 * group 1 is the macro name, group 2 the term key. The key may hold one
 * level of nested braces (`v_{0}`, `[\mathrm{H}^{+}]`); a deeper key is
 * rejected by the pipeline instead of being silently unmatched. A factory,
 * because a shared global RegExp carries `lastIndex` state between callers.
 */
export function termMacroPattern(): RegExp {
	return /\\(mag|const|var)\{((?:[^{}]|\{[^{}]*\})*)\}/g;
}

/**
 * A font or text wrapper with one level of nested braces; group 1 is its
 * content.
 */
const FONT_WRAPPER_RE =
	/\\(?:mathrm|textrm|text|mathit|mathbf|boldsymbol|operatorname|mathsf|mathtt)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;

/**
 * Plain identifier of an equation term, shared by the solution grammar,
 * the codegen'd solutions module, the engine slice and the web's term
 * highlighting: the authored override, else the key with font and text
 * wrappers unwrapped to their content and then every character outside
 * `[A-Za-z0-9_]` dropped (`\pi` → `pi`, `v_{0}` → `v_0`, `\mathrm{KE}` →
 * `KE`, `[\mathrm{H}^{+}]` → `H`). Unwrapping repeats until stable, so a
 * wrapper nested in another one leaves no command name behind. Validity
 * (identifier syntax, uniqueness, reserved names) is the pipeline's job.
 */
export function termIdentifier(key: string, override?: string): string {
	if (override !== undefined) {
		return override;
	}
	let unwrapped = key;
	for (;;) {
		const next = unwrapped.replace(FONT_WRAPPER_RE, '$1');
		if (next === unwrapped) {
			return unwrapped.replace(/[^A-Za-z0-9_]/g, '');
		}
		unwrapped = next;
	}
}

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
	return tex.replace(termMacroPattern(), (_whole, _kind: string, arg: string) => `{${arg}}`);
}

/**
 * Replaces every annotation macro by its bare argument, braces dropped —
 * for plain-text consumers (offline reader, search) where a stray `{E}`
 * would leak into visible text.
 */
export function stripMacrosToText(text: string): string {
	return text.replace(termMacroPattern(), (_whole, _kind: string, arg: string) => arg);
}

/**
 * The exact TeX string that is rendered and used as a `bodies.json` key:
 * annotation macros reduced to their arguments, dash-like Unicode (en dash,
 * em dash, minus sign) folded to '-'. Idempotent; every TeX-bearing string
 * of a presentation slice (`symbolTex`, `expressionTex`) and every math
 * segment of `splitRichText` is already canonical, so consumers index
 * bodies with the value as-is.
 */
export function canonicalTex(tex: string): string {
	return stripMacros(tex).replace(DASH_RE, '-');
}

/**
 * Canonical splitter for localized prose: `$...$` becomes an inline math
 * segment, `$$...$$` a display one, everything else literal text (kept
 * byte-for-byte — apostrophes, backslashes, unmatched `$`). Math segments
 * carry canonical TeX, so `bodies[segment.tex]` resolves directly, plus the
 * authored fragment in `raw`. Presentation slices ship prose raw, so every
 * reader splits at render time (ADR 0010).
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
