import { tParts } from '@equreka/core/i18n';
import { textSourceLicenseLink } from '@equreka/core/license';
import type { TextSource } from '@equreka/schema';
import { useLocale } from '../providers/equreka-provider';
import { LinkedMessage } from './link';

/**
 * One "Text adapted from …" line per credited work (ADR 0011), placed under
 * the description it credits; renders nothing when the entry credits none.
 */
export function TextSources({ sources }: { sources: readonly TextSource[] }) {
	const locale = useLocale();
	const parts = tParts(locale, 'license.textAdaptedFrom');
	return sources.map((source) => (
		<LinkedMessage
			key={source.url}
			parts={parts}
			links={{
				source: { label: source.title, url: source.url },
				license: textSourceLicenseLink(locale, source.license),
			}}
		/>
	));
}
