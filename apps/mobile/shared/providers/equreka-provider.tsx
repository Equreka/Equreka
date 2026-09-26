import { type KVStorage, type UseSettings, useSettings } from '@equreka/core';
import { type Locale, type MessageKey, t } from '@equreka/core/i18n';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { resolveTheme, type Theme } from '../theme/theme';

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/**
 * Everything a screen needs from the app shell: the injected KVStorage,
 * the settings hook bound to it, the resolved locale and theme, and a
 * locale-bound `t`. Screens never import the sqlite adapter directly, so
 * tests mount them over an in-memory storage.
 */
export interface EqurekaContextValue {
	storage: KVStorage;
	settings: UseSettings;
	locale: Locale;
	theme: Theme;
	t: Translate;
}

const EqurekaContext = createContext<EqurekaContextValue | null>(null);

export interface EqurekaProviderProps {
	storage: KVStorage;
	children: ReactNode;
}

export function EqurekaProvider({ storage, children }: EqurekaProviderProps) {
	const settings = useSettings(storage);
	const systemScheme = useColorScheme();
	const themeSetting = settings.settings.theme;
	const mode =
		themeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeSetting;
	const locale = settings.settings.locale;
	const value = useMemo<EqurekaContextValue>(
		() => ({
			storage,
			settings,
			locale,
			theme: resolveTheme(mode),
			t: (key, params) => t(locale, key, params),
		}),
		[storage, settings, locale, mode],
	);
	return <EqurekaContext.Provider value={value}>{children}</EqurekaContext.Provider>;
}

export function useEqureka(): EqurekaContextValue {
	const value = useContext(EqurekaContext);
	if (value === null) {
		throw new Error('useEqureka must be used inside <EqurekaProvider>');
	}
	return value;
}

export function useTheme(): Theme {
	return useEqureka().theme;
}

export function useLocale(): Locale {
	return useEqureka().locale;
}

export function useStorage(): KVStorage {
	return useEqureka().storage;
}

export function useT(): Translate {
	return useEqureka().t;
}
