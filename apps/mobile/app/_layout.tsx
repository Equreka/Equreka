import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EqurekaProvider, useT, useTheme } from '../shared/providers/equreka-provider';
import { kvSqliteStorage } from '../shared/storage/kv-sqlite-storage';

function RootStack() {
	const theme = useTheme();
	const t = useT();
	return (
		<>
			<StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
			<Stack
				screenOptions={{
					headerStyle: { backgroundColor: theme.color.surface },
					headerTintColor: theme.color.ink,
					headerTitleStyle: { color: theme.color.ink },
					headerBackButtonDisplayMode: 'minimal',
					contentStyle: { backgroundColor: theme.color.bg },
				}}
			>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="converter" options={{ title: t('converter.title') }} />
				<Stack.Screen name="calculator/index" options={{ title: t('calculator.title') }} />
				<Stack.Screen name="paths/index" options={{ title: t('paths.title') }} />
				<Stack.Screen name="+not-found" options={{ title: t('mobile.notFound.title') }} />
			</Stack>
		</>
	);
}

/**
 * Root of every route: the sqlite-backed KVStorage is injected once here,
 * so screens and tests only ever see the EqurekaProvider contract.
 */
export default function RootLayout() {
	return (
		<EqurekaProvider storage={kvSqliteStorage}>
			<RootStack />
		</EqurekaProvider>
	);
}
