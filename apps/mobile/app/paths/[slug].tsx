import { localizedName } from '@equreka/core/i18n';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PathScreen } from '../../features/paths/path-screen';
import { getPresentation } from '../../shared/content/artifact';
import { firstParam } from '../../shared/navigation/params';
import { useLocale, useT } from '../../shared/providers/equreka-provider';

export default function PathRoute() {
	const locale = useLocale();
	const t = useT();
	const slug = firstParam(useLocalSearchParams<{ slug: string }>().slug) ?? '';
	const path = getPresentation('paths')[slug];
	const title = path === undefined ? t('paths.title') : localizedName(path, locale);
	return (
		<>
			<Stack.Screen options={{ title }} />
			<PathScreen slug={slug} />
		</>
	);
}
