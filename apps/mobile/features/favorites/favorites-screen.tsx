import { type FavoriteEntry, useFavorites } from '@equreka/core';
import { collectionLabel } from '@equreka/core/i18n';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { collectionRank, entryHref } from '../../entities/content/routes';
import { getCatalogLite } from '../../shared/content/artifact';
import { useLocale, useStorage, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { Screen } from '../../shared/ui/screen';
import { AppText, Lead, Muted, Title } from '../../shared/ui/text';
import { TransferControls } from '../settings/transfer-controls';

type ListItem =
	| { kind: 'header'; key: string; collection: string; count: number }
	| { kind: 'row'; key: string; entry: FavoriteEntry; name: string; symbolText: string };

function toListItems(
	favorites: readonly FavoriteEntry[],
	names: Map<string, { name: string; symbolText: string }>,
): ListItem[] {
	const byCollection = new Map<string, FavoriteEntry[]>();
	for (const entry of favorites) {
		const bucket = byCollection.get(entry.collection);
		if (bucket === undefined) byCollection.set(entry.collection, [entry]);
		else bucket.push(entry);
	}
	const items: ListItem[] = [];
	for (const [collection, entries] of [...byCollection.entries()].sort(
		([a], [b]) => collectionRank(a) - collectionRank(b),
	)) {
		items.push({ kind: 'header', key: `h:${collection}`, collection, count: entries.length });
		for (const entry of entries) {
			const key = `${entry.collection}:${entry.slug}`;
			const found = names.get(key);
			items.push({
				kind: 'row',
				key,
				entry,
				name: found?.name ?? entry.slug,
				symbolText: found?.symbolText ?? '',
			});
		}
	}
	return items;
}

/**
 * Favorites grouped by collection with removal, names resolved from the
 * bundled catalog-lite for the active locale (slug is the fallback for an
 * entry that left the corpus), plus the envelope export/import controls.
 */
export function FavoritesScreen() {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const favorites = useFavorites(useStorage());
	const names = useMemo(() => {
		const map = new Map<string, { name: string; symbolText: string }>();
		for (const entry of getCatalogLite(locale)) {
			map.set(`${entry.collection}:${entry.slug}`, {
				name: entry.name,
				symbolText: entry.symbolText,
			});
		}
		return map;
	}, [locale]);
	const items = useMemo(
		() => toListItems(favorites.favorites, names),
		[favorites.favorites, names],
	);
	const renderItem = useCallback(
		({ item }: { item: ListItem }) =>
			item.kind === 'header' ? (
				<View style={{ paddingHorizontal: theme.space(4), paddingTop: theme.space(3) }}>
					<AppText size="xs" tone="muted" weight="600" style={styles.upper}>
						{collectionLabel(locale, item.collection)} · {item.count}
					</AppText>
				</View>
			) : (
				<Row
					title={item.name}
					subtitle={item.symbolText}
					onPress={() => router.push(entryHref(item.entry.collection, item.entry.slug))}
					trailing={
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`${t('favorites.remove')}: ${item.name}`}
							hitSlop={theme.space(2)}
							onPress={() => favorites.toggle(item.entry.collection, item.entry.slug)}
						>
							<Ionicons name="close-circle-outline" size={22} color={theme.color.inkMuted} />
						</Pressable>
					}
				/>
			),
		[favorites, locale, router, t, theme],
	);
	return (
		<Screen scroll={false}>
			<FlashList
				data={items}
				keyExtractor={(item) => item.key}
				getItemType={(item) => item.kind}
				renderItem={renderItem}
				ListHeaderComponent={
					<View style={{ padding: theme.space(4), gap: theme.space(2) }}>
						<Title>{t('favorites.title')}</Title>
						<Lead>{t('favorites.lead')}</Lead>
						{items.length === 0 ? <Muted>{t('favorites.none')}</Muted> : null}
					</View>
				}
				ListFooterComponent={
					<View style={{ padding: theme.space(4) }}>
						<TransferControls />
					</View>
				}
				contentContainerStyle={{ paddingBottom: theme.space(8) }}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	upper: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
