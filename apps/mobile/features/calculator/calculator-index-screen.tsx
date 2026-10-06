import { localizedName } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { calculatorHref } from '../../entities/content/routes';
import { getEngineSlice } from '../../shared/content/artifact';
import { useLocale, useT } from '../../shared/providers/equreka-provider';
import { LinkCard } from '../../shared/ui/card';
import { Screen, VStack } from '../../shared/ui/screen';
import { Lead, Title } from '../../shared/ui/text';

export function CalculatorIndexScreen() {
	const locale = useLocale();
	const t = useT();
	const router = useRouter();
	const equations = Object.values(getEngineSlice().equations)
		.filter((equation) => equation.calculatorEnabled)
		.map((equation) => ({
			slug: equation.slug,
			name: localizedName(equation, locale),
			kind: equation.kind,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	return (
		<Screen>
			<VStack>
				<Title>{t('calculator.title')}</Title>
				<Lead>{t('calculator.lead', { count: equations.length })}</Lead>
			</VStack>
			<VStack>
				{equations.map((equation) => (
					<LinkCard
						key={equation.slug}
						title={equation.name}
						detail={t(`kind.${equation.kind}`)}
						onPress={() => router.push(calculatorHref(equation.slug))}
					/>
				))}
			</VStack>
		</Screen>
	);
}
