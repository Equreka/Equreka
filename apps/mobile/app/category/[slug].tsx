import { localizedName } from '@equreka/core/i18n';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CategoryScreen } from '../../features/category/category-screen';
import { getPresentation } from '../../shared/content/artifact';
import { firstParam } from '../../shared/navigation/params';
import { useLocale, useT } from '../../shared/providers/equreka-provider';

export default function CategoryRoute() {
	const locale = useLocale();
	const t = useT();
	const slug = firstParam(useLocalSearchParams<{ slug: string }>().slug) ?? '';
	const category = getPresentation('categories')[slug];
	const title =
		category === undefined ? t('collection.categories') : localizedName(category, locale);
	return (
		<>
			<Stack.Screen options={{ title }} />
			<CategoryScreen slug={slug} />
		</>
	);
}
