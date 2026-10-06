import { localizedName } from '@equreka/core/i18n';
import { Stack, useLocalSearchParams } from 'expo-router';
import { BranchScreen } from '../../features/branch/branch-screen';
import { getPresentation } from '../../shared/content/artifact';
import { firstParam } from '../../shared/navigation/params';
import { useLocale, useT } from '../../shared/providers/equreka-provider';

export default function BranchRoute() {
	const locale = useLocale();
	const t = useT();
	const slug = firstParam(useLocalSearchParams<{ slug: string }>().slug) ?? '';
	const branch = getPresentation('branches')[slug];
	const title = branch === undefined ? t('collection.branches') : localizedName(branch, locale);
	return (
		<>
			<Stack.Screen options={{ title }} />
			<BranchScreen slug={slug} />
		</>
	);
}
