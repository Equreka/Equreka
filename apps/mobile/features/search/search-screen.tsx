import { collectionLabel } from '@equreka/core/i18n';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { collectionRank, entryHref } from '../../entities/content/routes';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { Screen } from '../../shared/ui/screen';
import { AppText, Muted } from '../../shared/ui/text';
import { type ResultRow, runSearch, useSearchLanes } from './use-search-lanes';

type ListItem =
	| { kind: 'header'; key: string; collection: string }
	| { kind: 'row'; key: string; row: ResultRow };

/**
 * Flattens grouped results for FlashList: one header item per collection
 * (pinned groups first, then canonical order) followed by its rows.
 */
function toListItems(rows: ResultRow[]): ListItem[] {
	const byCollection = new Map<string, ResultRow[]>();
	for (const row of rows) {
		const bucket = byCollection.get(row.collection);
		if (bucket === undefined) byCollection.set(row.collection, [row]);
		else bucket.push(row);
	}
	const groups = [...byCollection.entries()].sort(([a, rowsA], [b, rowsB]) => {
		const pinnedA = rowsA.some((row) => row.pinned) ? 0 : 1;
		const pinnedB = rowsB.some((row) => row.pinned) ? 0 : 1;
		return pinnedA - pinnedB || collectionRank(a) - collectionRank(b);
	});
	const items: ListItem[] = [];
	for (const [collection, groupRows] of groups) {
		items.push({ kind: 'header', key: `h:${collection}`, collection });
		for (const row of groupRows) items.push({ kind: 'row', key: row.key, row });
	}
	return items;
}

export function SearchScreen() {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const [query, setQuery] = useState('');
	const lanes = useSearchLanes(locale);
	const active = query.trim() !== '';
	const items = useMemo(
		() => (lanes.status === 'ready' && active ? toListItems(runSearch(lanes.lanes, query)) : []),
		[lanes, query, active],
	);
	const renderItem = useCallback(
		({ item }: { item: ListItem }) =>
			item.kind === 'header' ? (
				<View style={{ paddingHorizontal: theme.space(4), paddingTop: theme.space(3) }}>
					<AppText size="xs" tone="muted" weight="600" style={styles.upper}>
						{collectionLabel(locale, item.collection)}
					</AppText>
				</View>
			) : (
				<Row
					title={item.row.name}
					subtitle={item.row.symbolText}
					onPress={() => router.push(entryHref(item.row.collection, item.row.slug))}
				/>
			),
		[locale, router, theme],
	);
	const status = !active
		? t('mobile.search.start')
		: lanes.status === 'building'
			? t('mobile.search.building')
			: items.length === 0
				? t('search.noResults', { query: query.trim() })
				: null;
	return (
		<Screen scroll={false}>
			<View style={{ padding: theme.space(4), gap: theme.space(2) }}>
				<TextInput
					accessibilityLabel={t('search.aria')}
					style={{
						borderColor: theme.color.border,
						borderWidth: StyleSheet.hairlineWidth,
						backgroundColor: theme.color.surface,
						color: theme.color.ink,
						borderRadius: theme.radius.md,
						paddingHorizontal: theme.space(3),
						paddingVertical: theme.space(2.5),
						fontSize: theme.text.base.fontSize,
					}}
					value={query}
					onChangeText={setQuery}
					placeholder={t('search.placeholder')}
					placeholderTextColor={theme.color.inkMuted}
					autoCapitalize="none"
					autoCorrect={false}
					clearButtonMode="while-editing"
					returnKeyType="search"
				/>
				{status === null ? null : <Muted>{status}</Muted>}
			</View>
			<FlashList
				data={items}
				keyExtractor={(item) => item.key}
				getItemType={(item) => item.kind}
				renderItem={renderItem}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ paddingBottom: theme.space(8) }}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	upper: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
