import { type ThemeSetting, useSettings } from '@equreka/core';
import { LOCALES, type Locale, t } from '@equreka/core/i18n';
import { useId } from 'react';
import { Icon } from '../components/react-icon';
import { gearWideIcon, type IconDefinition, moonIcon, sunIcon, translateIcon } from '../lib/icons';
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

const THEME_ICONS: Record<ThemeSetting, IconDefinition> = {
	system: gearWideIcon,
	light: sunIcon,
	dark: moonIcon,
};

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
	const groupId = useId();

	return (
		<div className="eq-card">
			<div className="eq-card-body">
				<section className="eq-settings-section" aria-labelledby={`${groupId}-theme`}>
					<h2 id={`${groupId}-theme`} className="eq-settings-label">
						{t(locale, 'settings.theme')}
					</h2>
					<div className="eq-choices" role="radiogroup" aria-labelledby={`${groupId}-theme`}>
						{THEME_OPTIONS.map((option) => (
							<label key={option} className="eq-choice">
								<input
									type="radio"
									className="eq-choice-input"
									name={`${groupId}-theme-option`}
									value={option}
									checked={settings.theme === option}
									onChange={() => {
										setTheme(option);
										applyTheme(option);
									}}
								/>
								<span className="eq-btn eq-btn-dark eq-btn-pill eq-choice-face">
									<Icon icon={THEME_ICONS[option]} />
									{t(locale, THEME_LABEL_KEYS[option])}
								</span>
							</label>
						))}
					</div>
				</section>
				<section className="eq-settings-section" aria-labelledby={`${groupId}-language`}>
					<h2 id={`${groupId}-language`} className="eq-settings-label">
						<Icon icon={translateIcon} />
						{t(locale, 'settings.language')}
					</h2>
					<ul className="eq-choices">
						{LOCALES.map((option) => (
							<li key={option}>
								{option === locale ? (
									<span
										className="eq-btn eq-btn-primary eq-btn-pill eq-choice-face"
										aria-current="true"
									>
										{LOCALE_NAMES[option]}
									</span>
								) : (
									<a
										className="eq-btn eq-btn-dark eq-btn-pill eq-choice-face"
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
				<section className="eq-settings-section" aria-labelledby={`${groupId}-favorites`}>
					<h2 id={`${groupId}-favorites`} className="eq-settings-label">
						{t(locale, 'settings.favorites')}
					</h2>
					<FavoritesTransfer locale={locale} />
				</section>
				<p className="eq-settings-version">
					{t(locale, 'settings.version')}: v{version}
				</p>
			</div>
		</div>
	);
}
