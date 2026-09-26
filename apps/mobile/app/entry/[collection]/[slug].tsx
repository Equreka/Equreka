import { collectionLabel } from '@equreka/core/i18n';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { getSummary } from '../../../entities/content/lookup';
import { entryHref, isEntryCollection } from '../../../entities/content/routes';
import { EntryScreen } from '../../../features/entry/entry-screen';
import { firstParam } from '../../../shared/navigation/params';
import { useLocale } from '../../../shared/providers/equreka-provider';

/**
 * The `equreka://entry/<collection>/<slug>` deep-link target. Paths and
 * categories own richer screens, so their links redirect there.
 */
export default function EntryRoute() {
	const locale = useLocale();
	const params = useLocalSearchParams<{ collection: string; slug: string }>();
	const collection = firstParam(params.collection) ?? '';
	const slug = firstParam(params.slug) ?? '';
	if (collection === 'paths' || collection === 'categories') {
		return <Redirect href={entryHref(collection, slug)} />;
	}
	const summary = isEntryCollection(collection) ? getSummary(collection, slug, locale) : undefined;
	const title =
		summary?.name ?? (isEntryCollection(collection) ? collectionLabel(locale, collection) : '');
	return (
		<>
			<Stack.Screen options={{ title }} />
			<EntryScreen collection={collection} slug={slug} />
		</>
	);
}
