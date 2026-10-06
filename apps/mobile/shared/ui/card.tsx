import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../providers/equreka-provider';
import { AppText } from './text';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
	const theme = useTheme();
	return (
		<View
			style={[
				{
					backgroundColor: theme.color.surface,
					borderColor: theme.color.border,
					borderWidth: StyleSheet.hairlineWidth,
					borderRadius: theme.radius.lg,
					padding: theme.space(4),
					gap: theme.space(2),
				},
				style,
			]}
		>
			{children}
		</View>
	);
}

export interface RowProps {
	title: string;
	subtitle?: string | undefined;
	detail?: string | undefined;
	onPress?: (() => void) | undefined;
	trailing?: ReactNode;
	accessibilityLabel?: string | undefined;
}

/**
 * One list row: name, an optional mono symbol beside it, an optional
 * right-aligned detail and a chevron when pressable. Memoized because
 * browse/search/favorites lists render hundreds of these.
 */
export const Row = memo(function Row({
	title,
	subtitle,
	detail,
	onPress,
	trailing,
	accessibilityLabel,
}: RowProps) {
	const theme = useTheme();
	const body = (
		<>
			<View style={styles.rowText}>
				<AppText numberOfLines={2}>
					{title}
					{subtitle === undefined || subtitle === '' ? null : (
						<AppText size="sm" tone="muted" mono>
							{'  '}
							{subtitle}
						</AppText>
					)}
				</AppText>
			</View>
			{detail === undefined ? null : (
				<AppText size="sm" tone="muted" mono>
					{detail}
				</AppText>
			)}
			{trailing}
			{onPress === undefined ? null : (
				<Ionicons name="chevron-forward" size={16} color={theme.color.inkMuted} />
			)}
		</>
	);
	const rowStyle = [
		styles.row,
		{
			paddingVertical: theme.space(3),
			paddingHorizontal: theme.space(4),
			gap: theme.space(2),
			borderBottomColor: theme.color.border,
			borderBottomWidth: StyleSheet.hairlineWidth,
			backgroundColor: theme.color.surface,
		},
	];
	if (onPress === undefined) return <View style={rowStyle}>{body}</View>;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? title}
			onPress={onPress}
			style={({ pressed }) => [rowStyle, pressed ? { backgroundColor: theme.color.bg } : null]}
		>
			{body}
		</Pressable>
	);
});

export interface BadgeProps {
	label: string;
	color?: string | undefined;
}

export function Badge({ label, color }: BadgeProps) {
	const theme = useTheme();
	const tint = color ?? theme.color.inkMuted;
	return (
		<View
			style={{
				borderColor: tint,
				borderWidth: StyleSheet.hairlineWidth,
				borderRadius: theme.radius.xl,
				paddingHorizontal: theme.space(2),
				paddingVertical: theme.space(0.5),
			}}
		>
			<AppText size="xs" style={{ color: tint }}>
				{label}
			</AppText>
		</View>
	);
}

export interface LinkCardProps {
	title: string;
	description?: string | undefined;
	onPress: () => void;
	accent?: string | undefined;
	detail?: string | undefined;
}

export function LinkCard({ title, description, onPress, accent, detail }: LinkCardProps) {
	const theme = useTheme();
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				{
					backgroundColor: pressed ? theme.color.bg : theme.color.surface,
					borderColor: theme.color.border,
					borderLeftColor: accent ?? theme.color.accent,
					borderWidth: StyleSheet.hairlineWidth,
					borderLeftWidth: 3,
					borderRadius: theme.radius.md,
					padding: theme.space(4),
					gap: theme.space(1),
				},
			]}
		>
			<View style={styles.row}>
				<AppText weight="600" style={styles.rowText}>
					{title}
				</AppText>
				{detail === undefined ? null : (
					<AppText size="sm" tone="muted">
						{detail}
					</AppText>
				)}
			</View>
			{description === undefined ? null : (
				<AppText size="sm" tone="muted">
					{description}
				</AppText>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center' },
	rowText: { flex: 1 },
});
