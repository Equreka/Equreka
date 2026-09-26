import type { RichTextSegment } from '@equreka/content/rich-text';
import { memo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getMathAtlas, getMathBodies } from '../content/artifact';
import { useTheme } from '../providers/equreka-provider';
import type { TextSize } from '../theme/theme';
import { AppText } from '../ui/text';
import { type HydratedMath, hydrateForSvg } from './hydrate';
import { texToFallbackText, texToUnicode } from './plain-symbol';

export interface HydratedMathViewProps {
	hydrated: HydratedMath;
	color: string;
	center?: boolean;
	scroll?: boolean;
	accessibilityLabel?: string | undefined;
	testID?: string | undefined;
}

/**
 * A self-contained SVG document as a standalone block: never nested in
 * `<Text>`, sized from its resolved metrics, `currentColor` driven by
 * `color`. `scroll` lets an expression wider than the phone pan
 * horizontally instead of clipping.
 */
export function HydratedMathView({
	hydrated,
	color,
	center = false,
	scroll = false,
	accessibilityLabel,
	testID,
}: HydratedMathViewProps) {
	const svg = (
		<SvgXml xml={hydrated.xml} width={hydrated.width} height={hydrated.height} color={color} />
	);
	if (!scroll) {
		return (
			<View
				style={center ? styles.center : styles.start}
				accessibilityLabel={accessibilityLabel}
				testID={testID}
			>
				{svg}
			</View>
		);
	}
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={[styles.scrollContent, center ? styles.center : styles.start]}
			accessibilityLabel={accessibilityLabel}
			testID={testID}
		>
			{svg}
		</ScrollView>
	);
}

export interface MathSvgProps {
	tex: string;
	size?: TextSize;
	color?: string | undefined;
	center?: boolean;
	scroll?: boolean;
}

/**
 * One rendered body from the MathJax atlas (ADR 0005). A TeX string absent
 * from the artifact or failing hydration degrades to the lossy Unicode
 * text form.
 */
export const MathSvg = memo(function MathSvg({
	tex,
	size = 'base',
	color,
	center = false,
	scroll = false,
}: MathSvgProps) {
	const theme = useTheme();
	const fontSize = theme.text[size].fontSize;
	const ink = color ?? theme.color.ink;
	const body = getMathBodies()[tex];
	const hydrated = body === undefined ? null : hydrateForSvg(body, getMathAtlas(), fontSize);
	if (hydrated === null) {
		return (
			<AppText size={size} style={{ color: ink }} italic>
				{texToFallbackText(tex)}
			</AppText>
		);
	}
	return <HydratedMathView hydrated={hydrated} color={ink} center={center} scroll={scroll} />;
});

export interface RichTextProps {
	segments: readonly RichTextSegment[];
	size?: TextSize;
}

type Part =
	| { key: string; kind: 'paragraph'; nodes: ReactNode[] }
	| { key: string; kind: 'block'; tex: string };

const SINGLE_LETTER_RE = /^[A-Za-zΑ-Ωα-ω]$/u;

/**
 * Tiering (ADR 0002/0005): text and plain-symbol math flow inline in one
 * `Text`; any display segment or 2-D construct closes the paragraph and
 * renders as an SVG block beneath it, then a new paragraph resumes.
 */
function partition(segments: readonly RichTextSegment[], size: TextSize): Part[] {
	const parts: Part[] = [];
	let nodes: ReactNode[] = [];
	let at = 0;
	const flush = (): void => {
		if (nodes.length > 0) {
			parts.push({ key: `p${at}`, kind: 'paragraph', nodes });
			nodes = [];
		}
	};
	for (const segment of segments) {
		const key = `s${at}`;
		if (segment.t === 'text') {
			nodes.push(segment.v);
			at += segment.v.length;
			continue;
		}
		const unicode = segment.display ? null : texToUnicode(segment.tex);
		if (unicode === null) {
			flush();
			parts.push({ key: `b${at}`, kind: 'block', tex: segment.tex });
		} else {
			nodes.push(
				<AppText key={key} size={size} italic={SINGLE_LETTER_RE.test(unicode)}>
					{unicode}
				</AppText>,
			);
		}
		at += segment.tex.length + 2;
	}
	flush();
	return parts;
}

export const RichText = memo(function RichText({ segments, size = 'base' }: RichTextProps) {
	const theme = useTheme();
	const parts = partition(segments, size);
	return (
		<View style={{ gap: theme.space(2) }}>
			{parts.map((part) =>
				part.kind === 'paragraph' ? (
					<AppText key={part.key} size={size}>
						{part.nodes}
					</AppText>
				) : (
					<MathSvg key={part.key} tex={part.tex} size={size} scroll />
				),
			)}
		</View>
	);
});

const styles = StyleSheet.create({
	start: { alignItems: 'flex-start' },
	center: { alignItems: 'center' },
	scrollContent: { flexGrow: 1, paddingVertical: 2 },
});
