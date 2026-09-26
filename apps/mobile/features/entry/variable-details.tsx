import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { getSummary } from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import type { PresentationVariable } from '../../entities/content/types';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { VStack } from '../../shared/ui/screen';
import { SectionTitle } from '../../shared/ui/text';

export interface VariableDetailsProps {
	variable: PresentationVariable;
}

export function VariableDetails({ variable }: VariableDetailsProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const unit =
		variable.defaultUnit === undefined
			? undefined
			: getSummary('units', variable.defaultUnit, locale);
	if (unit === undefined) return null;
	return (
		<VStack>
			<SectionTitle>{t('table.unit')}</SectionTitle>
			<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
				<Row
					title={unit.name}
					subtitle={unit.symbolText}
					onPress={() => router.push(entryHref('units', unit.slug))}
				/>
			</View>
		</VStack>
	);
}
