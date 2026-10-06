import { type ThemeSetting, useSettings } from '@equreka/core';
import { LOCALES, type Locale, t } from '@equreka/core/i18n';
import { type MouseEvent, useId } from 'react';
import { Icon } from '../components/react-icon';
import { gearWideIcon, type IconDefinition, moonIcon, sunIcon, translateIcon } from '../lib/icons';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { localePath } from '../lib/locale-paths';
import FavoritesTransfer from './favorites-transfer';

export interface SettingsPanelProps {
	locale?: Locale;
	version: string;
}

const THEME_OPTIONS: readonly ThemeSetting[] = ['light', 'dark', 'system'];

const THEME_LABEL_KEYS = {
	system: 'design.legacy.settings.themeSystem',
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

/**
 * Picking an option dismisses its menu, as the original Bootstrap dropdown
 * did; the menus are zero-JS `<details>` disclosures otherwise.
 */
function closeMenu(event: MouseEvent<HTMLElement>): void {
	event.currentTarget.closest('details')?.removeAttribute('open');
}

/**
 * The legacy settings card: title with the version beside it, then the
 * language and theme dropdown buttons and the stacked favorites
 * export/import buttons. Language options are navigation links (a
 * disclosure); theme options are actions (a menu).
 */
export default function SettingsPanel({ locale = 'en', version }: SettingsPanelProps) {
	const { settings, setTheme, setLocale } = useSettings(kvLocalStorage);
	const groupId = useId();

	return (
		<div className="eq-card eq-settings">
			<div className="eq-card-body">
				<h1 className="eq-settings-title">
					{t(locale, 'settings.title')} <small className="eq-settings-version">v{version}</small>
				</h1>
				<section aria-labelledby={`${groupId}-language`}>
					<h2 id={`${groupId}-language`} className="eq-settings-label">
						{t(locale, 'settings.language')}
					</h2>
					<details className="eq-dropdown">
						<summary className="eq-btn eq-btn-primary eq-dropdown-toggle">
							<Icon icon={translateIcon} />
							{t(locale, 'design.legacy.settings.languageChange')}
						</summary>
						<ul className="eq-dropdown-menu" aria-labelledby={`${groupId}-language`}>
							<li aria-hidden="true">
								<span className="eq-dropdown-header">
									{t(locale, 'design.legacy.settings.languageChoose')}
								</span>
							</li>
							{LOCALES.map((option) => (
								<li key={option}>
									<a
										className="eq-dropdown-item"
										href={localePath(option, '/settings/')}
										lang={option}
										aria-current={option === locale ? 'true' : undefined}
										onClick={(event) => {
											setLocale(option);
											closeMenu(event);
										}}
									>
										{LOCALE_NAMES[option]}
									</a>
								</li>
							))}
						</ul>
					</details>
				</section>
				<section aria-labelledby={`${groupId}-theme`}>
					<h2 id={`${groupId}-theme`} className="eq-settings-label">
						{t(locale, 'settings.theme')}
					</h2>
					<details className="eq-dropdown">
						<summary
							className="eq-btn eq-btn-primary eq-dropdown-toggle"
							aria-haspopup="menu"
							title={t(locale, 'design.legacy.settings.themeChange')}
						>
							<Icon icon={THEME_ICONS[settings.theme]} />
							{t(locale, 'design.legacy.settings.themeChange')}
						</summary>
						<div
							className="eq-dropdown-menu"
							role="menu"
							aria-label={t(locale, 'design.legacy.settings.themeChoose')}
						>
							<span className="eq-dropdown-header" aria-hidden="true">
								{t(locale, 'design.legacy.settings.themeChoose')}
							</span>
							{THEME_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									role="menuitem"
									className="eq-dropdown-item"
									aria-current={settings.theme === option ? 'true' : undefined}
									onClick={(event) => {
										setTheme(option);
										applyTheme(option);
										closeMenu(event);
									}}
								>
									<Icon icon={THEME_ICONS[option]} /> {t(locale, THEME_LABEL_KEYS[option])}
								</button>
							))}
						</div>
					</details>
				</section>
				<section aria-labelledby={`${groupId}-favorites`}>
					<h2 id={`${groupId}-favorites`} className="eq-settings-label">
						{t(locale, 'settings.favorites')}
					</h2>
					<FavoritesTransfer locale={locale} />
				</section>
			</div>
		</div>
	);
}
