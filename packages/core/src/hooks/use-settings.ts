import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/index';
import type { KVStorage } from '../ports/kv-storage';

export const SETTINGS_KEY = 'equreka.v1.settings';

export type ThemeSetting = 'system' | 'light' | 'dark';

const THEMES: readonly ThemeSetting[] = ['system', 'light', 'dark'];

/**
 * Device-local preferences. The hook owns state + persistence only —
 * applying the theme (data-theme on web, appearance on mobile) stays
 * per-platform; web's inline head script reads this same key.
 */
export interface Settings {
	theme: ThemeSetting;
	locale: Locale;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', locale: DEFAULT_LOCALE };

function parseSettings(raw: string | null): Settings {
	if (raw === null) return DEFAULT_SETTINGS;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;
		const record = parsed as Record<string, unknown>;
		return {
			theme: THEMES.includes(record.theme as ThemeSetting)
				? (record.theme as ThemeSetting)
				: DEFAULT_SETTINGS.theme,
			locale: LOCALES.includes(record.locale as Locale)
				? (record.locale as Locale)
				: DEFAULT_SETTINGS.locale,
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export interface UseSettings {
	settings: Settings;
	setTheme(theme: ThemeSetting): void;
	setLocale(locale: Locale): void;
}

export function useSettings(storage: KVStorage): UseSettings {
	const raw = useSyncExternalStore(
		useCallback((onChange: () => void) => storage.subscribe(SETTINGS_KEY, onChange), [storage]),
		() => storage.get(SETTINGS_KEY),
		() => null,
	);
	const settings = useMemo(() => parseSettings(raw), [raw]);

	const persist = useCallback(
		(patch: Partial<Settings>) => {
			const next = { ...parseSettings(storage.get(SETTINGS_KEY)), ...patch };
			storage.set(SETTINGS_KEY, JSON.stringify(next));
		},
		[storage],
	);

	const setTheme = useCallback((theme: ThemeSetting) => persist({ theme }), [persist]);
	const setLocale = useCallback((locale: Locale) => persist({ locale }), [persist]);

	return { settings, setTheme, setLocale };
}
