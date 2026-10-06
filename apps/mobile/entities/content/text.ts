import { texToFallbackText } from '@equreka/content/plain-symbol';
import type { LocalizedSegments, RichTextSegment } from '@equreka/content/rich-text';
import type { Locale } from '@equreka/core/i18n';

/**
 * Pre-split prose resolved for one locale, flagged when it fell back to the
 * English source so the screen can attach the untranslated notice.
 */
export interface LocalizedRichText {
	segments: RichTextSegment[];
	untranslated: boolean;
}

export function pickSegments(
	segments: LocalizedSegments | undefined,
	locale: Locale,
): LocalizedRichText | undefined {
	if (segments === undefined) return undefined;
	const localized = segments[locale];
	if (localized !== undefined) return { segments: localized, untranslated: false };
	const source = segments.en;
	return source === undefined ? undefined : { segments: source, untranslated: locale !== 'en' };
}

/**
 * Single-line searchable text of a segment list: literal text as-is, math
 * reduced to its lossy Unicode form so a query for "mc²" or "1/2" can still
 * hit a description.
 */
export function plainTextOf(segments: readonly RichTextSegment[]): string {
	return segments
		.map((segment) => (segment.t === 'text' ? segment.v : texToFallbackText(segment.tex)))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}
