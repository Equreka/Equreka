import { usePathProgress } from '@equreka/core';
import { localizedName } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { entryHref } from '../../entities/content/routes';
import { pickSegments, plainTextOf } from '../../entities/content/text';
import type { PresentationPath } from '../../entities/content/types';
import { getPresentation } from '../../shared/content/artifact';
import { useLocale, useStorage, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Badge, LinkCard } from '../../shared/ui/card';
import { Screen, VStack } from '../../shared/ui/screen';
import { Lead, Title } from '../../shared/ui/text';

const LEVEL_ORDER = { intro: 0, intermediate: 1, advanced: 2 } as const;

/**
 * Compact completion badge for a paths card, rendering nothing until a
 * step is done so untouched paths stay visually quiet.
 */
export function PathProgressBadge({ slug, path }: { slug: string; path: PresentationPath }) {
	const t = useT();
	const theme = useTheme();
	const stepIds = path.steps.map((step) => step.id);
	const progress = usePathProgress(useStorage(), slug, stepIds);
	if (progress.done.size === 0) return null;
	const complete = progress.done.size === stepIds.length;
	return (
		<Badge
			label={complete ? t('path.completed') : `${progress.done.size}/${stepIds.length}`}
			color={theme.color.accent}
		/>
	);
}

function PathCard({ slug, path }: { slug: string; path: PresentationPath }) {
	const locale = useLocale();
	const t = useT();
	const router = useRouter();
	const description = pickSegments(path.descriptionSegments, locale);
	const detail = [
		t(`path.level.${path.level}`),
		t('path.steps', { count: path.steps.length }),
		path.estimatedMinutes === undefined
			? null
			: t('path.minutes', { count: path.estimatedMinutes }),
	]
		.filter((part) => part !== null)
		.join(' · ');
	return (
		<VStack gap={1}>
			<LinkCard
				title={localizedName(path, locale)}
				description={description === undefined ? undefined : plainTextOf(description.segments)}
				detail={detail}
				onPress={() => router.push(entryHref('paths', slug))}
			/>
			<PathProgressBadge slug={slug} path={path} />
		</VStack>
	);
}

export function PathsScreen() {
	const t = useT();
	const paths = Object.entries(getPresentation('paths')).sort(
		([, a], [, b]) =>
			LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.name.en.localeCompare(b.name.en),
	);
	return (
		<Screen>
			<VStack>
				<Title>{t('paths.title')}</Title>
				<Lead>{t('paths.lead', { count: paths.length })}</Lead>
			</VStack>
			<VStack gap={3}>
				{paths.map(([slug, path]) => (
					<PathCard key={slug} slug={slug} path={path} />
				))}
			</VStack>
		</Screen>
	);
}
