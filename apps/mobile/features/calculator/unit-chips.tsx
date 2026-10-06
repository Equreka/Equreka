import { type Locale, localizedName } from '@equreka/core/i18n';
import type { CompiledUnit } from '@equreka/schema';
import { ScrollView } from 'react-native';
import { useTheme } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';

export interface UnitChipsProps {
	label: string;
	units: readonly CompiledUnit[];
	value: string;
	locale: Locale;
	onChange: (unit: string) => void;
}

/**
 * One-tap unit choice as a horizontal row of symbol chips. A kind-scoped
 * list is short enough that a filterable modal (the converter's
 * PickerField) would only add a step; each chip's accessible name is the
 * unit's full name because symbols alone are ambiguous to a screen reader.
 */
export function UnitChips({ label, units, value, locale, onChange }: UnitChipsProps) {
	const theme = useTheme();
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
			accessibilityLabel={label}
			contentContainerStyle={{ gap: theme.space(1.5) }}
		>
			{units.map((unit) => (
				<Button
					key={unit.slug}
					label={unit.symbolText}
					accessibilityLabel={localizedName(unit, locale)}
					selected={unit.slug === value}
					onPress={() => onChange(unit.slug)}
				/>
			))}
		</ScrollView>
	);
}
