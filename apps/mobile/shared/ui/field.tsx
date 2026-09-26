import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, useTheme } from '../providers/equreka-provider';
import { Button } from './button';
import { AppText } from './text';

export interface FieldShellProps {
	label: string;
	children: ReactNode;
}

function FieldShell({ label, children }: FieldShellProps) {
	const theme = useTheme();
	return (
		<View style={{ gap: theme.space(1) }}>
			<AppText size="sm" tone="muted" weight="500">
				{label}
			</AppText>
			{children}
		</View>
	);
}

export interface DecimalFieldProps {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder?: string | undefined;
	unit?: ReactNode;
}

/**
 * Numeric entry as text: the value stays a string until the screen parses
 * it at the engine boundary, so partial input ("1e", "-") never becomes
 * NaN state.
 */
export function DecimalField({ label, value, onChangeText, placeholder, unit }: DecimalFieldProps) {
	const theme = useTheme();
	return (
		<FieldShell label={label}>
			<View style={styles.inputRow}>
				<TextInput
					accessibilityLabel={label}
					style={[
						styles.input,
						{
							borderColor: theme.color.border,
							backgroundColor: theme.color.surface,
							color: theme.color.ink,
							borderRadius: theme.radius.md,
							paddingHorizontal: theme.space(3),
							paddingVertical: theme.space(2),
							fontSize: theme.text.base.fontSize,
						},
					]}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={theme.color.inkMuted}
					keyboardType="numbers-and-punctuation"
					inputMode="decimal"
					autoCapitalize="none"
					autoCorrect={false}
				/>
				{unit === undefined || unit === null ? null : (
					<View style={[styles.unit, { paddingHorizontal: theme.space(2) }]}>{unit}</View>
				)}
			</View>
		</FieldShell>
	);
}

export interface PickerOption<T extends string> {
	value: T;
	label: string;
	detail?: string | undefined;
}

export interface PickerFieldProps<T extends string> {
	label: string;
	value: T | '';
	options: readonly PickerOption<T>[];
	onChange: (value: T) => void;
}

/**
 * Select replacement: a pressable summary that opens a full-screen sheet
 * with a filter box, because native pickers cannot filter 77 units and the
 * converter is unusable without it.
 */
export function PickerField<T extends string>({
	label,
	value,
	options,
	onChange,
}: PickerFieldProps<T>) {
	const theme = useTheme();
	const t = useT();
	const insets = useSafeAreaInsets();
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState('');
	const selected = options.find((option) => option.value === value);
	const visible = useMemo(() => {
		const needle = filter.trim().toLowerCase();
		if (needle === '') return options;
		return options.filter(
			(option) =>
				option.label.toLowerCase().includes(needle) ||
				(option.detail ?? '').toLowerCase().includes(needle),
		);
	}, [options, filter]);
	const close = (): void => {
		setOpen(false);
		setFilter('');
	};
	return (
		<FieldShell label={label}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityValue={{ text: selected?.label ?? '' }}
				onPress={() => setOpen(true)}
				style={[
					styles.inputRow,
					{
						borderColor: theme.color.border,
						backgroundColor: theme.color.surface,
						borderRadius: theme.radius.md,
						borderWidth: StyleSheet.hairlineWidth,
						paddingHorizontal: theme.space(3),
						paddingVertical: theme.space(2),
					},
				]}
			>
				<AppText style={styles.grow} numberOfLines={1}>
					{selected?.label ?? ''}
					{selected?.detail === undefined ? null : (
						<AppText size="sm" tone="muted" mono>
							{'  '}
							{selected.detail}
						</AppText>
					)}
				</AppText>
				<Ionicons name="chevron-down" size={16} color={theme.color.inkMuted} />
			</Pressable>
			<Modal visible={open} animationType="slide" onRequestClose={close}>
				<View
					style={[
						styles.grow,
						{
							backgroundColor: theme.color.bg,
							paddingTop: insets.top + theme.space(2),
							paddingBottom: insets.bottom,
						},
					]}
				>
					<View style={[styles.inputRow, { padding: theme.space(4), gap: theme.space(2) }]}>
						<TextInput
							accessibilityLabel={t('mobile.picker.filter')}
							style={[
								styles.input,
								{
									borderColor: theme.color.border,
									backgroundColor: theme.color.surface,
									color: theme.color.ink,
									borderRadius: theme.radius.md,
									paddingHorizontal: theme.space(3),
									paddingVertical: theme.space(2),
									fontSize: theme.text.base.fontSize,
								},
							]}
							value={filter}
							onChangeText={setFilter}
							placeholder={t('mobile.picker.filter')}
							placeholderTextColor={theme.color.inkMuted}
							autoFocus
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<Button label={t('mobile.picker.close')} variant="ghost" onPress={close} />
					</View>
					<FlatList
						data={visible}
						keyExtractor={(option) => option.value}
						keyboardShouldPersistTaps="handled"
						renderItem={({ item }) => (
							<Pressable
								accessibilityRole="button"
								accessibilityState={{ selected: item.value === value }}
								onPress={() => {
									onChange(item.value);
									close();
								}}
								style={({ pressed }) => [
									styles.inputRow,
									{
										paddingVertical: theme.space(3),
										paddingHorizontal: theme.space(4),
										gap: theme.space(2),
										backgroundColor: pressed ? theme.color.surface : theme.color.bg,
										borderBottomColor: theme.color.border,
										borderBottomWidth: StyleSheet.hairlineWidth,
									},
								]}
							>
								<AppText style={styles.grow}>{item.label}</AppText>
								{item.detail === undefined ? null : (
									<AppText size="sm" tone="muted" mono>
										{item.detail}
									</AppText>
								)}
								{item.value === value ? (
									<Ionicons name="checkmark" size={18} color={theme.color.accent} />
								) : null}
							</Pressable>
						)}
					/>
				</View>
			</Modal>
		</FieldShell>
	);
}

const styles = StyleSheet.create({
	inputRow: { flexDirection: 'row', alignItems: 'center' },
	input: { flex: 1, borderWidth: StyleSheet.hairlineWidth },
	unit: { justifyContent: 'center' },
	grow: { flex: 1 },
});
