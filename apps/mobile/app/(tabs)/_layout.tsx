import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useT, useTheme } from '../../shared/providers/equreka-provider';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(focused: IconName, idle: IconName) {
	return ({
		color,
		focused: isFocused,
		size,
	}: {
		color: ColorValue;
		focused: boolean;
		size: number;
	}) => <Ionicons name={isFocused ? focused : idle} color={color} size={size} />;
}

export default function TabsLayout() {
	const theme = useTheme();
	const t = useT();
	return (
		<Tabs
			screenOptions={{
				headerStyle: { backgroundColor: theme.color.surface },
				headerTintColor: theme.color.ink,
				headerTitleStyle: { color: theme.color.ink },
				headerShadowVisible: false,
				sceneStyle: { backgroundColor: theme.color.bg },
				tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border },
				tabBarActiveTintColor: theme.color.accent,
				tabBarInactiveTintColor: theme.color.inkMuted,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{ title: t('nav.home'), tabBarIcon: icon('home', 'home-outline') }}
			/>
			<Tabs.Screen
				name="search"
				options={{ title: t('nav.search'), tabBarIcon: icon('search', 'search-outline') }}
			/>
			<Tabs.Screen
				name="favorites"
				options={{ title: t('nav.favorites'), tabBarIcon: icon('heart', 'heart-outline') }}
			/>
			<Tabs.Screen
				name="settings"
				options={{ title: t('nav.settings'), tabBarIcon: icon('settings', 'settings-outline') }}
			/>
		</Tabs>
	);
}
