import { collectionLabel } from '@equreka/core/i18n';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { CollectionGroup } from '../../entities/content/lookup';
import { entryHref } from '../../entities/content/routes';
import { useLocale, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { VStack } from '../../shared/ui/screen';
import { Muted } from '../../shared/ui/text';

export interface CollectionGroupsProps {
	groups: readonly CollectionGroup[];
}

/**
 * Entry rows under a muted per-collection label, shared by the category
 * and branch screens.
 */
export function CollectionGroups({ groups }: CollectionGroupsProps) {
	const locale = useLocale();
	const theme = useTheme();
	const router = useRouter();
	return (
		<VStack>
			{groups.map((group) => (
				<VStack key={group.collection} gap={1}>
					<Muted>
						{collectionLabel(locale, group.collection)} · {group.entries.length}
					</Muted>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						{group.entries.map((entry) => (
							<Row
								key={entry.slug}
								title={entry.name}
								subtitle={entry.symbolText}
								onPress={() => router.push(entryHref(entry.collection, entry.slug))}
							/>
						))}
					</View>
				</VStack>
			))}
		</VStack>
	);
}
