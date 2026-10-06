import { solutions } from '@equreka/content/artifact/solutions.js';
import { solveInUnits, useCalculatorUnits } from '@equreka/core/hooks/use-calculator-units';
import { ENGINE_HINT_CODES, engineMessage, type Locale, t } from '@equreka/core/i18n';
import { formatSigFigs } from '@equreka/engine/format';
import type { CompiledEquationMeta } from '@equreka/schema';
import {
	type ReactNode,
	type SubmitEvent,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useState,
} from 'react';
import { Icon } from '../components/react-icon';
import type { ConverterPayload } from '../integrations/equreka-assets';
import {
	type CalculatorView,
	calculatorFormReducer,
	calculatorResultText,
	calculatorViewOf,
	INITIAL_CALCULATOR_FORM,
	resultOperator,
	scientificParts,
} from '../lib/calculator-form';
import {
	type CalculatorVariableUnits,
	calculatorUnitSourceOf,
	loadConverterPayload,
} from '../lib/calculator-units';
import { copyText } from '../lib/clipboard';
import { arrowClockwiseIcon, clipboardIcon } from '../lib/icons';

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
 * the converter payload does not. `children` is the equation's
 * build-rendered KaTeX, drawn as the legacy outlined backdrop of the
 * result card.
 */
export interface CalculatorIslandProps {
	meta: CompiledEquationMeta;
	fields: CalculatorField[];
	constants: CalculatorConstant[];
	nonNegative: string[];
	variables?: CalculatorVariableUnits;
	locale?: Locale;
	children?: ReactNode;
}

/**
 * `idle` means no field carries a unit, so the payload is never fetched.
 */
type PayloadState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; payload: ConverterPayload };

type CopyStatus = 'idle' | 'copied' | 'failed';

const COPY_STATUS_MS = 2500;

/**
 * The legacy calculator: typing only edits the draft, Calculate (or Enter)
 * solves, Reset clears values and result, Copy puts the result text on the
 * clipboard with an inline status instead of the legacy alert(). Unit
 * pickers appear once the converter payload arrives; until then, or when
 * it cannot load, every field solves in the base unit its label shows.
 */
