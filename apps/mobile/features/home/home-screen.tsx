import { collectionLabel, localizedName, type MessageKey } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import {
	BROWSABLE_COLLECTIONS,
	browseHref,
	calculatorHref,
	converterHref,
	entryHref,
} from '../../entities/content/routes';
import type { EntryCollection } from '../../entities/content/types';
import { getArtifactMeta, getPresentation } from '../../shared/content/artifact';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { categoryColor } from '../../shared/theme/theme';
import { LinkCard } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { AppText, Lead, SectionTitle, Title } from '../../shared/ui/text';

const CARD_KEYS: Record<EntryCollection, MessageKey> = {
	categories: 'home.categories',
	branches: 'collection.branches',
	magnitudes: 'home.card.magnitudes',
	units: 'home.card.units',
	prefixes: 'home.card.prefixes',
	constants: 'home.card.constants',
	variables: 'collection.variables',
	equations: 'home.card.equations',
	paths: 'home.card.paths',
};

export function HomeScreen() {
	const t = useT();
	const locale = useLocale();
	const theme = useTheme();
	const router = useRouter();
	const counts = getArtifactMeta().counts;
	const categories = Object.entries(getPresentation('categories')).sort(
		([, a], [, b]) => a.order - b.order,
	);
	return (
		<Screen>
			<VStack>
				<Title>Equreka</Title>
				<Lead>{t('home.lead')}</Lead>
			</VStack>
			<VStack>
				<SectionTitle>{t('home.categories')}</SectionTitle>
				<HStack>
					{categories.map(([slug, category]) => {
						const color = categoryColor(theme, slug);
						return (
							<Pressable
								key={slug}
								accessibilityRole="button"
								onPress={() => router.push(entryHref('categories', slug))}
								style={({ pressed }) => [
									styles.chip,
									{
										borderColor: color,
										borderRadius: theme.radius.xl,
										paddingHorizontal: theme.space(3),
										paddingVertical: theme.space(1.5),
										backgroundColor: pressed ? theme.color.bg : theme.color.surface,
									},
								]}
							>
								<AppText size="sm" weight="600" style={{ color }}>
									{localizedName(category, locale)}
								</AppText>
							</Pressable>
						);
					})}
				</HStack>
			</VStack>
			<VStack>
				<SectionTitle>{t('home.browse')}</SectionTitle>
				{BROWSABLE_COLLECTIONS.map((collection) => (
					<LinkCard
						key={collection}
						title={collectionLabel(locale, collection)}
						description={t(CARD_KEYS[collection])}
						detail={String(counts[collection] ?? '')}
						onPress={() => router.push(browseHref(collection))}
					/>
				))}
				<LinkCard
					title={t('converter.title')}
					description={t('home.card.converter')}
					onPress={() => router.push(converterHref())}
					accent={theme.color.category.physics}
				/>
				<LinkCard
					title={t('calculator.title')}
					description={t('home.card.calculator')}
					onPress={() => router.push(calculatorHref())}
					accent={theme.color.category.mathematics}
				/>
			</VStack>
		</Screen>
	);
}

const styles = StyleSheet.create({
	chip: { borderWidth: 1 },
});
