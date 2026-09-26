import { useFavorites } from '@equreka/core';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';
import { useStorage, useT, useTheme } from '../../shared/providers/equreka-provider';

export interface FavoriteButtonProps {
	collection: string;
	slug: string;
}

export function FavoriteButton({ collection, slug }: FavoriteButtonProps) {
	const theme = useTheme();
	const t = useT();
	const favorites = useFavorites(useStorage());
	const active = favorites.isFavorite(collection, slug);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={t(active ? 'favorites.remove' : 'favorites.add')}
			accessibilityState={{ selected: active }}
			hitSlop={theme.space(2)}
			onPress={() => favorites.toggle(collection, slug)}
		>
			<Ionicons
				name={active ? 'heart' : 'heart-outline'}
				size={26}
				color={active ? theme.color.danger : theme.color.inkMuted}
			/>
		</Pressable>
	);
}
