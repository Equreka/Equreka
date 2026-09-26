import { hydrateMathBody, type MathAtlas, type MathBody } from '@equreka/content/rich-text';

/**
 * A body ready for react-native-svg's SvgXml: glyph definitions prepended
 * inside the root `<svg>`, dimensions and baseline shift resolved from ex
 * units to pixels for the caller's font size.
 */
export interface HydratedMath {
	xml: string;
	width: number;
	height: number;
	baselineShift: number;
}

/**
 * MathJax sizes its SVG in ex units of the surrounding font; for the
 * platform sans stacks 1ex ≈ 0.5em, so ex metrics scale by this ratio of
 * the paragraph font size.
 */
export const EX_PER_FONT_PX = 0.5;

/**
 * Null when the reference hydrator rejects the pair (a glyph missing from
 * the atlas, a body without an `<svg>` root) — the artifact guarantees
 * closure, so a miss means a corrupt bundle and the caller falls back to
 * text instead of drawing a partial formula.
 */
export function hydrateForSvg(
	body: MathBody,
	atlas: MathAtlas,
	fontSize: number,
): HydratedMath | null {
	let xml: string;
	try {
		xml = hydrateMathBody(body, atlas);
	} catch {
		return null;
	}
	const ex = fontSize * EX_PER_FONT_PX;
	return {
		xml,
		width: body.wEx * ex,
		height: body.hEx * ex,
		baselineShift: body.dyEx * ex,
	};
}
