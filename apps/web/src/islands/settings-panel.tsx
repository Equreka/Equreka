import { type ThemeSetting, useFavorites, useSettings } from '@equreka/core';
import { LOCALES, type Locale, t } from '@equreka/core/i18n';
import { useId } from 'react';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { localePath } from '../lib/locale-paths';
import FavoritesTransfer from './favorites-transfer';

export interface SettingsPanelProps {
	locale?: Locale;
	version: string;
}

const THEME_OPTIONS: readonly ThemeSetting[] = ['system', 'light', 'dark'];

const THEME_LABEL_KEYS = {
	system: 'settings.theme.system',
	light: 'settings.theme.light',
	dark: 'settings.theme.dark',
} as const;

/**
 * Native language names for the switcher — always shown in their own
 * language, never translated.
 */
const LOCALE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

/**
 * Applies a theme choice to the document the same way the layout's inline
 * head script does on load: 'system' resolves through
 * prefers-color-scheme, so data-theme always carries a concrete theme.
 */
function applyTheme(theme: ThemeSetting): void {
	document.documentElement.dataset.theme =
		theme === 'system'
			? matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light'
			: theme;
}

export default function SettingsPanel({ locale = 'en', version }: SettingsPanelProps) {
	const { settings, setTheme, setLocale } = useSettings(kvLocalStorage);
	const favorites = useFavorites(kvLocalStorage);
	const groupId = useId();

	const sectionClass = 'rounded-lg border border-border bg-surface p-6';
	const headingClass = 'text-xl font-semibold';

	return (
		<div className="mt-6 grid max-w-2xl gap-6">
			<section className={sectionClass} aria-labelledby={`${groupId}-theme`}>
				<h2 id={`${groupId}-theme`} className={headingClass}>
					{t(locale, 'settings.theme')}
				</h2>
				<div className="mt-3 flex flex-wrap gap-4" role="radiogroup">
					{THEME_OPTIONS.map((option) => (
						<label key={option} className="flex items-center gap-2 text-sm">
							<input
								type="radio"
								name={`${groupId}-theme-option`}
								value={option}
								checked={settings.theme === option}
								onChange={() => {
									setTheme(option);
									applyTheme(option);
								}}
							/>
							{t(locale, THEME_LABEL_KEYS[option])}
						</label>
					))}
				</div>
			</section>
			<section className={sectionClass} aria-labelledby={`${groupId}-language`}>
				<h2 id={`${groupId}-language`} className={headingClass}>
					{t(locale, 'settings.language')}
				</h2>
				<ul className="mt-3 flex flex-wrap gap-4 text-sm">
					{LOCALES.map((option) => (
						<li key={option}>
							{option === locale ? (
								<span className="font-medium" aria-current="true">
									{LOCALE_NAMES[option]}
								</span>
							) : (
								<a
									className="text-accent hover:underline"
									href={localePath(option, '/settings/')}
									lang={option}
									onClick={() => setLocale(option)}
								>
									{LOCALE_NAMES[option]}
								</a>
							)}
						</li>
					))}
				</ul>
			</section>
			<section className={sectionClass} aria-labelledby={`${groupId}-favorites`}>
				<h2 id={`${groupId}-favorites`} className={headingClass}>
					{t(locale, 'settings.favorites')}
				</h2>
				<div className="mt-3">
					<FavoritesTransfer favorites={favorites} locale={locale} />
				</div>
			</section>
			<p className="text-sm text-ink-muted">
				{t(locale, 'settings.version')}: v{version}
			</p>
		</div>
	);
}
