import { localizedName } from '@equreka/core/i18n';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CalculatorScreen } from '../../features/calculator/calculator-screen';
import { getEngineSlice } from '../../shared/content/artifact';
import { firstParam } from '../../shared/navigation/params';
import { useLocale, useT } from '../../shared/providers/equreka-provider';

export default function CalculatorRoute() {
	const locale = useLocale();
	const t = useT();
	const slug = firstParam(useLocalSearchParams<{ slug: string }>().slug) ?? '';
	const meta = getEngineSlice().equations[slug];
	const title = meta === undefined ? t('calculator.title') : localizedName(meta, locale);
	return (
		<>
			<Stack.Screen options={{ title }} />
			<CalculatorScreen slug={slug} />
		</>
	);
}
