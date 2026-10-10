import { shardName, shardOf } from './shard-hash.js';

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
 * (the math body key) and `raw` is the fragment as authored, annotation
 * macros intact, for renderers that expand \mag{}/\const{}/\var{} into
 * term-highlighting markup. `canonicalTex(raw) === tex` always holds.
 */
export type RichTextSegment =
	| { t: 'text'; v: string }
	| { t: 'math'; tex: string; raw: string; display: boolean };

/**
 * One body as the renderer produces it, and the form the render cache
 * stores. `svg` is the MathJax SVG root with `<defs>` removed and the data-,
 * aria-, role, focusable and style attributes stripped; `glyphs` are the
 * atlas ids it references, in first-use order; `wEx`/`hEx`/`dyEx` are the
 * root's width, height and baseline shift in ex units (dyEx is CSS
 * vertical-align: negative moves the box below the baseline). Shipped
 * unchanged as the raw form of `MathBodyV2` when a body falls outside the
 * lean grammar.
 */
export interface MathBody {
	svg: string;
	wEx: number;
	hEx: number;
	dyEx: number;
	glyphs: string[];
}

/**
 * The lean form of `MathBodyV2` (ADR 0005). Every body MathJax emits opens
 * with the same root `<svg>` and `<g>` tags, differing only in width, height
 * and viewBox, where width and height are `wEx`/`hEx` printed in ex, and
 * closes with `</g></svg>`. `inner` is the markup in between, with every
 * glyph reference written `[<id>]` or `[<id> <transform>]`, `<id>` being the
 * atlas id without its `MJX-NCM-` prefix. The glyph list is not stored:
 * hydration derives it from the references.
 */
export interface LeanMathBody {
	viewBox: string;
	wEx: number;
	hEx: number;
	dyEx: number;
	inner: string;
}

/**
 * A shipped math body: lean whenever the build proved that hydrating the
 * lean form reproduces the rendered body's hydrated XML byte for byte, the
 * rendered `MathBody` itself otherwise.
 */
export type MathBodyV2 = LeanMathBody | MathBody;

/**
 * One `presentation/math/bodies/<shard>.json` file: the bodies whose
 * canonical TeX hashes to that shard (`mathShardOf`).
 */
export type MathBodyShard = Record<string, MathBodyV2>;

export interface MathAtlas {
	schemaVersion: 2;
	font: 'mathjax-newcm';
	glyphs: Record<string, string>;
}

export type MathBodies = Record<string, MathBody>;

/**
 * A power of two, so the shard is the low bits of the hash, and at most 256,
 * so `mathShardName` stays two hex digits. Raise it by doubling when a shard
 * nears its `ARTIFACT_BUDGETS` cap: the build then emits the new shard files,
 * and the mobile shard table, typed as a tuple of exactly this many loaders,
 * fails to compile until it requires every one of them (ADR 0010).
 */
export const MATH_SHARD_COUNT = 16;

/**
 * The shard a canonical TeX string's body ships in. Callers hold only the
 * TeX, often math another collection owns (a path step quoting a unit), so
 * the shard is a pure function of it and no manifest is needed (ADR 0010).
 */
export function mathShardOf(tex: string): number {
	return shardOf(tex, MATH_SHARD_COUNT);
}

/**
 * The `<shard>` of `presentation/math/bodies/<shard>.json`: two lowercase hex
 * digits.
 */
export function mathShardName(shard: number): string {
	return shardName(shard);
}

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
 * The exact TeX string that is rendered and used as a math body key:
 * annotation macros reduced to their arguments, dash-like Unicode (en dash,
 * em dash, minus sign) folded to '-'. Idempotent; every TeX-bearing string
 * of a presentation slice (`symbolTex`, `expressionTex`) and every math
 * segment of `splitRichText` is already canonical, so consumers look bodies
 * up with the value as-is.
 */
export function canonicalTex(tex: string): string {
	return stripMacros(tex).replace(DASH_RE, '-');
}

