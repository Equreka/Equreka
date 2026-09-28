import { localizedName } from '@equreka/core/i18n';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
	branchSectionsOfCollection,
	type EntrySummary,
	listEntries,
} from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import type { EntryCollection, MemberCollection } from '../../entities/content/types';
import { getPresentation } from '../../shared/content/artifact';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { Screen } from '../../shared/ui/screen';
import { Muted, SectionTitle } from '../../shared/ui/text';

export interface BrowseScreenProps {
	collection: EntryCollection;
}

/**
 * One FlashList cell: a branch header or an entry row. Row keys carry the
 * branch because an entry filed under two branches is listed under both.
 */
type BrowseItem =
	| { kind: 'header'; key: string; title: string; count: number }
	| { kind: 'row'; key: string; entry: EntrySummary };

function isMemberCollection(collection: EntryCollection): collection is MemberCollection {
	return collection !== 'categories' && collection !== 'branches';
}

/**
 * One collection over FlashList (77 units and growing; the recycler keeps
 * the list at one row's render cost per scroll frame), sectioned by branch
 * with unbranched entries last under "General";
 * taxonomy collections, which have no branches, list alphabetically.
 */
export function BrowseScreen({ collection }: BrowseScreenProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const total = useMemo(() => listEntries(collection, locale).length, [collection, locale]);
	const items = useMemo((): BrowseItem[] => {
		if (!isMemberCollection(collection)) {
			return listEntries(collection, locale).map((entry) => ({
				kind: 'row',
				key: entry.slug,
				entry,
			}));
		}
		const branches = getPresentation('branches');
		return branchSectionsOfCollection(collection, locale).flatMap((section): BrowseItem[] => {
			const branch = section.branch === null ? undefined : branches[section.branch];
			const id = section.branch ?? 'general';
			return [
				{
					kind: 'header',
					key: `header:${id}`,
					title: branch === undefined ? t('branch.general') : localizedName(branch, locale),
					count: section.entries.length,
				},
				...section.entries.map(
					(entry): BrowseItem => ({ kind: 'row', key: `${id}:${entry.slug}`, entry }),
				),
			];
		});
	}, [collection, locale, t]);
	const renderItem = useCallback(
		({ item }: { item: BrowseItem }) =>
			item.kind === 'header' ? (
				<View
					style={{
						paddingHorizontal: theme.space(4),
						paddingTop: theme.space(4),
						paddingBottom: theme.space(2),
						backgroundColor: theme.color.bg,
					}}
				>
					<SectionTitle>
						{item.title} · {item.count}
					</SectionTitle>
				</View>
			) : (
				<Row
					title={item.entry.name}
					subtitle={item.entry.symbolText}
					onPress={() => router.push(entryHref(item.entry.collection, item.entry.slug))}
				/>
			),
		[router, theme],
	);
	return (
		<Screen scroll={false}>
			<FlashList
				data={items}
				keyExtractor={(item) => item.key}
				getItemType={(item) => item.kind}
				renderItem={renderItem}
				ListHeaderComponent={
					<View style={{ padding: theme.space(4) }}>
						<Muted>{t('mobile.entry.count', { count: total })}</Muted>
					</View>
				}
				contentContainerStyle={{ paddingBottom: theme.space(8) }}
			/>
		</Screen>
	);
}
