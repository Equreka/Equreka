import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../providers/equreka-provider';
import { AppText } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
	label: string;
	onPress: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	selected?: boolean;
	accessibilityLabel?: string | undefined;
}

export function Button({
	label,
	onPress,
	variant = 'secondary',
	disabled = false,
	selected = false,
	accessibilityLabel,
}: ButtonProps) {
	const theme = useTheme();
	const filled = variant === 'primary' || selected;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ disabled, selected }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.base,
				{
					paddingVertical: theme.space(2),
					paddingHorizontal: theme.space(4),
					borderRadius: theme.radius.md,
					borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
					borderColor: filled ? theme.color.accent : theme.color.border,
					backgroundColor: filled
						? theme.color.accent
						: pressed
							? theme.color.bg
							: variant === 'ghost'
								? 'transparent'
								: theme.color.surface,
					opacity: disabled ? 0.5 : 1,
				},
			]}
		>
			<AppText size="sm" weight="600" tone={filled ? 'accentInk' : 'ink'}>
				{label}
			</AppText>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});
