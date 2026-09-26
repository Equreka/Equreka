import { localizedName } from '@equreka/core/i18n';
import { formatSigFigs } from '@equreka/engine/format';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { getSummary } from '../../entities/content/lookup';
import { formatDimension } from '../../entities/content/notation';
import { converterHref, entryHref } from '../../entities/content/routes';
import type { PresentationMagnitude } from '../../entities/content/types';
import { getEngineSlice } from '../../shared/content/artifact';
import { getUnitRegistry } from '../../shared/content/engine';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Row } from '../../shared/ui/card';
import { VStack } from '../../shared/ui/screen';
import { AppText, Muted, SectionTitle } from '../../shared/ui/text';

export interface MagnitudeDetailsProps {
	slug: string;
	magnitude: PresentationMagnitude;
}

interface UnitRow {
	slug: string;
	name: string;
	symbolText: string;
	factor: string;
	exact: boolean;
	isBase: boolean;
}

/**
 * Dimension vector from the engine slice (build-verified by composition,
 * ADR 0003), the base unit, and every unit of the same dimension with its
 * engine-computed factor to that base.
 */
export function MagnitudeDetails({ slug, magnitude }: MagnitudeDetailsProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const compiled = getEngineSlice().magnitudes[slug];
	const units = useMemo<UnitRow[]>(() => {
		if (compiled === undefined) return [];
		const registry = getUnitRegistry();
		return registry
			.compatibleUnits(compiled.dimension)
			.map((unit) => {
				const converted = registry.convert(1, unit.slug, compiled.baseUnit);
				return {
					slug: unit.slug,
					name: localizedName(unit, locale),
					symbolText: unit.symbolText,
					factor: converted.ok ? formatSigFigs(converted.value) : '—',
					exact: registry.isExactPath(unit.slug, compiled.baseUnit),
					isBase: unit.slug === compiled.baseUnit,
				};
			})
			.sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.name.localeCompare(b.name));
	}, [compiled, locale]);
	const base = getSummary('units', magnitude.baseUnit, locale);
	const dimension = compiled === undefined ? '' : formatDimension(compiled.dimension);
	return (
		<>
			<VStack>
				<SectionTitle>{t('table.dimension')}</SectionTitle>
				<AppText mono>{dimension === '' ? t('badge.dimensionless') : dimension}</AppText>
				{magnitude.nonNegative ? <Muted>{t('magnitude.nonNegative')}</Muted> : null}
			</VStack>
			{base === undefined ? null : (
				<VStack>
					<SectionTitle>{t('table.baseUnit')}</SectionTitle>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						<Row
							title={base.name}
							subtitle={base.symbolText}
							onPress={() => router.push(entryHref('units', base.slug))}
						/>
					</View>
				</VStack>
			)}
			{units.length === 0 ? null : (
				<VStack>
					<SectionTitle>
						{t('magnitude.unitsOf', { name: localizedName(magnitude, locale) })}
					</SectionTitle>
					<Muted>{t('magnitude.unitsLead')}</Muted>
					<Button
						label={t('converter.title')}
						variant="primary"
						onPress={() => router.push(converterHref(slug))}
					/>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						{units.map((unit) => (
							<Row
								key={unit.slug}
								title={unit.name}
								subtitle={unit.symbolText}
								detail={
									unit.isBase
										? t('conversions.baseUnit')
										: `${unit.exact ? '=' : '≈'} ${unit.factor} ${base?.symbolText ?? ''}`
								}
								onPress={() => router.push(entryHref('units', unit.slug))}
							/>
						))}
					</View>
				</VStack>
			)}
		</>
	);
}