export default function CalculatorIsland({
	meta,
	fields,
	constants,
	nonNegative,
	variables,
	locale = 'en',
	children,
}: CalculatorIslandProps) {
	const [form, dispatch] = useReducer(calculatorFormReducer, INITIAL_CALCULATOR_FORM);
	const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
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

	useEffect(() => {
		if (copyStatus === 'idle') return;
		const timer = setTimeout(() => setCopyStatus('idle'), COPY_STATUS_MS);
		return () => clearTimeout(timer);
	}, [copyStatus]);

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

	const symbolOf = (slug: string, fallback: string): string =>
		source?.registry.getUnit(slug)?.symbolText ?? fallback;
	const fieldUnitSymbol = (field: CalculatorField): string =>
		field.unitSymbol === '' ? '' : symbolOf(unitState.unitFor(field.key), field.unitSymbol);
	const fieldOf = (key: string): CalculatorField | undefined =>
		fields.find((field) => field.key === key);

	const submit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { outcome } = solveInUnits(
			meta,
			solutions,
			{
				fields: fields.map((field) => field.key),
				raw: form.values,
				constants: constantValues,
				selected: unitState.selected,
				nonNegative: nonNegativeSet,
			},
			unitState.units,
		);
		const view = calculatorViewOf(outcome, (solution) => {
			const field = fieldOf(solution.symbol);
			return field === undefined || field.unitSymbol === ''
				? ''
				: symbolOf(solution.unit, field.unitSymbol);
		});
		setCopyStatus('idle');
		dispatch({ type: 'submit', view });
	};

	const reset = () => {
		setCopyStatus('idle');
		dispatch({ type: 'reset' });
	};

	const copy = (view: CalculatorView) => {
		if (view.status !== 'solved') return;
		const symbol = fieldOf(view.solution.symbol)?.symbolText ?? view.solution.symbol;
		copyText(calculatorResultText(symbol, view.solution, view.unitSymbol)).then(
			(copied) => setCopyStatus(copied ? 'copied' : 'failed'),
			() => setCopyStatus('failed'),
		);
	};

	const unitPicker = (key: string, label: string) => (
		<select
			aria-label={label}
			className="eq-field-addon"
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

	const { view } = form;
	const resetLabel = t(locale, 'calculator.reset');
	const copyLabel = t(locale, 'design.legacy.calculator.copy');
	const copyMessage =
		copyStatus === 'copied'
			? t(locale, 'design.legacy.calculator.copied')
			: copyStatus === 'failed'
				? t(locale, 'design.legacy.calculator.copyFailed')
				: '';

	return (
		<div className="eq-tool eq-calc">
			<div className="eq-card eq-calc-result-card">
				{children === undefined ? null : (
					<div className="eq-calc-backdrop" aria-hidden="true">
						{children}
					</div>
				)}
				<div className="eq-tool-result eq-calc-result-area" aria-live="polite">
					<ResultView view={view} locale={locale} fieldOf={fieldOf} />
				</div>
			</div>
			<div className="eq-card eq-calc-form">
				<div className="eq-card-body">
					<form onSubmit={submit} noValidate>
						<div className="eq-calc-fields">
							{fields.map((field) => {
								const { units: offered, hiddenByKind } = unitState.optionsFor(field.key);
								const inputId = `${fieldId}-${field.key}`;
								const unitSymbol = fieldUnitSymbol(field);
								return (
									<div key={field.key} className="eq-calc-field">
										<div className="eq-floating">
											<input
												id={inputId}
												className="eq-field-control"
												type="text"
												inputMode="decimal"
												autoComplete="off"
												value={form.values[field.key] ?? ''}
												onChange={(event) =>
													dispatch({ type: 'edit', key: field.key, value: event.target.value })
												}
											/>
											<label htmlFor={inputId} className="eq-field-caption">
												{field.label} ({unitSymbol === '' ? field.symbolText : unitSymbol})
											</label>
										</div>
										{offered.length > 1
											? unitPicker(
													field.key,
													t(locale, 'calculator.unitFor', {
														name: `${field.label} (${field.symbolText})`,
													}),
												)
											: null}
										{hiddenByKind > 0 ? (
											<div className="eq-tool-scope">
												<label>
													<input
														type="checkbox"
														checked={unitState.showAllFor(field.key)}
														aria-describedby={`${inputId}-scope-hint`}
														onChange={(event) =>
															unitState.setShowAll(field.key, event.target.checked)
														}
													/>
													{t(locale, 'converter.showAllDimension', { count: hiddenByKind })}
												</label>
												<p id={`${inputId}-scope-hint`}>
													{t(locale, 'converter.showAllDimensionHint')}
												</p>
											</div>
										) : null}
									</div>
								);
							})}
						</div>
						{state.status === 'error' ? (
							<p className="eq-tool-aside">{t(locale, 'calculator.unitsUnavailable')}</p>
						) : null}
						<div className="eq-calc-actions">
							<div className="eq-calc-action-side">
								<button
									type="button"
									className="eq-btn eq-btn-danger eq-calc-round"
									aria-label={resetLabel}
									title={resetLabel}
									onClick={reset}
								>
									<Icon icon={arrowClockwiseIcon} />
								</button>
							</div>
							<div className="eq-calc-action-main">
								<button type="submit" className="eq-btn eq-btn-success eq-calc-submit">
									{t(locale, 'design.legacy.calculator.calculate')}
								</button>
							</div>
							<div className="eq-calc-action-side">
								<button
									type="button"
									className="eq-btn eq-btn-dark eq-calc-round"
									aria-label={copyLabel}
									title={copyLabel}
									disabled={view.status !== 'solved'}
									onClick={() => copy(view)}
								>
									<Icon icon={clipboardIcon} />
								</button>
							</div>
							<p role="status" className="eq-calc-copy-status" data-state={copyStatus}>
								{copyMessage}
							</p>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}

interface ResultViewProps {
	view: CalculatorView;
	locale: Locale;
	fieldOf: (key: string) => CalculatorField | undefined;
}

/**
 * Legacy result card content: `symbol = value unit` in the math face, or
 * the CalculatorMessage line. Input-shape problems (the fill-all-but-one
 * rule) are guidance; anything else is announced as an alert.
 */
function ResultView({ view, locale, fieldOf }: ResultViewProps) {
	if (view.status === 'idle') return null;
	if (view.status === 'needed') {
		return <p className="eq-calc-message">{t(locale, 'design.legacy.calculator.needed')}</p>;
	}
	if (view.status === 'failed') {
		const message = engineMessage(locale, view.error.code);
		return ENGINE_HINT_CODES.has(view.error.code) ? (
			<p className="eq-calc-message">{message}</p>
		) : (
			<p role="alert" className="eq-calc-message">
				{message}
			</p>
		);
	}
	const { solution, unitSymbol } = view;
	const field = fieldOf(solution.symbol);
	const { mantissa, exponent } = scientificParts(formatSigFigs(solution.value));
	return (
		<>
			<p className="eq-calc-result">
				<var
					className="eq-calc-symbol"
					title={field === undefined ? undefined : `${field.label} (${field.symbolText})`}
				>
					{field?.symbolText ?? solution.symbol}
				</var>
				<span className="eq-calc-operator">{resultOperator(solution)}</span>
				<span>
					{mantissa}
					{exponent === null ? null : (
						<>
							×10<sup>{exponent}</sup>
						</>
					)}
				</span>
				{unitSymbol === '' ? null : <span>{unitSymbol}</span>}
			</p>
			<p className="eq-tool-note">{t(locale, 'common.sigFigs')}</p>
			{solution.allRoots !== undefined && solution.allRoots.length > 1 && (
				<p className="eq-tool-note">
					{t(locale, 'calculator.allRoots', {
						roots: solution.allRoots.map((root) => formatSigFigs(root)).join(', '),
					})}
				</p>
			)}
		</>
	);
}
