import type { CalculatorSolution } from '@equreka/core/hooks/use-calculator-units';
import type { EngineError, EngineResult } from '@equreka/engine';
import { formatSigFigs } from '@equreka/engine/format';
import { toSuperscript } from './notation';

/**
 * What the result card shows. `needed` is the legacy "Enter data to solve"
 * state (Calculate pressed with every field empty). `solved` keeps the
 * result unit symbol resolved at submit time, so a picker changed
 * afterwards never relabels a value computed in another unit.
 */
export type CalculatorView =
	| { status: 'idle' }
	| { status: 'needed' }
	| { status: 'solved'; solution: CalculatorSolution; unitSymbol: string }
	| { status: 'failed'; error: EngineError };

export interface CalculatorFormState {
	values: Readonly<Record<string, string>>;
	view: CalculatorView;
}

/**
 * Editing only changes the draft values; the solve runs on `submit`, whose
 * view the island computes from those values at that moment, as the
 * legacy form did on its submit event.
 */
export type CalculatorFormAction =
	| { type: 'edit'; key: string; value: string }
	| { type: 'submit'; view: CalculatorView }
	| { type: 'reset' };

export const INITIAL_CALCULATOR_FORM: CalculatorFormState = {
	values: {},
	view: { status: 'idle' },
};

export function calculatorFormReducer(
	state: CalculatorFormState,
	action: CalculatorFormAction,
): CalculatorFormState {
	switch (action.type) {
		case 'edit':
			return { ...state, values: { ...state.values, [action.key]: action.value } };
		case 'submit':
			return { ...state, view: action.view };
		case 'reset':
			return INITIAL_CALCULATOR_FORM;
	}
}

/**
 * `outcome` null is solveInUnits' "no field has input", which the legacy
 * calculator answered with its input-needed message.
 */
export function calculatorViewOf(
	outcome: EngineResult<CalculatorSolution> | null,
	unitSymbolOf: (solution: CalculatorSolution) => string,
): CalculatorView {
	if (outcome === null) return { status: 'needed' };
	if (!outcome.ok) return { status: 'failed', error: outcome.error };
	return { status: 'solved', solution: outcome.value, unitSymbol: unitSymbolOf(outcome.value) };
}

export interface ScientificParts {
	mantissa: string;
	exponent: string | null;
}

/**
 * Splits formatSigFigs output at its exponent ("2.2253e-17" → 2.2253 and
 * -17) so the card can set the power of ten as a superscript; a leading
 * '+' is dropped.
 */
export function scientificParts(formatted: string): ScientificParts {
	const at = formatted.search(/e/i);
	if (at === -1) return { mantissa: formatted, exponent: null };
	return {
		mantissa: formatted.slice(0, at),
		exponent: formatted.slice(at + 1).replace(/^\+/, ''),
	};
}

export function resultOperator(solution: CalculatorSolution): '=' | '≈' {
	return solution.exact ? '=' : '≈';
}

/**
 * Plain-text form of the result card ("m = 2.2253 × 10⁻¹⁷ kg") for the
 * clipboard: superscript digits keep the exponent readable once pasted.
 */
export function calculatorResultText(
	symbol: string,
	solution: CalculatorSolution,
	unitSymbol: string,
): string {
	const { mantissa, exponent } = scientificParts(formatSigFigs(solution.value));
	const value = exponent === null ? mantissa : `${mantissa} × 10${toSuperscript(Number(exponent))}`;
	const parts = [symbol, resultOperator(solution), value];
	if (unitSymbol !== '') parts.push(unitSymbol);
	return parts.join(' ');
}
