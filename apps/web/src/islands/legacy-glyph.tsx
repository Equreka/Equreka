/**
 * Code points of the bootstrap-icons font glyphs islands draw, restated so
 * an island never bundles the package's full code point map; a unit test
 * pins every entry to `bootstrap-icons/font/bootstrap-icons.json`.
 */
export const LEGACY_GLYPHS = {
	'arrow-clockwise': 0xf116,
	'box-arrow-in-down': 0xf1bc,
	'box-arrow-up': 0xf1c6,
	check2: 0xf272,
	'chevron-right': 0xf285,
	clipboard: 0xf290,
	'gear-wide': 0xf3e4,
	heart: 0xf417,
	'heart-fill': 0xf415,
	moon: 0xf497,
	pencil: 0xf4cb,
	plus: 0xf4fe,
	sun: 0xf5a2,
	translate: 0xf658,
	x: 0xf62a,
} as const;

export type LegacyGlyphName = keyof typeof LEGACY_GLYPHS;

export interface LegacyGlyphProps {
	name: LegacyGlyphName;
	className?: string;
}

/**
 * React twin of icon-glyph.astro: the glyph rasterizes as text, as the
 * original's `bi` icons did. Always decorative; the owning control carries
 * the label.
 */
export function LegacyGlyph({ name, className }: LegacyGlyphProps) {
	return (
		<i
			className={className === undefined ? 'eq-glyph' : `eq-glyph ${className}`}
			data-glyph={String.fromCodePoint(LEGACY_GLYPHS[name])}
			aria-hidden="true"
		/>
	);
}
