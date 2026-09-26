import { collectionLabel, localizedName, type MessageKey } from '@equreka/core/i18n';
import { View } from 'react-native';
import { getEntry } from '../../entities/content/lookup';
import { isEntryCollection } from '../../entities/content/routes';
import { pickSegments } from '../../entities/content/text';
import type { PresentationEntry } from '../../entities/content/types';
import { MathSvg, RichText } from '../../shared/math/math-view';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { categoryColor } from '../../shared/theme/theme';
import { Badge } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { Muted, Title } from '../../shared/ui/text';
import { FavoriteButton } from '../favorites/favorite-button';
import { ConstantDetails } from './constant-details';
import { EquationDetails } from './equation-details';
import { MagnitudeDetails } from './magnitude-details';
import { PrefixDetails } from './prefix-details';
import { UnitDetails } from './unit-details';
import { VariableDetails } from './variable-details';

export interface EntryScreenProps {
	collection: string;
	slug: string;
}

function badgesOf(entry: PresentationEntry, t: (key: MessageKey) => string): string[] {
	switch (entry.collection) {
		case 'units':
			return [t(`system.${entry.entity.system}`)];
		case 'constants':
			return [t(entry.entity.exact ? 'badge.exact' : 'badge.measured')];
		case 'magnitudes':
			return Object.values(entry.entity.dimension).every((exponent) => exponent === 0)
				? [t('badge.dimensionless')]
				: [];
		case 'equations':
			return [t(`kind.${entry.entity.kind}`)];
		default:
			return [];
	}
}

function DetailsOf({ entry }: { entry: PresentationEntry }) {
	switch (entry.collection) {
		case 'units':
			return <UnitDetails slug={entry.slug} unit={entry.entity} />;
		case 'magnitudes':
			return <MagnitudeDetails slug={entry.slug} magnitude={entry.entity} />;
		case 'constants':
			return <ConstantDetails constant={entry.entity} />;
		case 'prefixes':
			return <PrefixDetails prefix={entry.entity} />;
		case 'equations':
			return <EquationDetails slug={entry.slug} equation={entry.entity} />;
		case 'variables':
			return <VariableDetails variable={entry.entity} />;
		default:
			return null;
	}
}

/**
 * The generic wiki page and the deep-link target: header (name, atlas
 * symbol, badges, favorite), localized description through the math
 * tiering, then the collection-specific engine-derived block.
 */
export function EntryScreen({ collection, slug }: EntryScreenProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const entry = isEntryCollection(collection) ? getEntry(collection, slug) : undefined;
	if (entry === undefined) {
		return (
			<Screen>
				<Muted>{t('mobile.entry.notFound')}</Muted>
			</Screen>
		);
	}
	const { entity } = entry;
	const symbolTex = 'symbolTex' in entity ? entity.symbolTex : undefined;
	const description = pickSegments(entity.descriptionSegments, locale);
	const categories = 'categories' in entity ? entity.categories : [];
	return (
		<Screen>
			<VStack>
				<HStack style={{ justifyContent: 'space-between' }}>
					<View style={{ flex: 1 }}>
						<Title>{localizedName(entity, locale)}</Title>
					</View>
					<FavoriteButton collection={entry.collection} slug={entry.slug} />
				</HStack>
				{symbolTex === undefined ? null : <MathSvg tex={symbolTex} size="3xl" scroll />}
				<HStack gap={1.5}>
					<Badge label={collectionLabel(locale, entry.collection)} color={theme.color.accent} />
					{badgesOf(entry, t).map((label) => (
						<Badge key={label} label={label} />
					))}
					{categories.map((category) => (
						<Badge key={category} label={category} color={categoryColor(theme, category)} />
					))}
				</HStack>
			</VStack>
			{description === undefined ? null : (
				<VStack>
					<RichText segments={description.segments} />
					{description.untranslated ? <Muted>{t('badge.untranslated')}</Muted> : null}
				</VStack>
			)}
			<DetailsOf entry={entry} />
		</Screen>
	);
}
