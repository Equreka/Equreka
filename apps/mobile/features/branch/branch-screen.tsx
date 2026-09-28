import { localizedName } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { entriesInBranch } from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import { pickSegments } from '../../entities/content/text';
import { getPresentation } from '../../shared/content/artifact';
import { RichText } from '../../shared/math/math-view';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { categoryColor } from '../../shared/theme/theme';
import { Badge } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { Muted, Title } from '../../shared/ui/text';
import { FavoriteButton } from '../favorites/favorite-button';
import { CollectionGroups } from './collection-groups';

export interface BranchScreenProps {
	slug: string;
}

export function BranchScreen({ slug }: BranchScreenProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const branch = getPresentation('branches')[slug];
	if (branch === undefined) {
		return (
			<Screen>
				<Muted>{t('mobile.entry.notFound')}</Muted>
			</Screen>
		);
	}
	const category = getPresentation('categories')[branch.category];
	const categoryName = category === undefined ? branch.category : localizedName(category, locale);
	const description = pickSegments(branch.descriptionSegments, locale);
	const groups = entriesInBranch(slug, locale);
	return (
		<Screen>
			<VStack>
				<HStack>
					<Title>{localizedName(branch, locale)}</Title>
					<FavoriteButton collection="branches" slug={slug} />
				</HStack>
				<HStack>
					<Pressable
						accessibilityRole="link"
						onPress={() => router.push(entryHref('categories', branch.category))}
					>
						<Badge
							label={t('branch.of', { category: categoryName })}
							color={categoryColor(theme, branch.category)}
						/>
					</Pressable>
				</HStack>
				{description === undefined ? null : <RichText segments={description.segments} />}
				{description?.untranslated ? <Muted>{t('badge.untranslated')}</Muted> : null}
			</VStack>
			{groups.length === 0 ? <Muted>{t('mobile.branch.empty')}</Muted> : null}
			<CollectionGroups groups={groups} />
		</Screen>
	);
}
