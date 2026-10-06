import { type CategorySlug, type ThemedColor, tokens } from '@equreka/tokens';
import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export interface TextMetric {
	fontSize: number;
	lineHeight: number;
}

export interface ThemeColors {
	bg: string;
	surface: string;
	ink: string;
	inkMuted: string;
	border: string;
	accent: string;
	accentInk: string;
	danger: string;
	category: Record<CategorySlug, string>;
}

/**
 * `@equreka/tokens` resolved for one mode with rem values converted to
 * density-independent pixels (16 px per rem, RN's implicit root size).
 * The sans stack is the platform default, so only the mono family is
 * carried.
 */
export interface Theme {
	mode: ThemeMode;
	color: ThemeColors;
	fontMono: string;
	text: Record<TextSize, TextMetric>;
	radius: Record<'sm' | 'md' | 'lg' | 'xl', number>;
	space: (steps: number) => number;
}

const REM_PX = 16;

const TEXT_SIZES: readonly TextSize[] = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];

function remToPx(rem: string): number {
	return Math.round(Number.parseFloat(rem) * REM_PX);
}

function pick(color: ThemedColor, mode: ThemeMode): string {
	return color[mode];
}

export function resolveTheme(mode: ThemeMode): Theme {
	const categories = Object.entries(tokens.color.category) as [CategorySlug, ThemedColor][];
	const text = {} as Record<TextSize, TextMetric>;
	for (const size of TEXT_SIZES) {
		const metric = tokens.text[size] ?? tokens.text.base ?? { size: '1rem', lineHeight: '1.5rem' };
		text[size] = { fontSize: remToPx(metric.size), lineHeight: remToPx(metric.lineHeight) };
	}
	const spacingBase = remToPx(tokens.spacingBase);
	return {
		mode,
		color: {
			bg: pick(tokens.color.bg, mode),
			surface: pick(tokens.color.surface, mode),
			ink: pick(tokens.color.ink, mode),
			inkMuted: pick(tokens.color.inkMuted, mode),
			border: pick(tokens.color.border, mode),
			accent: pick(tokens.color.accent, mode),
			accentInk: pick(tokens.color.accentInk, mode),
			danger: pick(tokens.color.danger, mode),
			category: Object.fromEntries(
				categories.map(([slug, color]) => [slug, pick(color, mode)]),
			) as Record<CategorySlug, string>,
		},
		fontMono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
		text,
		radius: {
			sm: remToPx(tokens.radius.sm ?? '0.25rem'),
			md: remToPx(tokens.radius.md ?? '0.5rem'),
			lg: remToPx(tokens.radius.lg ?? '0.75rem'),
			xl: remToPx(tokens.radius.xl ?? '1rem'),
		},
		space: (steps) => steps * spacingBase,
	};
}

export function categoryColor(theme: Theme, slug: string): string {
	return theme.color.category[slug as CategorySlug] ?? theme.color.category.universal;
}
