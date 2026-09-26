import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { type EntrySummary, listEntries } from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import type { EntryCollection } from '../../entities/content/types';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { Screen } from '../../shared/ui/screen';
import { Muted } from '../../shared/ui/text';

export interface BrowseScreenProps {
	collection: EntryCollection;
}

/**
 * Alphabetical list of one collection over FlashList (77 units and growing;
 * the recycler keeps the list at one row's render cost per scroll frame).
 */
export function BrowseScreen({ collection }: BrowseScreenProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const entries = useMemo(() => listEntries(collection, locale), [collection, locale]);
	const renderItem = useCallback(
		({ item }: { item: EntrySummary }) => (
			<Row
				title={item.name}
				subtitle={item.symbolText}
				onPress={() => router.push(entryHref(item.collection, item.slug))}
			/>
		),
		[router],
	);
	return (
		<Screen scroll={false}>
			<FlashList
				data={entries}
				keyExtractor={(item) => item.slug}
				renderItem={renderItem}
				ListHeaderComponent={
					<View style={{ padding: theme.space(4) }}>
						<Muted>{t('mobile.entry.count', { count: entries.length })}</Muted>
					</View>
				}
				contentContainerStyle={{ paddingBottom: theme.space(8) }}
			/>
		</Screen>
	);
}
