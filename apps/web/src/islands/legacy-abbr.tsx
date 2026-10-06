import { type Locale, type MessageKey, t } from '@equreka/core/i18n';

/**
 * Terms the original abbreviated (`abbreviations.*` in its language
 * files); any other term renders its full label at every width.
 */
const ABBREVIATION_KEYS: Readonly<Record<string, MessageKey>> = {
	universal: 'design.legacy.abbr.universal',
	mathematics: 'design.legacy.abbr.mathematics',
	physics: 'design.legacy.abbr.physics',
	chemistry: 'design.legacy.abbr.chemistry',
	symbol: 'design.legacy.abbr.symbol',
};

export interface LegacyAbbrProps {
	term: string;
	label: string;
	locale: Locale;
}

/**
 * The original `Abbr`: the short code below 768px, the full label from
 * 768px. Unlike the original, the full label stays in the accessibility
 * tree at every width (visually hidden below 768px) and the code is
 * aria-hidden, so assistive technology never announces the code.
 */
export function LegacyAbbr({ term, label, locale }: LegacyAbbrProps) {
	const key = ABBREVIATION_KEYS[term];
	if (key === undefined) return <>{label}</>;
	return (
		<span className="eq-legacy-abbr">
			<span className="eq-legacy-abbr-short" aria-hidden="true">
				<abbr title={label}>{t(locale, key)}</abbr>
			</span>
			<span className="eq-legacy-abbr-full">{label}</span>
		</span>
	);
}
