import { localizedName } from '@equreka/core/i18n';
import { formatSigFigs } from '@equreka/engine/format';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { getSummary } from '../../entities/content/lookup';
import { converterHref, entryHref } from '../../entities/content/routes';
import type { PresentationUnit } from '../../entities/content/types';
import { getUnitRegistry } from '../../shared/content/engine';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Row } from '../../shared/ui/card';
import { VStack } from '../../shared/ui/screen';
import { Muted, SectionTitle } from '../../shared/ui/text';

export interface UnitDetailsProps {
	slug: string;
	unit: PresentationUnit;
}

interface ConversionRow {
	slug: string;
	name: string;
	symbolText: string;
	value: string;
	exact: boolean;
}

/**
 * Magnitudes the unit measures, then "1 <unit> =" in every compatible unit
 * computed by the engine registry over the bundled slice — nonConvertible
 * units have no registry entry and show no table.
 */
export function UnitDetails({ slug, unit }: UnitDetailsProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const conversions = useMemo<ConversionRow[]>(() => {
		const registry = getUnitRegistry();
		if (registry.getUnit(slug) === undefined) return [];
		return registry
			.compatibleUnits(slug)
			.filter((other) => other.slug !== slug)
			.map((other) => {
				const converted = registry.convert(1, slug, other.slug);
				return {
					slug: other.slug,
					name: localizedName(other, locale),
					symbolText: other.symbolText,
					value: converted.ok ? formatSigFigs(converted.value) : '—',
					exact: registry.isExactPath(slug, other.slug),
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [slug, locale]);
	const magnitudes = unit.unitOf
		.map((magnitudeSlug) => getSummary('magnitudes', magnitudeSlug, locale))
		.filter((summary) => summary !== undefined);
	return (
		<>
			<VStack>
				<SectionTitle>{t('unit.magnitudes')}</SectionTitle>
				<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
					{magnitudes.map((magnitude) => (
						<Row
							key={magnitude.slug}
							title={magnitude.name}
							subtitle={magnitude.symbolText}
							onPress={() => router.push(entryHref('magnitudes', magnitude.slug))}
						/>
					))}
				</View>
			</VStack>
			{conversions.length === 0 ? null : (
				<VStack>
					<SectionTitle>{t('conversions.title')}</SectionTitle>
					<Muted>{t('conversions.lead', { symbol: unit.symbolText })}</Muted>
					<Button
						label={t('unit.convert', { name: localizedName(unit, locale) })}
						variant="primary"
						onPress={() => router.push(converterHref(unit.unitOf[0], slug))}
					/>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						{conversions.map((row) => (
							<Row
								key={row.slug}
								title={row.name}
								subtitle={row.symbolText}
								detail={`${row.exact ? '=' : '≈'} ${row.value} ${row.symbolText}`}
								onPress={() => router.push(entryHref('units', row.slug))}
							/>
						))}
					</View>
				</VStack>
			)}
		</>
	);
}
