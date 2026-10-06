import { texToFallbackText } from '@equreka/content/plain-symbol';
import { type RichTextSegment, splitRichText } from '@equreka/content/rich-text';
import { type Locale, type LocalizedText, pickLocalized } from '@equreka/core/i18n';

/**
 * Prose split for one locale, flagged when it fell back to the English
 * source so the screen can attach the untranslated notice.
 */
export interface LocalizedRichText {
	segments: RichTextSegment[];
	untranslated: boolean;
}

/**
 * Split prose per source object and locale. Presentation slices are
 * immutable module data, so each field is split once and keeps its
 * identity across renders, which the memoized RichText relies on; the
 * bundled corpus bounds the cache.
 */
const richTextCache = new WeakMap<LocalizedText, ReadonlyMap<Locale, LocalizedRichText>>();

/**
 * Localized prose resolved for one locale and split with the canonical
 * `splitRichText`: the artifact ships prose raw (ADR 0010).
 */
export function pickRichText(
	text: LocalizedText | undefined,
	locale: Locale,
): LocalizedRichText | undefined {
	if (text === undefined) return undefined;
	const byLocale = richTextCache.get(text);
	const cached = byLocale?.get(locale);
	if (cached !== undefined) return cached;
	const picked = pickLocalized(text, locale);
	const rich: LocalizedRichText = {
		segments: splitRichText(picked.value),
		untranslated: picked.untranslated,
	};
	richTextCache.set(text, new Map(byLocale).set(locale, rich));
	return rich;
}

/**
 * Single-line text of a segment list: literal text as-is, math reduced to
 * its lossy Unicode form, for one-line previews such as card subtitles.
 */
export function plainTextOf(segments: readonly RichTextSegment[]): string {
	return segments
		.map((segment) => (segment.t === 'text' ? segment.v : texToFallbackText(segment.tex)))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}
