import { localizedName } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { branchSectionsInCategory } from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import { pickSegments } from '../../entities/content/text';
import { getPresentation } from '../../shared/content/artifact';
import { RichText } from '../../shared/math/math-view';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { categoryColor } from '../../shared/theme/theme';
import { Badge, LinkCard } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { Muted, SectionTitle, Title } from '../../shared/ui/text';
import { CollectionGroups } from '../branch/collection-groups';

export interface CategoryScreenProps {
	slug: string;
}

/**
 * A category's entries by branch: each branch opens on a card that leads to
 * its own screen, then its entries by collection; unbranched entries close
 * the list under "General".
 */
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
	const branches = getPresentation('branches');
	const color = categoryColor(theme, slug);
	const description = pickSegments(category.descriptionSegments, locale);
	const sections = branchSectionsInCategory(slug, locale);
	return (
		<Screen>
			<VStack>
				<HStack>
					<Title>{localizedName(category, locale)}</Title>
					<Badge label={t('collection.categories')} color={color} />
				</HStack>
				{description === undefined ? null : <RichText segments={description.segments} />}
				{description?.untranslated ? <Muted>{t('badge.untranslated')}</Muted> : null}
			</VStack>
			{sections.length === 0 ? <Muted>{t('mobile.category.empty')}</Muted> : null}
			{sections.map((section) => {
				const branch = section.branch === null ? undefined : branches[section.branch];
				const branchSlug = section.branch;
				return (
					<VStack key={branchSlug ?? 'general'}>
						{branch === undefined || branchSlug === null ? (
							<SectionTitle>
								{t('branch.general')} · {section.count}
							</SectionTitle>
						) : (
							<LinkCard
								title={localizedName(branch, locale)}
								detail={String(section.count)}
								accent={color}
								onPress={() => router.push(entryHref('branches', branchSlug))}
							/>
						)}
						<CollectionGroups groups={section.groups} />
					</VStack>
				);
			})}
		</Screen>
	);
}
