import type { MessagePart } from '@equreka/core/i18n';
import type { LicenseLink } from '@equreka/core/license';
import { Linking } from 'react-native';
import type { TextSize } from '../theme/theme';
import { AppText, type TextTone } from './text';

export interface LinkedMessageProps {
	parts: readonly MessagePart[];
	links: Readonly<Record<string, LicenseLink>>;
	texts?: Readonly<Record<string, string>>;
	size?: TextSize;
	tone?: TextTone;
}

/**
 * Hands the URL to the system browser: the app itself stays offline, and a
 * device that cannot open it has nothing better to fall back to.
 */
function openExternal(url: string): void {
	Linking.openURL(url).catch(() => undefined);
}

/**
 * A localized template from `tParts` as one wrapping Text run: text parts
 * as written, a param named in `texts` as plain text, any other param as
 * an underlined external link.
 */
export function LinkedMessage({
	parts,
	links,
	texts = {},
	size = 'sm',
	tone = 'muted',
}: LinkedMessageProps) {
	return (
		<AppText size={size} tone={tone}>
			{parts.map((part) => {
				if (part.kind === 'text') return part.text;
				const text = texts[part.name];
				if (text !== undefined) return text;
				const link = links[part.name];
				if (link === undefined) return `{${part.name}}`;
				return (
					<AppText
						key={part.name}
						size={size}
						tone="accent"
						accessibilityRole="link"
						style={{ textDecorationLine: 'underline' }}
						onPress={() => openExternal(link.url)}
					>
						{link.label}
					</AppText>
				);
			})}
		</AppText>
	);
}
