import { solutions } from '@equreka/content/artifact/solutions.js';
import { solveInUnits, useCalculatorUnits } from '@equreka/core/hooks/use-calculator-units';
import { ENGINE_HINT_CODES, engineMessage, type Locale, t } from '@equreka/core/i18n';
import type { EngineError } from '@equreka/engine';
import { formatSigFigs } from '@equreka/engine/format';
import type { CompiledEquationMeta } from '@equreka/schema';
import { useEffect, useId, useMemo, useState } from 'react';
import type { ConverterPayload } from '../integrations/equreka-assets';
import {
	type CalculatorVariableUnits,
	calculatorUnitSourceOf,
	loadConverterPayload,
} from '../lib/calculator-units';

/**
 * One user-facing input, resolved at build from the equation's terms map:
 * constant-kind terms are excluded (they inject automatically) and
 * `unitSymbol` comes from the term's magnitude baseUnit or variable
 * defaultUnit ('' when the term has no unit).
 */
export interface CalculatorField {
	key: string;
	label: string;
	symbolText: string;
	unitSymbol: string;
}

/**
 * A constant term auto-injected into every solve. `value` stays the
 * full-precision decimal string from content; the island parses it at its
 * float64 boundary.
 */
export interface CalculatorConstant {
	key: string;
	name: string;
	symbolText: string;
	value: string;
	unitSymbol: string;
}

/**
 * `nonNegative` lists term keys whose magnitude is nonNegative-flagged, so
 * multi-root solutions discard negative roots (engine SolveOptions).
 * `variables` carries the default units of referenced variables, which
 * the converter payload does not.
 */
export interface CalculatorIslandProps {
	meta: CompiledEquationMeta;
	fields: CalculatorField[];
	constants: CalculatorConstant[];
	nonNegative: string[];
	variables?: CalculatorVariableUnits;
	locale?: Locale;
}

/**
 * `idle` means no field carries a unit, so the payload is never fetched.
 */
type PayloadState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; payload: ConverterPayload };

/**
 * Unit pickers appear once the converter payload arrives; until then, or
 * when it cannot load, every field solves in the base unit shown beside
 * it, exactly as before per-term selection existed.
 */
