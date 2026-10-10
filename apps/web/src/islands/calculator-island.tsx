import { loadSolutions } from '@equreka/content/artifact/solutions/index.js';
import { solveInUnits, useCalculatorUnits } from '@equreka/core/hooks/use-calculator-units';
import { useSettings } from '@equreka/core/hooks/use-settings';
import { ENGINE_HINT_CODES, engineErrorMessage, type Locale, t } from '@equreka/core/i18n';
import { formatResult, type NumberFormat, resultText } from '@equreka/engine/format';
import type { SolutionsModule } from '@equreka/engine/solutions';
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
import type { ConverterPayload } from '../integrations/equreka-assets';
import {
	type CalculatorField,
	calculatorUnitSymbol,
	termIdFragment,
} from '../lib/calculator-fields';
import {
	type CalculatorView,
	calculatorFormReducer,
	calculatorResultText,
	calculatorViewOf,
	INITIAL_CALCULATOR_FORM,
	resultOperator,
} from '../lib/calculator-form';
import {
	type CalculatorVariableUnits,
	calculatorUnitSourceOf,
	loadConverterPayload,
} from '../lib/calculator-units';
import { copyText } from '../lib/clipboard';
import { kvLocalStorage } from '../lib/kv-local-storage';
import { LegacyGlyph } from './legacy-glyph';

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

/**
 * `ready` holds a solutions module with this page's equation only: each
 * calculator page downloads its own equation's solution chunk (ADR 0010).
 */
type SolverState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; solutions: SolutionsModule };

type CopyStatus = 'idle' | 'copied' | 'failed';

const COPY_STATUS_MS = 2500;

/**
 * The legacy calculator: typing only edits the draft, Calculate (or Enter)
 * solves, Reset clears values and result, Copy puts the result text on the
 * clipboard with an inline status instead of the legacy alert(). Calculate
 * stays disabled until the equation's solution chunk has loaded. Unit
 * pickers appear once the converter payload arrives; until then, or when
 * it cannot load, every field solves in the base unit its label shows.
 * The result prints in the reader's `numberFormat` setting, and Copy
 * copies it in that same format.
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
	const needsUnits = fields.some((field) => field.convertible);
	const [state, setState] = useState<PayloadState>(
		needsUnits ? { status: 'loading' } : { status: 'idle' },
	);
	const [solver, setSolver] = useState<SolverState>({ status: 'loading' });
	const { numberFormat } = useSettings(kvLocalStorage).settings;
	const fieldId = useId();

	useEffect(() => {
		let cancelled = false;
		loadSolutions(meta.slug)
			.then((byTerm) => {
				if (cancelled) return;
				setSolver(
					byTerm === undefined
						? { status: 'error' }
						: { status: 'ready', solutions: { [meta.slug]: byTerm } },
				);
			})
			.catch(() => {
				if (!cancelled) setSolver({ status: 'error' });
			});
		return () => {
			cancelled = true;
		};
	}, [meta.slug]);

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

	const unitSymbolOf = (field: CalculatorField, slug: string): string => {
		const unit = field.convertible ? source?.registry.getUnit(slug) : undefined;
		return unit === undefined ? field.unitSymbol : calculatorUnitSymbol(unit);
	};
	const fieldUnitSymbol = (field: CalculatorField): string =>
		unitSymbolOf(field, unitState.unitFor(field.key));
	const fieldOf = (key: string): CalculatorField | undefined =>
		fields.find((field) => field.key === key);
	const solvableOnly = fields.some((field) => !field.solvable)
		? fields
				.filter((field) => field.solvable)
				.map((field) => field.symbolText)
				.join(', ')
		: '';

	const submit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (solver.status !== 'ready') return;
		const { outcome } = solveInUnits(
			meta,
			solver.solutions,
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
			return field === undefined ? '' : unitSymbolOf(field, solution.unit);
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
		copyText(calculatorResultText(symbol, view.solution, view.unitSymbol, numberFormat)).then(
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
					<ResultView view={view} locale={locale} format={numberFormat} fieldOf={fieldOf} />
				</div>
			</div>
			<div className="eq-card eq-calc-form">
				<div className="eq-card-body">
					<form onSubmit={submit} noValidate>
						{solvableOnly === '' ? null : (
							<p className="eq-tool-note">
								{t(locale, 'calculator.solvableOnly', { terms: solvableOnly })}
							</p>
						)}
						<div className="eq-calc-fields">
							{fields.map((field) => {
								const { units: offered, hiddenByKind } = unitState.optionsFor(field.key);
								const inputId = `${fieldId}-${termIdFragment(meta, field.key)}`;
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
												aria-required={field.solvable ? undefined : true}
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
						{solver.status === 'error' ? (
							<p role="alert" className="eq-tool-aside">
								{t(locale, 'calculator.solverUnavailable')}
							</p>
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
									<LegacyGlyph name="arrow-clockwise" />
								</button>
							</div>
							<div className="eq-calc-action-main">
								<button
									type="submit"
									className="eq-btn eq-btn-success eq-calc-submit"
									disabled={solver.status !== 'ready'}
								>
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
									<LegacyGlyph name="clipboard" />
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
	format: NumberFormat;
	fieldOf: (key: string) => CalculatorField | undefined;
}

/**
 * Legacy result card content: `symbol = value unit` in the math face, or
 * the CalculatorMessage line. Input-shape problems (the fill-all-but-one
 * rule) are guidance; anything else is announced as an alert. The power
 * of ten keeps the original's superscript, both signs drawn.
 */
export function ResultView({ view, locale, format, fieldOf }: ResultViewProps) {
	if (view.status === 'idle') return null;
	if (view.status === 'needed') {
		return <p className="eq-calc-message">{t(locale, 'design.legacy.calculator.needed')}</p>;
	}
	if (view.status === 'failed') {
		const message = engineErrorMessage(
			locale,
			view.error,
			(key) => fieldOf(key)?.symbolText ?? key,
		);
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
	const { mantissa, exponent } = formatResult(solution.value, format);
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
							<span className="eq-calc-exponent">×10</span>
							<sup>
								<span
									className={
										exponent.sign === '-'
											? 'eq-calc-exponent-sign eq-calc-exponent-minus'
											: 'eq-calc-exponent-sign'
									}
								>
									{exponent.sign}
								</span>
								<span>{exponent.digits}</span>
							</sup>
						</>
					)}
				</span>
				{unitSymbol === '' ? null : <span>{unitSymbol}</span>}
			</p>
			{solution.allRoots !== undefined && solution.allRoots.length > 1 && (
				<p className="eq-tool-note">
					{t(locale, 'calculator.allRoots', {
						roots: solution.allRoots
							.map((root) => resultText(formatResult(root, format)))
							.join(', '),
					})}
				</p>
			)}
		</>
	);
}
