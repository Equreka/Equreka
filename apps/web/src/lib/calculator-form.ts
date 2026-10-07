import type { CalculatorSolution } from '@equreka/core/hooks/use-calculator-units';
import type { EngineError, EngineResult } from '@equreka/engine';
import { formatResult, type NumberFormat, resultText } from '@equreka/engine/format';

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

export function resultOperator(solution: CalculatorSolution): '=' | '≈' {
	return solution.exact ? '=' : '≈';
}

/**
 * Plain-text twin of the result card for the clipboard, in the format the
 * card shows ("m = 2.225300112 × 10⁻¹⁷ kg").
 */
export function calculatorResultText(
	symbol: string,
	solution: CalculatorSolution,
	unitSymbol: string,
	format: NumberFormat,
): string {
	const parts = [
		symbol,
		resultOperator(solution),
		resultText(formatResult(solution.value, format)),
	];
	if (unitSymbol !== '') parts.push(unitSymbol);
	return parts.join(' ');
}