/**
 * Canonical splitter for localized prose: `$...$` becomes an inline math
 * segment, `$$...$$` a display one, everything else literal text (kept
 * byte-for-byte — apostrophes, backslashes, unmatched `$`). Math segments
 * carry canonical TeX, so `segment.tex` is a body key as-is, plus the
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

const LEAN_GROUP_OPEN =
	'<g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)">';

const LEAN_CLOSE = '</g></svg>';

const VIEW_BOX_RE = /\sviewBox="([^"]*)"/;

const GLYPH_USE_RE = /<use xlink:href="#MJX-NCM-([A-Za-z0-9-]+)"(?: transform="([^"]*)")?><\/use>/g;

const COMPACT_GLYPH_USE_RE = /\[([A-Za-z0-9-]+)(?: ([^\]]*))?\]/g;

const GLYPH_HREF_RE = /href="#(MJX-[^"]+)"/g;

function leanRootOpen(viewBox: string, wEx: number, hEx: number): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${wEx}ex" height="${hEx}ex" viewBox="${viewBox}" xmlns:xlink="http://www.w3.org/1999/xlink">${LEAN_GROUP_OPEN}`;
}

export function isLeanMathBody(body: MathBodyV2): body is LeanMathBody {
	return 'inner' in body;
}

/**
 * The lean form of a rendered body, or undefined when its markup falls
 * outside the lean grammar: a different root or top-level group, or a `[`
 * or `]` anywhere, which would make the compact references ambiguous. Only
 * a structural rewrite: the pipeline ships the result only after proving it
 * hydrates to the same XML as `body`.
 */
export function leanMathBody(body: MathBody): LeanMathBody | undefined {
	const viewBox = VIEW_BOX_RE.exec(body.svg.slice(0, body.svg.indexOf('>') + 1))?.[1];
	if (viewBox === undefined || /[[\]]/.test(body.svg)) {
		return undefined;
	}
	const open = leanRootOpen(viewBox, body.wEx, body.hEx);
	if (!body.svg.startsWith(open) || !body.svg.endsWith(LEAN_CLOSE)) {
		return undefined;
	}
	const inner = body.svg
		.slice(open.length, body.svg.length - LEAN_CLOSE.length)
		.replace(GLYPH_USE_RE, (_whole, id: string, transform: string | undefined) =>
			transform === undefined ? `[${id}]` : `[${id} ${transform}]`,
		);
	return { viewBox, wEx: body.wEx, hEx: body.hEx, dyEx: body.dyEx, inner };
}

/**
 * The body's SVG root without glyph definitions: the stored markup of a raw
 * body, the reassembled one of a lean body.
 */
export function mathBodySvg(body: MathBodyV2): string {
	if (!isLeanMathBody(body)) {
		return body.svg;
	}
	const inner = body.inner.replace(
		COMPACT_GLYPH_USE_RE,
		(_whole, id: string, transform: string | undefined) =>
			transform === undefined
				? `<use xlink:href="#MJX-NCM-${id}"></use>`
				: `<use xlink:href="#MJX-NCM-${id}" transform="${transform}"></use>`,
	);
	return `${leanRootOpen(body.viewBox, body.wEx, body.hEx)}${inner}${LEAN_CLOSE}`;
}

/**
 * The atlas ids an SVG references, in first-use order: the renderer's
 * `glyphs` list, and the one hydration derives for a lean body.
 */
export function mathBodyGlyphs(svg: string): string[] {
	return [...new Set(Array.from(svg.matchAll(GLYPH_HREF_RE), (match) => match[1] ?? ''))];
}

/**
 * Rebuilds a self-contained SVG document from one body and the atlas by
 * prepending a `<defs>` block with the body's glyph paths — `<use href>`
 * only resolves inside its own SVG root (react-native-svg included), so
 * hydration is per body. Throws on a glyph missing from the atlas: the
 * artifact guarantees closure, so a miss is a corrupt or mismatched pair.
 */
export function hydrateMathBody(body: MathBodyV2, atlas: MathAtlas): string {
	const svg = mathBodySvg(body);
	const glyphs = isLeanMathBody(body) ? mathBodyGlyphs(svg) : body.glyphs;
	if (glyphs.length === 0) {
		return svg;
	}
	const defs = glyphs
		.map((id) => {
			const d = atlas.glyphs[id];
			if (d === undefined) {
				throw new Error(`math atlas has no glyph '${id}'`);
			}
			return `<path id="${id}" d="${d}"></path>`;
		})
		.join('');
	const rootEnd = svg.indexOf('>');
	if (!svg.startsWith('<svg') || rootEnd === -1) {
		throw new Error('math body is not an <svg> root');
	}
	return `${svg.slice(0, rootEnd + 1)}<defs>${defs}</defs>${svg.slice(rootEnd + 1)}`;
}
