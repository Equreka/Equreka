import { converterUnits, pickUnitPair } from '@equreka/core/converter';
import { engineMessage, localizedName } from '@equreka/core/i18n';
import type { EngineError } from '@equreka/engine';
import { formatSigFigs } from '@equreka/engine/format';
import { useEffect, useMemo, useState } from 'react';
import { getEngineSlice } from '../../shared/content/artifact';
import { getUnitRegistry } from '../../shared/content/engine';
import { useLocale, useT } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { DecimalField, PickerField, type PickerOption, SwitchField } from '../../shared/ui/field';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { AppText, Lead, Muted, Title } from '../../shared/ui/text';

export interface ConverterScreenProps {
	initialMagnitude?: string | undefined;
	initialFrom?: string | undefined;
}

interface Selection {
	magnitude: string;
	showAllDimension: boolean;
	from: string;
	to: string;
}

/**
 * Opens on the kind scope (ADR 0006) and widens to the dimension scope
 * only when the preferred unit exists there alone — a magnitude-less
 * compound unit's convert link lands on a same-dimension magnitude.
 */
function selectionFor(magnitude: string, preferredFrom?: string): Selection {
	const registry = getUnitRegistry();
	const offers = (showAll: boolean): boolean =>
		converterUnits(registry, magnitude, showAll).units.some((unit) => unit.slug === preferredFrom);
	const showAllDimension = !offers(false) && offers(true);
	return scopedSelection(magnitude, showAllDimension, { from: preferredFrom });
}

function scopedSelection(
	magnitude: string,
	showAllDimension: boolean,
	preferred: { from?: string | undefined; to?: string | undefined },
): Selection {
	const { units } = converterUnits(getUnitRegistry(), magnitude, showAllDimension);
	const baseUnit = getEngineSlice().magnitudes[magnitude]?.baseUnit ?? '';
	return { magnitude, showAllDimension, ...pickUnitPair(units, baseUnit, preferred) };
}

/**
 * Mirrors the web converter: magnitude → compatible unit pair → value,
 * all through the shared engine registry over the bundled slice. Every
 * conversion runs synchronously on each keystroke; the value stays a
 * string until `Number()` at the engine boundary.
 */
export function ConverterScreen({ initialMagnitude, initialFrom }: ConverterScreenProps) {
	const locale = useLocale();
	const t = useT();
	const magnitudes = useMemo<PickerOption<string>[]>(
		() =>
			Object.values(getEngineSlice().magnitudes)
				.filter(
					(magnitude) =>
						getUnitRegistry().unitsForMagnitude(magnitude.slug, 'dimension').length > 0,
				)
				.map((magnitude) => ({ value: magnitude.slug, label: localizedName(magnitude, locale) }))
				.sort((a, b) => a.label.localeCompare(b.label)),
		[locale],
	);
	const [selection, setSelection] = useState<Selection>(() => {
		const requested =
			initialMagnitude !== undefined && getEngineSlice().magnitudes[initialMagnitude] !== undefined
				? initialMagnitude
				: (magnitudes[0]?.value ?? '');
		return selectionFor(requested, initialFrom);
	});
	const [rawValue, setRawValue] = useState('1');

	useEffect(() => {
		if (initialMagnitude === undefined) return;
		if (getEngineSlice().magnitudes[initialMagnitude] === undefined) return;
		setSelection(selectionFor(initialMagnitude, initialFrom));
	}, [initialMagnitude, initialFrom]);

	const scoped = useMemo(
		() => converterUnits(getUnitRegistry(), selection.magnitude, selection.showAllDimension),
		[selection.magnitude, selection.showAllDimension],
	);
	const units = useMemo<PickerOption<string>[]>(
		() =>
			scoped.units
				.map((unit) => ({
					value: unit.slug,
					label: localizedName(unit, locale),
					detail: unit.symbolText,
				}))
				.sort((a, b) => a.label.localeCompare(b.label)),
		[scoped, locale],
	);
	const registry = getUnitRegistry();
	const trimmed = rawValue.trim();
	const conversion =
		trimmed === '' || selection.from === '' || selection.to === ''
			? null
			: registry.convert(Number(trimmed), selection.from, selection.to);
	const exact = conversion?.ok === true && registry.isExactPath(selection.from, selection.to);
	const fromSymbol = registry.getUnit(selection.from)?.symbolText ?? '';
	const toSymbol = registry.getUnit(selection.to)?.symbolText ?? '';
	const errorMessage = (error: EngineError): string =>
		error.code === 'inputs/not-a-number'
			? t('converter.notANumber')
			: engineMessage(locale, error.code);

	return (
		<Screen>
			<VStack>
				<Title>{t('converter.title')}</Title>
				<Lead>{t('converter.lead')}</Lead>
			</VStack>
			<Card>
				<PickerField
					label={t('unit.magnitude')}
					value={selection.magnitude}
					options={magnitudes}
					onChange={(magnitude) => setSelection(selectionFor(magnitude))}
				/>
				{scoped.hiddenByKind > 0 ? (
					<SwitchField
						label={t('converter.showAllDimension', { count: scoped.hiddenByKind })}
						hint={t('converter.showAllDimensionHint')}
						value={selection.showAllDimension}
						onValueChange={(showAll) =>
							setSelection((current) => scopedSelection(current.magnitude, showAll, current))
						}
					/>
				) : null}
				<PickerField
					label={t('converter.from')}
					value={selection.from}
					options={units}
					onChange={(from) => setSelection((current) => ({ ...current, from }))}
				/>
				<PickerField
					label={t('converter.to')}
					value={selection.to}
					options={units}
					onChange={(to) => setSelection((current) => ({ ...current, to }))}
				/>
				<DecimalField label={t('table.value')} value={rawValue} onChangeText={setRawValue} />
				<HStack>
					<Button
						label={t('converter.swap')}
						onPress={() =>
							setSelection((current) => ({ ...current, from: current.to, to: current.from }))
						}
					/>
				</HStack>
			</Card>
			<Card>
				{conversion === null ? (
					<Muted>{t('converter.enterValue')}</Muted>
				) : conversion.ok ? (
					<VStack gap={1}>
						<AppText size="xl" accessibilityLiveRegion="polite">
							{trimmed} {fromSymbol} {exact ? '=' : '≈'}{' '}
							<AppText size="xl" weight="700">
								{formatSigFigs(conversion.value)}
							</AppText>{' '}
							{toSymbol}
						</AppText>
						{exact ? null : <Muted>{t('common.sigFigs')}</Muted>}
					</VStack>
				) : (
					<AppText tone="danger" accessibilityLiveRegion="assertive">
						{errorMessage(conversion.error)}
					</AppText>
				)}
			</Card>
		</Screen>
	);
}
