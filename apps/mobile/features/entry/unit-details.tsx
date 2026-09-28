import { type Locale, localizedName, tParts } from '@equreka/core/i18n';
import { formatSigFigs } from '@equreka/engine/format';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { getSummary } from '../../entities/content/lookup';
import { converterHref, entryHref } from '../../entities/content/routes';
import type { PresentationUnit } from '../../entities/content/types';
import { getEngineSlice } from '../../shared/content/artifact';
import { getUnitRegistry } from '../../shared/content/engine';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Row } from '../../shared/ui/card';
import { VStack } from '../../shared/ui/screen';
import { AppText, Muted, SectionTitle } from '../../shared/ui/text';

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
 * The magnitude the converter opens on: the first authored one, or — for a
 * magnitude-less compound unit — the first magnitude (by slug) sharing its
 * dimension. Undefined when none does, and the unit offers no converter.
 */
function converterMagnitudeOf(slug: string, unitOf: readonly string[]): string | undefined {
	const first = unitOf[0];
	if (first !== undefined) return first;
	const slice = getEngineSlice();
	const dimension = slice.units[slug]?.dimension;
	if (dimension === undefined) return undefined;
	return Object.values(slice.magnitudes)
		.filter((magnitude) => magnitude.dimension.every((value, index) => value === dimension[index]))
		.map((magnitude) => magnitude.slug)
		.sort()[0];
}

/**
 * "Derived from <base> with the SI prefix <prefix>." for a prefixed unit,
 * each name a link to its entry; the sentence order is the locale's.
 */
function DerivationLine({
	prefixOf,
	locale,
}: {
	prefixOf: NonNullable<PresentationUnit['prefixOf']>;
	locale: Locale;
}) {
	const router = useRouter();
	const base = getSummary('units', prefixOf.base, locale);
	const prefix = getSummary('prefixes', prefixOf.prefix, locale);
	const links = {
		base: {
			label: base?.name ?? prefixOf.base,
			href: entryHref('units', prefixOf.base),
		},
		prefix: {
			label: (prefix?.name ?? prefixOf.prefix).toLocaleLowerCase(locale),
			href: entryHref('prefixes', prefixOf.prefix),
		},
	};
	return (
		<AppText size="sm" tone="muted">
			{tParts(locale, 'unit.derivedFrom').map((part, index) => {
				if (part.kind === 'text') return part.text;
				const link = part.name === 'base' ? links.base : links.prefix;
				return (
					<AppText
						key={`${part.name}-${index}`}
						size="sm"
						tone="accent"
						accessibilityRole="link"
						onPress={() => router.push(link.href)}
					>
						{link.label}
					</AppText>
				);
			})}
		</AppText>
	);
}

/**
 * Magnitudes the unit measures (a compound unit states it has none), then
 * "1 <unit> =" in every compatible unit computed by the engine registry
 * over the bundled slice — nonConvertible units have no registry entry and
 * show no table.
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
	const converterMagnitude = converterMagnitudeOf(slug, unit.unitOf);
	return (
		<>
			{unit.prefixOf === undefined ? null : (
				<DerivationLine prefixOf={unit.prefixOf} locale={locale} />
			)}
			<VStack>
				<SectionTitle>
					{magnitudes.length > 1 ? t('unit.magnitudes') : t('unit.magnitude')}
				</SectionTitle>
				{unit.unitOf.length === 0 ? (
					<Muted>{t('unit.compoundHint')}</Muted>
				) : (
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
				)}
			</VStack>
			{conversions.length === 0 ? null : (
				<VStack>
					<SectionTitle>{t('conversions.title')}</SectionTitle>
					<Muted>{t('conversions.lead', { symbol: unit.symbolText })}</Muted>
					{converterMagnitude === undefined ? null : (
						<Button
							label={t('unit.convert', { name: localizedName(unit, locale) })}
							variant="primary"
							onPress={() => router.push(converterHref(converterMagnitude, slug))}
						/>
					)}
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
