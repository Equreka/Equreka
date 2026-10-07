import { texToFallbackText } from '@equreka/content/plain-symbol';
import {
	type CalculatorUnitSource,
	solveInUnits,
	type UseCalculatorUnits,
	useCalculatorUnits,
} from '@equreka/core/hooks/use-calculator-units';
import {
	ENGINE_HINT_CODES,
	engineErrorMessage,
	type Locale,
	localizedName,
	pickLocalized,
} from '@equreka/core/i18n';
import { formatResult, formatSigFigs, READABLE_SIG_FIGS, resultText } from '@equreka/engine/format';
import type { CompiledEquationMeta } from '@equreka/schema';
import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { entryHref } from '../../entities/content/routes';
import { getEngineSlice, getPresentation, getSolutions } from '../../shared/content/artifact';
import { getUnitRegistry } from '../../shared/content/engine';
import { MathSvg } from '../../shared/math/math-view';
import type { RuntimeMath } from '../../shared/math/runtime-mathjax';
import { useEqureka, useLocale, useT } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { DecimalField, SwitchField } from '../../shared/ui/field';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { AppText, Lead, Muted, Title } from '../../shared/ui/text';
import { buildSolvedForm } from './solved-form';
import { SolvedFormView } from './solved-form-view';
import { UnitChips } from './unit-chips';

export interface CalculatorScreenProps {
	slug: string;
	renderer?: RuntimeMath | undefined;
}

/**
 * One editable term: `unitTex` is the canonical TeX of the term's unit
 * (magnitude → baseUnit, variable → defaultUnit, symbol → its unit) so the
 * field decoration and the result line render the symbol from the atlas.
 * `symbolText` is the term key as plain text (`\theta` → θ), since a field
 * label is plain text and raw TeX would read as source. `solvable` is
 * false for a term the calculator never leaves unknown, which the reader
 * must fill.
 */
interface CalculatorField {
	key: string;
	label: string;
	symbolText: string;
	solvable: boolean;
	unitTex: string;
	unitText: string;
}

interface CalculatorConstant {
	key: string;
	name: string;
	symbolText: string;
	value: string;
	unitText: string;
}

interface CalculatorModel {
	meta: CompiledEquationMeta;
	fields: CalculatorField[];
	constants: CalculatorConstant[];
	nonNegative: Set<string>;
}

function unitOf(slug: string | undefined): { tex: string; text: string } {
	const unit = slug === undefined ? undefined : getPresentation('units')[slug];
	return unit === undefined
		? { tex: '', text: '' }
		: { tex: unit.symbolTex, text: unit.symbolText };
}

function buildModel(slug: string, locale: Locale): CalculatorModel | undefined {
	const slice = getEngineSlice();
	const meta = slice.equations[slug];
	if (meta === undefined || !meta.calculatorEnabled) return undefined;
	const fields: CalculatorField[] = [];
	const constants: CalculatorConstant[] = [];
	const nonNegative = new Set<string>();
	const field = (key: string, label: string, unit: { tex: string; text: string }) => ({
		key,
		label,
		symbolText: texToFallbackText(key),
		solvable: meta.solvable.includes(key),
		unitTex: unit.tex,
		unitText: unit.text,
	});
	for (const [key, term] of Object.entries(meta.terms)) {
		switch (term.kind) {
			case 'constant': {
				const constant = term.ref === undefined ? undefined : slice.constants[term.ref];
				if (constant === undefined) break;
				constants.push({
					key,
					name: localizedName(constant, locale),
					symbolText: constant.symbolText,
					value: constant.value,
					unitText: unitOf(constant.unit).text,
				});
				break;
			}
			case 'magnitude': {
				const magnitude = term.ref === undefined ? undefined : slice.magnitudes[term.ref];
				if (magnitude?.nonNegative) nonNegative.add(key);
				fields.push(
					field(
						key,
						magnitude === undefined ? key : localizedName(magnitude, locale),
						unitOf(magnitude?.baseUnit),
					),
				);
				break;
			}
			case 'variable': {
				const variable =
					term.ref === undefined ? undefined : getPresentation('variables')[term.ref];
				fields.push(
					field(
						key,
						variable === undefined ? key : localizedName(variable, locale),
						unitOf(variable?.defaultUnit),
					),
				);
				break;
			}
			case 'symbol': {
				fields.push(
					field(
						key,
						term.label === undefined ? key : pickLocalized(term.label, locale).value,
						unitOf(term.unit),
					),
				);
				break;
			}
		}
	}
	return { meta, fields, constants, nonNegative };
}

