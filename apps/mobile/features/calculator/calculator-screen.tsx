import {
	ENGINE_HINT_CODES,
	engineMessage,
	type Locale,
	localizedName,
	pickLocalized,
} from '@equreka/core/i18n';
import { formatSigFigs } from '@equreka/engine/format';
import { type KnownValue, solveEquation } from '@equreka/engine/solutions';
import type { CompiledEquationMeta } from '@equreka/schema';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { entryHref } from '../../entities/content/routes';
import { getEngineSlice, getPresentation, getSolutions } from '../../shared/content/artifact';
import { MathSvg } from '../../shared/math/math-view';
import type { RuntimeMath } from '../../shared/math/runtime-mathjax';
import { useLocale, useT } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { DecimalField } from '../../shared/ui/field';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { AppText, Lead, Muted, Title } from '../../shared/ui/text';
import { buildSolvedForm } from './solved-form';
import { SolvedFormView } from './solved-form-view';

export interface CalculatorScreenProps {
	slug: string;
	renderer?: RuntimeMath | undefined;
}

/**
 * One editable term: `unitTex` is the canonical TeX of the term's unit
 * (magnitude → baseUnit, variable → defaultUnit, symbol → its unit) so the
 * field decoration and the result line render the symbol from the atlas.
 */
interface CalculatorField {
	key: string;
	label: string;
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
				const unit = unitOf(magnitude?.baseUnit);
				fields.push({
					key,
					label: magnitude === undefined ? key : localizedName(magnitude, locale),
					unitTex: unit.tex,
					unitText: unit.text,
				});
				break;
			}
			case 'variable': {
				const variable =
					term.ref === undefined ? undefined : getPresentation('variables')[term.ref];
				const unit = unitOf(variable?.defaultUnit);
				fields.push({
					key,
					label: variable === undefined ? key : localizedName(variable, locale),
					unitTex: unit.tex,
					unitText: unit.text,
				});
				break;
			}
			case 'symbol': {
				const unit = unitOf(term.unit);
				fields.push({
					key,
					label: term.label === undefined ? key : pickLocalized(term.label, locale).value,
					unitTex: unit.tex,
					unitText: unit.text,
				});
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
 * Fill-all-but-one solver over the codegen'd solutions module: constants
 * inject automatically, inputs are parsed at the engine boundary, and the
 * result carries the solved term's unit symbol from the atlas. The solved
 * form (symbolic, then with the knowns substituted) is typeset on device
 * by the runtime MathJax leg (ADR 0005); `renderer` is injectable for
 * tests and defaults to the app-wide singleton.
 */
export function CalculatorScreen({ slug, renderer }: CalculatorScreenProps) {
	const locale = useLocale();
	const t = useT();
	const router = useRouter();
	const model = useMemo(() => buildModel(slug, locale), [slug, locale]);
	const [values, setValues] = useState<Record<string, string>>({});
	if (model === undefined) {
		return (
			<Screen>
				<Muted>{t('mobile.entry.notFound')}</Muted>
			</Screen>
		);
	}
	const { meta, fields, constants, nonNegative } = model;
	const knowns: Record<string, KnownValue> = {};
	const literals: Record<string, string> = {};
	for (const field of fields) {
		const raw = (values[field.key] ?? '').trim();
		if (raw === '') {
			knowns[field.key] = '';
			continue;
		}
		const parsed = Number(raw);
		knowns[field.key] = parsed;
		if (Number.isFinite(parsed)) literals[field.key] = String(parsed);
	}
	for (const constant of constants) {
		knowns[constant.key] = Number(constant.value);
		literals[constant.key] = constant.value;
	}
	const anyInput = fields.some((field) => (values[field.key] ?? '').trim() !== '');
	const result = anyInput ? solveEquation(meta, getSolutions(), knowns, { nonNegative }) : null;
	const solved =
		result?.ok === true ? fields.find((field) => field.key === result.value.symbol) : undefined;
	const presentation = getPresentation('equations')[slug];
	const expressionTex = presentation?.expressionTex;
	const solvedForm =
		result?.ok === true
			? buildSolvedForm(meta, presentation?.solutions ?? {}, result.value.symbol, literals)
			: null;

	return (
		<Screen>
			<VStack>
				<Title>{t('calculator.pageTitle', { name: localizedName(meta, locale) })}</Title>
				{expressionTex === undefined ? null : <MathSvg tex={expressionTex} size="xl" scroll />}
				<Lead>{t('calculator.hint')}</Lead>
				<HStack>
					<Button
						label={t('calculator.leadLink')}
						variant="ghost"
						onPress={() => router.push(entryHref('equations', slug))}
					/>
				</HStack>
			</VStack>
			<Card>
				{fields.map((field) => (
					<DecimalField
						key={field.key}
						label={`${field.label} (${field.key})`}
						value={values[field.key] ?? ''}
						onChangeText={(text) => setValues((previous) => ({ ...previous, [field.key]: text }))}
						placeholder={t('calculator.placeholder')}
						unit={<UnitSymbol tex={field.unitTex} />}
					/>
				))}
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
								{solved?.label ?? result.value.symbol} ({result.value.symbol}) ={' '}
								<AppText size="xl" weight="700">
									{formatSigFigs(result.value.value)}
								</AppText>
							</AppText>
							{solved === undefined ? null : <UnitSymbol tex={solved.unitTex} />}
						</HStack>
						<Muted>{t('common.sigFigs')}</Muted>
						{solvedForm === null ? null : <SolvedFormView lines={solvedForm} renderer={renderer} />}
						{result.value.allRoots !== undefined && result.value.allRoots.length > 1 ? (
							<Muted>
								{t('calculator.allRoots', {
									roots: result.value.allRoots.map((root) => formatSigFigs(root)).join(', '),
								})}
							</Muted>
						) : null}
					</VStack>
				) : ENGINE_HINT_CODES.has(result.error.code) ? (
					<Muted>{engineMessage(locale, result.error.code)}</Muted>
				) : (
					<AppText tone="danger" accessibilityLiveRegion="assertive">
						{engineMessage(locale, result.error.code)}
					</AppText>
				)}
			</Card>
		</Screen>
	);
}