export default function CalculatorIsland({
	meta,
	fields,
	constants,
	nonNegative,
	variables,
	locale = 'en',
}: CalculatorIslandProps) {
	const [values, setValues] = useState<Record<string, string>>({});
	const needsUnits = fields.some((field) => field.unitSymbol !== '');
	const [state, setState] = useState<PayloadState>(
		needsUnits ? { status: 'loading' } : { status: 'idle' },
	);
	const fieldId = useId();

	useEffect(() => {
		if (!needsUnits) return;
		let cancelled = false;
		loadConverterPayload(locale)
			.then((payload) => {
				if (!cancelled) setState({ status: 'ready', payload });
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error' });
			});
		return () => {
			cancelled = true;
		};
	}, [needsUnits, locale]);

	const source = useMemo(
		() => (state.status === 'ready' ? calculatorUnitSourceOf(state.payload, variables) : null),
		[state, variables],
	);
	const unitState = useCalculatorUnits(meta, source);
	const nonNegativeSet = useMemo(() => new Set(nonNegative), [nonNegative]);
	const constantValues = useMemo(
		() => Object.fromEntries(constants.map((constant) => [constant.key, constant.value])),
		[constants],
	);

	const messageFor = (error: EngineError): string => engineMessage(locale, error.code);
	const symbolOf = (slug: string, fallback: string): string =>
		source?.registry.getUnit(slug)?.symbolText ?? fallback;

	const { outcome: result } = solveInUnits(
		meta,
		solutions,
		{
			fields: fields.map((field) => field.key),
			raw: values,
			constants: constantValues,
			selected: unitState.selected,
			nonNegative: nonNegativeSet,
		},
		unitState.units,
	);
	const solvedField =
		result?.ok === true ? fields.find((field) => field.key === result.value.symbol) : undefined;

	const inputClass =
		'w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-base text-ink';
	const addonClass =
		'flex items-center rounded-r-md border border-l-0 border-border bg-bg px-3 text-sm text-ink-muted';
	const selectAddonClass =
		'max-w-40 shrink-0 rounded-r-md border border-l-0 border-border bg-bg px-2 text-sm text-ink';

	const unitPicker = (key: string, label: string, className: string) => (
		<select
			aria-label={label}
			className={className}
			value={unitState.unitFor(key)}
			onChange={(event) => unitState.select(key, event.target.value)}
		>
			{unitState.optionsFor(key).units.map((unit) => (
				<option key={unit.slug} value={unit.slug}>
					{unit.symbolText} — {unit.name.en}
				</option>
			))}
		</select>
	);

	return (
		<div className="rounded-lg border border-border bg-surface p-6">
			<div className="grid gap-4 sm:grid-cols-2">
				{fields.map((field) => {
					const { units: offered, hiddenByKind } = unitState.optionsFor(field.key);
					const inputId = `${fieldId}-${field.key}`;
					return (
						<div key={field.key}>
							<label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink-muted">
								{field.label} ({field.symbolText})
							</label>
							<div className="flex items-stretch">
								<input
									id={inputId}
									className={field.unitSymbol === '' ? inputClass : `${inputClass} rounded-r-none`}
									type="text"
									inputMode="decimal"
									placeholder={t(locale, 'calculator.placeholder')}
									value={values[field.key] ?? ''}
									onChange={(event) =>
										setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
									}
								/>
								{offered.length > 1
									? unitPicker(
											field.key,
											t(locale, 'calculator.unitFor', {
												name: `${field.label} (${field.symbolText})`,
											}),
											selectAddonClass,
										)
									: field.unitSymbol !== '' && (
											<span className={addonClass}>{field.unitSymbol}</span>
										)}
							</div>
							{hiddenByKind > 0 ? (
								<div className="mt-2">
									<label className="flex items-center gap-2 text-xs text-ink">
										<input
											type="checkbox"
											checked={unitState.showAllFor(field.key)}
											aria-describedby={`${inputId}-scope-hint`}
											onChange={(event) => unitState.setShowAll(field.key, event.target.checked)}
										/>
										{t(locale, 'converter.showAllDimension', { count: hiddenByKind })}
									</label>
									<p id={`${inputId}-scope-hint`} className="mt-1 text-xs text-ink-muted">
										{t(locale, 'converter.showAllDimensionHint')}
									</p>
								</div>
							) : null}
						</div>
					);
				})}
			</div>
			{state.status === 'error' ? (
				<p className="mt-3 text-sm text-ink-muted">{t(locale, 'calculator.unitsUnavailable')}</p>
			) : null}
			<div className="mt-4 flex flex-wrap items-center gap-4">
				<button
					type="button"
					className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg"
					onClick={() => setValues({})}
				>
					{t(locale, 'calculator.reset')}
				</button>
				{constants.length > 0 && (
					<p className="text-sm text-ink-muted">
						{t(locale, 'calculator.autoFilled')}{' '}
						{constants.map((constant, index) => (
							<span key={constant.key}>
								{index > 0 && ', '}
								{constant.name} {constant.symbolText} = {formatSigFigs(Number(constant.value))}
								{constant.unitSymbol === '' ? '' : ` ${constant.unitSymbol}`}
							</span>
						))}
					</p>
				)}
			</div>
			<div className="mt-6 border-t border-border pt-4" aria-live="polite">
				{result === null ? (
					<p className="text-ink-muted">{t(locale, 'calculator.hint')}</p>
				) : result.ok ? (
					<>
						<p className="flex flex-wrap items-baseline gap-x-2 text-xl">
							<span>
								{solvedField?.label ?? result.value.symbol} ({result.value.symbol}){' '}
								{result.value.exact ? '=' : '≈'}{' '}
								<strong>{formatSigFigs(result.value.value)}</strong>
							</span>
							{unitState.optionsFor(result.value.symbol).units.length > 1
								? unitPicker(
										result.value.symbol,
										t(locale, 'calculator.resultUnit'),
										'rounded-md border border-border bg-bg px-2 py-1 text-sm text-ink',
									)
								: solvedField !== undefined &&
									solvedField.unitSymbol !== '' && (
										<span>{symbolOf(result.value.unit, solvedField.unitSymbol)}</span>
									)}
							<span className="text-sm text-ink-muted">{t(locale, 'common.sigFigs')}</span>
						</p>
						{result.value.allRoots !== undefined && result.value.allRoots.length > 1 && (
							<p className="mt-2 text-sm text-ink-muted">
								{t(locale, 'calculator.allRoots', {
									roots: result.value.allRoots.map((root) => formatSigFigs(root)).join(', '),
								})}
							</p>
						)}
					</>
				) : ENGINE_HINT_CODES.has(result.error.code) ? (
					<p className="text-ink-muted">{messageFor(result.error)}</p>
				) : (
					<p role="alert" className="text-danger">
						{messageFor(result.error)}
					</p>
				)}
			</div>
		</div>
	);
}