function UnitSymbol({ tex }: { tex: string }) {
	if (tex === '') return null;
	return <MathSvg tex={tex} size="sm" />;
}

/**
 * A term's unit TeX: the selected unit's atlas symbol, or the build-time
 * base-unit symbol when the selection has none.
 */
function selectedUnitTex(unitState: UseCalculatorUnits, key: string, fallback: string): string {
	const tex = unitOf(unitState.unitFor(key)).tex;
	return tex === '' ? fallback : tex;
}

/**
 * The engine slice and presentation variables are bundled, so the unit
 * source exists synchronously and pickers render on first paint.
 */
function useUnitSource(): CalculatorUnitSource {
	return useMemo(
		() => ({
			registry: getUnitRegistry(),
			magnitudes: getEngineSlice().magnitudes,
			variables: getPresentation('variables'),
		}),
		[],
	);
}

/**
 * Fill-all-but-one solver over the codegen'd solutions module: constants
 * inject automatically, each input converts from its picked unit to the
 * term's base unit before solving, and the result converts to its own
 * picked unit ('≈' when a factor on the path is inexact). The solved form
 * (symbolic, then with the knowns substituted) is typeset on device by the
 * runtime MathJax leg (ADR 0005) and always substitutes base-unit values,
 * because the authored solution is written in base units; `renderer` is
 * injectable for tests and defaults to the app-wide singleton. The result
 * and its roots print in the reader's `numberFormat` setting.
 */
export function CalculatorScreen({ slug, renderer }: CalculatorScreenProps) {
	const locale = useLocale();
	const t = useT();
	const model = useMemo(() => buildModel(slug, locale), [slug, locale]);
	if (model === undefined) {
		return (
			<Screen>
				<Muted>{t('mobile.entry.notFound')}</Muted>
			</Screen>
		);
	}
	return <CalculatorForm slug={slug} model={model} renderer={renderer} />;
}

interface CalculatorFormProps {
	slug: string;
	model: CalculatorModel;
	renderer?: RuntimeMath | undefined;
}

