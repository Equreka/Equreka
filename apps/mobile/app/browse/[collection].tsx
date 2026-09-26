import { collectionLabel } from '@equreka/core/i18n';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { isEntryCollection } from '../../entities/content/routes';
import { BrowseScreen } from '../../features/browse/browse-screen';
import { firstParam } from '../../shared/navigation/params';
import { useLocale } from '../../shared/providers/equreka-provider';
import NotFoundScreen from '../+not-found';

export default function BrowseRoute() {
	const locale = useLocale();
	const collection = firstParam(useLocalSearchParams<{ collection: string }>().collection) ?? '';
	if (!isEntryCollection(collection)) return <NotFoundScreen />;
	if (collection === 'paths') return <Redirect href="/paths" />;
	return (
		<>
			<Stack.Screen options={{ title: collectionLabel(locale, collection) }} />
			<BrowseScreen collection={collection} />
		</>
	);
}
