import { solutions } from '@equreka/content/artifact/solutions.js';
import { ENGINE_HINT_CODES, engineMessage, type Locale, t } from '@equreka/core/i18n';
import type { EngineError } from '@equreka/engine';
import { formatSigFigs } from '@equreka/engine/format';
import { type KnownValue, solveEquation } from '@equreka/engine/solutions';
import type { CompiledEquationMeta } from '@equreka/schema';
import { useId, useState } from 'react';

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
 */
export interface CalculatorIslandProps {
	meta: CompiledEquationMeta;
	fields: CalculatorField[];
	constants: CalculatorConstant[];
	nonNegative: string[];
	locale?: Locale;
}

export default function CalculatorIsland({
	meta,
	fields,
	constants,
	nonNegative,
	locale = 'en',
}: CalculatorIslandProps) {
	const [values, setValues] = useState<Record<string, string>>({});
	const fieldId = useId();

	const messageFor = (error: EngineError): string => engineMessage(locale, error.code);

	const knowns: Record<string, KnownValue> = {};
	for (const field of fields) {
		const raw = (values[field.key] ?? '').trim();
		knowns[field.key] = raw === '' ? '' : Number(raw);
	}
	for (const constant of constants) {
		knowns[constant.key] = Number(constant.value);
	}

	const anyInput = fields.some((field) => (values[field.key] ?? '').trim() !== '');
	const result = anyInput
		? solveEquation(meta, solutions, knowns, { nonNegative: new Set(nonNegative) })
		: null;
	const solvedField =
		result?.ok === true ? fields.find((field) => field.key === result.value.symbol) : undefined;

	const inputClass =
		'w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-base text-ink';

	return (
		<div className="rounded-lg border border-border bg-surface p-6">
			<div className="grid gap-4 sm:grid-cols-2">
				{fields.map((field) => (
					<div key={field.key}>
						<label
							htmlFor={`${fieldId}-${field.key}`}
							className="mb-1 block text-sm font-medium text-ink-muted"
						>
							{field.label} ({field.symbolText})
						</label>
						<div className="flex items-stretch">
							<input
								id={`${fieldId}-${field.key}`}
								className={field.unitSymbol === '' ? inputClass : `${inputClass} rounded-r-none`}
								type="text"
								inputMode="decimal"
								placeholder={t(locale, 'calculator.placeholder')}
								value={values[field.key] ?? ''}
								onChange={(event) =>
									setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
								}
							/>
							{field.unitSymbol !== '' && (
								<span className="flex items-center rounded-r-md border border-l-0 border-border bg-bg px-3 text-sm text-ink-muted">
									{field.unitSymbol}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
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
						<p className="text-xl">
							{solvedField?.label ?? result.value.symbol} ({result.value.symbol}) ={' '}
							<strong>{formatSigFigs(result.value.value)}</strong>
							{solvedField !== undefined && solvedField.unitSymbol !== '' && (
								<span> {solvedField.unitSymbol}</span>
							)}
							<span className="ml-2 text-sm text-ink-muted">{t(locale, 'common.sigFigs')}</span>
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
