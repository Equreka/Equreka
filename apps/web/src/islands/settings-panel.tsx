import { type ThemeSetting, useSettings } from '@equreka/core';
import { LOCALES, type Locale, type MessageKey, t } from '@equreka/core/i18n';
import { NUMBER_FORMATS, type NumberFormat } from '@equreka/engine/format';
import { type MouseEvent, useId } from 'react';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { localePath } from '../lib/locale-paths';
import FavoritesTransfer from './favorites-transfer';
import { LegacyGlyph, type LegacyGlyphName } from './legacy-glyph';

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

/**
 * The original's `bi-light`, `bi-dark` and `bi-system` classes, which its
 * stylesheet pointed at the sun, moon and gear-wide glyphs.
 */
const THEME_GLYPHS: Record<ThemeSetting, LegacyGlyphName> = {
	system: 'gear-wide',
	light: 'sun',
	dark: 'moon',
};

const NUMBER_FORMAT_LABEL_KEYS: Record<NumberFormat, MessageKey> = {
	readable: 'settings.numberFormat.readable',
	scientific: 'settings.numberFormat.scientific',
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
 * disclosure); theme options are actions (a menu). The result-format
 * menu is a v2 addition in the theme menu's pattern; its toggle names the
 * current choice.
 */
export default function SettingsPanel({ locale = 'en', version }: SettingsPanelProps) {
	const { settings, setTheme, setLocale, setNumberFormat } = useSettings(kvLocalStorage);
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
							<LegacyGlyph name="translate" />
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
							<LegacyGlyph name={THEME_GLYPHS[settings.theme]} />
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
									<LegacyGlyph name={THEME_GLYPHS[option]} /> {t(locale, THEME_LABEL_KEYS[option])}
								</button>
							))}
						</div>
					</details>
				</section>
				<section className="eq-settings-format" aria-labelledby={`${groupId}-format`}>
					<h2 id={`${groupId}-format`} className="eq-settings-label">
						{t(locale, 'settings.numberFormat')}
					</h2>
					<details className="eq-dropdown">
						<summary className="eq-btn eq-btn-primary eq-dropdown-toggle" aria-haspopup="menu">
							<LegacyGlyph name="calculator" />
							{t(locale, NUMBER_FORMAT_LABEL_KEYS[settings.numberFormat])}
						</summary>
						<div
							className="eq-dropdown-menu"
							role="menu"
							aria-label={t(locale, 'settings.numberFormat')}
						>
							{NUMBER_FORMATS.map((option) => (
								<button
									key={option}
									type="button"
									role="menuitem"
									className="eq-dropdown-item"
									aria-current={settings.numberFormat === option ? 'true' : undefined}
									onClick={(event) => {
										setNumberFormat(option);
										closeMenu(event);
									}}
								>
									{t(locale, NUMBER_FORMAT_LABEL_KEYS[option])}
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
