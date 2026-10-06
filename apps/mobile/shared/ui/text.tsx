import type { ReactNode } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../providers/equreka-provider';
import type { TextSize } from '../theme/theme';

export type TextTone = 'ink' | 'muted' | 'accent' | 'danger' | 'accentInk';

export interface AppTextProps extends TextProps {
	size?: TextSize;
	tone?: TextTone;
	weight?: TextStyle['fontWeight'];
	mono?: boolean;
	italic?: boolean;
	children?: ReactNode;
}

/**
 * The one Text wrapper every screen uses: token-driven size, line height,
 * color and the mono family, so no screen hardcodes a color or a pixel.
 */
export function AppText({
	size = 'base',
	tone = 'ink',
	weight,
	mono = false,
	italic = false,
	style,
	children,
	...rest
}: AppTextProps) {
	const theme = useTheme();
	const metric = theme.text[size];
	const color = {
		ink: theme.color.ink,
		muted: theme.color.inkMuted,
		accent: theme.color.accent,
		danger: theme.color.danger,
		accentInk: theme.color.accentInk,
	}[tone];
	return (
		<Text
			{...rest}
			style={[
				{ fontSize: metric.fontSize, lineHeight: metric.lineHeight, color },
				weight === undefined ? null : { fontWeight: weight },
				mono ? { fontFamily: theme.fontMono } : null,
				italic ? { fontStyle: 'italic' } : null,
				style,
			]}
		>
			{children}
		</Text>
	);
}

export function Title({ children }: { children: ReactNode }) {
	return (
		<AppText size="2xl" weight="700" accessibilityRole="header">
			{children}
		</AppText>
	);
}

export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<AppText size="lg" weight="600" accessibilityRole="header">
			{children}
		</AppText>
	);
}

export function Lead({ children }: { children: ReactNode }) {
	return <AppText tone="muted">{children}</AppText>;
}

export function Muted({ children }: { children: ReactNode }) {
	return (
		<AppText size="sm" tone="muted">
			{children}
		</AppText>
	);
}
