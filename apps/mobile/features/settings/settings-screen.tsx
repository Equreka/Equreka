import type { ThemeSetting } from '@equreka/core';
import { LOCALES, type Locale, tParts } from '@equreka/core/i18n';
import {
	CODE_LICENSE,
	CONTENT_ATTRIBUTION,
	CONTENT_LICENSE,
	REPOSITORY_LINK,
} from '@equreka/core/license';
import Constants from 'expo-constants';
import { useEqureka, useLocale, useT } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { LinkedMessage } from '../../shared/ui/link';
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

/**
 * The License card (ADR 0011), the same three lines as the web settings
 * page: content license with the attribution reusers give, code license,
 * and the repository holding the license texts.
 */
function LicenseCard() {
	const locale = useLocale();
	const t = useT();
	return (
		<Card>
			<SectionTitle>{t('license.title')}</SectionTitle>
			<LinkedMessage
				parts={tParts(locale, 'license.content')}
				links={{ license: CONTENT_LICENSE }}
				texts={{ attribution: CONTENT_ATTRIBUTION }}
			/>
			<LinkedMessage parts={tParts(locale, 'license.code')} links={{ license: CODE_LICENSE }} />
			<LinkedMessage
				parts={tParts(locale, 'license.repository')}
				links={{ repository: REPOSITORY_LINK }}
			/>
		</Card>
	);
}

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
			<LicenseCard />
			{version === '' ? null : (
				<Muted>
					{t('settings.version')}: v{version}
				</Muted>
			)}
		</Screen>
	);
}