function CalculatorForm({ slug, model, renderer }: CalculatorFormProps) {
	const locale = useLocale();
	const t = useT();
	const router = useRouter();
	const { numberFormat } = useEqureka().settings.settings;
	const [values, setValues] = useState<Record<string, string>>({});
	const { meta, fields, constants, nonNegative } = model;
	const unitState = useCalculatorUnits(meta, useUnitSource());
	const constantValues = useMemo(
		() => Object.fromEntries(constants.map((constant) => [constant.key, constant.value])),
		[constants],
	);
	const { outcome: result, literals } = solveInUnits(
		meta,
		getSolutions(),
		{
			fields: fields.map((field) => field.key),
			raw: values,
			constants: constantValues,
			selected: unitState.selected,
			nonNegative,
		},
		unitState.units,
	);
	const solved =
		result?.ok === true ? fields.find((field) => field.key === result.value.symbol) : undefined;
	const presentation = getPresentation('equations')[slug];
	const expressionTex = presentation?.expressionTex;
	const solvedForm =
		result?.ok === true
			? buildSolvedForm(
					meta,
					presentation?.solutions ?? {},
					result.value.symbol,
					literals,
					result.value.root,
				)
			: null;
	const nonBaseSelected = Object.entries(unitState.selected).some(
		([key, unit]) => unit !== unitState.units?.baseUnit(key),
	);
	const resultOptions =
		result?.ok === true ? unitState.optionsFor(result.value.symbol).units : undefined;
	const termName = (key: string): string =>
		fields.find((field) => field.key === key)?.symbolText ?? key;
	const solvableOnly = fields.some((field) => !field.solvable)
		? fields
				.filter((field) => field.solvable)
				.map((field) => field.symbolText)
				.join(', ')
		: '';
	const errorMessage =
		result?.ok === false ? engineErrorMessage(locale, result.error, termName) : '';

	return (
		<Screen>
			<VStack>
				<Title>{t('calculator.pageTitle', { name: localizedName(meta, locale) })}</Title>
				{expressionTex === undefined ? null : <MathSvg tex={expressionTex} size="xl" scroll />}
				<Lead>{t('calculator.hint')}</Lead>
				{solvableOnly === '' ? null : (
					<Muted>{t('calculator.solvableOnly', { terms: solvableOnly })}</Muted>
				)}
				<HStack>
					<Button
						label={t('calculator.leadLink')}
						variant="ghost"
						onPress={() => router.push(entryHref('equations', slug))}
					/>
				</HStack>
			</VStack>
			<Card>
				{fields.map((field) => {
					const { units: offered, hiddenByKind } = unitState.optionsFor(field.key);
					const name = `${field.label} (${field.symbolText})`;
					return (
						<Fragment key={field.key}>
							<DecimalField
								label={name}
								value={values[field.key] ?? ''}
								onChangeText={(text) =>
									setValues((previous) => ({ ...previous, [field.key]: text }))
								}
								placeholder={t(field.solvable ? 'calculator.placeholder' : 'calculator.required')}
								unit={<UnitSymbol tex={selectedUnitTex(unitState, field.key, field.unitTex)} />}
							/>
							{offered.length > 1 ? (
								<UnitChips
									label={t('calculator.unitFor', { name })}
									units={offered}
									value={unitState.unitFor(field.key)}
									locale={locale}
									onChange={(unit) => unitState.select(field.key, unit)}
								/>
							) : null}
							{hiddenByKind > 0 ? (
								<SwitchField
									label={t('converter.showAllDimension', { count: hiddenByKind })}
									hint={t('converter.showAllDimensionHint')}
									value={unitState.showAllFor(field.key)}
									onValueChange={(showAll) => unitState.setShowAll(field.key, showAll)}
								/>
							) : null}
						</Fragment>
					);
				})}
				<HStack>
					<Button label={t('calculator.reset')} onPress={() => setValues({})} />
				</HStack>
				{constants.length === 0 ? null : (
					<Muted>
						{t('calculator.autoFilled')}{' '}
						{constants
							.map(
								(constant) =>
									`${constant.name} ${constant.symbolText} = ${formatSigFigs(Number(constant.value))}${constant.unitText === '' ? '' : ` ${constant.unitText}`}`,
							)
							.join(', ')}
					</Muted>
				)}
			</Card>
			<Card>
				{result === null ? (
					<Muted>{t('calculator.hint')}</Muted>
				) : result.ok ? (
					<VStack gap={1}>
						<HStack gap={1.5}>
							<AppText size="xl" accessibilityLiveRegion="polite">
								{solved?.label ?? result.value.symbol} ({termName(result.value.symbol)}){' '}
								{result.value.exact ? '=' : '≈'}{' '}
								<AppText size="xl" weight="700">
									{resultText(formatResult(result.value.value, numberFormat))}
								</AppText>
							</AppText>
							{solved === undefined ? null : (
								<UnitSymbol tex={selectedUnitTex(unitState, solved.key, solved.unitTex)} />
							)}
						</HStack>
						{resultOptions !== undefined && resultOptions.length > 1 ? (
							<UnitChips
								label={t('calculator.resultUnit')}
								units={resultOptions}
								value={unitState.unitFor(result.value.symbol)}
								locale={locale}
								onChange={(unit) => unitState.select(result.value.symbol, unit)}
							/>
						) : null}
						<Muted>
							{numberFormat === 'readable'
								? t('calculator.precision.readable', { count: READABLE_SIG_FIGS })
								: t('calculator.precision.scientific')}
						</Muted>
						{solvedForm === null ? null : <SolvedFormView lines={solvedForm} renderer={renderer} />}
						{solvedForm !== null && nonBaseSelected ? (
							<Muted>{t('calculator.solvedFormBaseUnits')}</Muted>
						) : null}
						{result.value.allRoots !== undefined && result.value.allRoots.length > 1 ? (
							<Muted>
								{t('calculator.allRoots', {
									roots: result.value.allRoots
										.map((root) => resultText(formatResult(root, numberFormat)))
										.join(', '),
								})}
							</Muted>
						) : null}
					</VStack>
				) : ENGINE_HINT_CODES.has(result.error.code) ? (
					<Muted>{errorMessage}</Muted>
				) : (
					<AppText tone="danger" accessibilityLiveRegion="assertive">
						{errorMessage}
					</AppText>
				)}
			</Card>
		</Screen>
	);
}
