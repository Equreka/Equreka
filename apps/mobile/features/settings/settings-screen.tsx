import type { ThemeSetting } from '@equreka/core';
import { LOCALES, type Locale } from '@equreka/core/i18n';
import Constants from 'expo-constants';
import { useEqureka } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { Lead, Muted, SectionTitle, Title } from '../../shared/ui/text';
import { TransferControls } from './transfer-controls';

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

export function SettingsScreen() {
	const { settings, t } = useEqureka();
	const version = Constants.expoConfig?.version ?? '';
	return (
		<Screen>
			<VStack>
				<Title>{t('settings.title')}</Title>
				<Lead>{t('settings.lead')}</Lead>
			</VStack>
			<Card>
				<SectionTitle>{t('settings.theme')}</SectionTitle>
				<HStack>
					{THEME_OPTIONS.map((option) => (
						<Button
							key={option}
							label={t(THEME_LABEL_KEYS[option])}
							selected={settings.settings.theme === option}
							onPress={() => settings.setTheme(option)}
						/>
					))}
				</HStack>
			</Card>
			<Card>
				<SectionTitle>{t('settings.language')}</SectionTitle>
				<HStack>
					{LOCALES.map((option) => (
						<Button
							key={option}
							label={LOCALE_NAMES[option]}
							selected={settings.settings.locale === option}
							onPress={() => settings.setLocale(option)}
						/>
					))}
				</HStack>
			</Card>
			<Card>
				<SectionTitle>{t('settings.favorites')}</SectionTitle>
				<TransferControls />
			</Card>
			{version === '' ? null : (
				<Muted>
					{t('settings.version')}: v{version}
				</Muted>
			)}
		</Screen>
	);
}
