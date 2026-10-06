import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../providers/equreka-provider';

export interface ScreenProps {
	children: ReactNode;
	scroll?: boolean;
	style?: ViewStyle;
}

/**
 * Screen root: themed background, token padding and vertical rhythm. With
 * `scroll` off the children own the layout (FlashList screens), so no
 * padding is applied — the list's content container carries it.
 */
export function Screen({ children, scroll = true, style }: ScreenProps) {
	const theme = useTheme();
	if (!scroll) {
		return (
			<View style={[styles.fill, { backgroundColor: theme.color.bg }, style]}>{children}</View>
		);
	}
	return (
		<ScrollView
			style={[styles.fill, { backgroundColor: theme.color.bg }]}
			contentContainerStyle={[{ padding: theme.space(4), gap: theme.space(4) }, style]}
			contentInsetAdjustmentBehavior="automatic"
			keyboardShouldPersistTaps="handled"
		>
			{children}
		</ScrollView>
	);
}

export function VStack({
	children,
	gap = 2,
	style,
}: {
	children: ReactNode;
	gap?: number;
	style?: ViewStyle;
}) {
	const theme = useTheme();
	return <View style={[{ gap: theme.space(gap) }, style]}>{children}</View>;
}

export function HStack({
	children,
	gap = 2,
	style,
}: {
	children: ReactNode;
	gap?: number;
	style?: ViewStyle;
}) {
	const theme = useTheme();
	return <View style={[styles.inline, { gap: theme.space(gap) }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
