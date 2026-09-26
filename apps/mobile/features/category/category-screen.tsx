import { collectionLabel, localizedName } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { entriesInCategory } from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import { pickSegments } from '../../entities/content/text';
import { getPresentation } from '../../shared/content/artifact';
import { RichText } from '../../shared/math/math-view';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { categoryColor } from '../../shared/theme/theme';
import { Badge, Row } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { Muted, SectionTitle, Title } from '../../shared/ui/text';

export interface CategoryScreenProps {
	slug: string;
}

export function CategoryScreen({ slug }: CategoryScreenProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const category = getPresentation('categories')[slug];
	if (category === undefined) {
		return (
			<Screen>
				<Muted>{t('mobile.entry.notFound')}</Muted>
			</Screen>
		);
	}
	const description = pickSegments(category.descriptionSegments, locale);
	const groups = entriesInCategory(slug, locale);
	return (
		<Screen>
			<VStack>
				<HStack>
					<Title>{localizedName(category, locale)}</Title>
					<Badge label={t('collection.categories')} color={categoryColor(theme, slug)} />
				</HStack>
				{description === undefined ? null : <RichText segments={description.segments} />}
				{description?.untranslated ? <Muted>{t('badge.untranslated')}</Muted> : null}
			</VStack>
			{groups.length === 0 ? <Muted>{t('mobile.category.empty')}</Muted> : null}
			{groups.map((group) => (
				<VStack key={group.collection}>
					<SectionTitle>
						{collectionLabel(locale, group.collection)} · {group.entries.length}
					</SectionTitle>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						{group.entries.map((entry) => (
							<Row
								key={entry.slug}
								title={entry.name}
								subtitle={entry.symbolText}
								onPress={() => router.push(entryHref(entry.collection, entry.slug))}
							/>
						))}
					</View>
				</VStack>
			))}
		</Screen>
	);
}
