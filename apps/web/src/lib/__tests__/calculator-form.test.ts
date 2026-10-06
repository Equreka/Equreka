import engineArtifact from '@equreka/content/artifact/engine.json';
import { solutions } from '@equreka/content/artifact/solutions.js';
import {
	type CalculatorSolution,
	createCalculatorUnits,
	solveInUnits,
} from '@equreka/core/hooks/use-calculator-units';
import type { CompiledEquationMeta, EngineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { buildConverterPayload } from '../../integrations/equreka-assets';
import {
	type CalculatorFormState,
	calculatorFormReducer,
	calculatorResultText,
	calculatorViewOf,
	INITIAL_CALCULATOR_FORM,
	scientificParts,
} from '../calculator-form';
import { calculatorUnitSourceOf } from '../calculator-units';

const slice = engineArtifact as unknown as EngineSlice;
const source = calculatorUnitSourceOf(buildConverterPayload(slice, 'en'));
const C = slice.constants['speed-of-light']?.value ?? '';

function equation(slug: string): CompiledEquationMeta {
	const found = slice.equations[slug];
	if (found === undefined) throw new Error(`missing equation ${slug}`);
	return found;
}

const massEnergy = equation('mass-energy-equivalence');
const units = createCalculatorUnits(massEnergy, source);

/**
 * What the island does on Calculate: solve the current draft and turn the
 * outcome into the card view.
 */
function submit(state: CalculatorFormState, selected: Record<string, string> = {}) {
	const { outcome } = solveInUnits(
		massEnergy,
		solutions,
		{ fields: ['E', 'm'], raw: state.values, constants: { c: C }, selected },
		units,
	);
	const view = calculatorViewOf(outcome, (solution) => solution.unit);
	return calculatorFormReducer(state, { type: 'submit', view });
}

function edit(state: CalculatorFormState, key: string, value: string) {
	return calculatorFormReducer(state, { type: 'edit', key, value });
}

const solution = (overrides: Partial<CalculatorSolution> = {}): CalculatorSolution => ({
	symbol: 'm',
	unit: 'kilogram',
	value: 2.2253e-17,
	baseValue: 2.2253e-17,
	exact: true,
	...overrides,
});

describe('submit-driven calculator form', () => {
	it('does not solve while typing; Calculate solves the draft', () => {
		const typed = edit(INITIAL_CALCULATOR_FORM, 'E', '2');
		expect(typed.view).toEqual({ status: 'idle' });
		expect(typed.values).toEqual({ E: '2' });

		const solved = submit(typed);
		if (solved.view.status !== 'solved') throw new Error('expected a solution');
		expect(solved.view.solution.symbol).toBe('m');
		expect(solved.view.solution.value).toBeCloseTo(2 / Number(C) ** 2, 30);
		expect(solved.view.unitSymbol).toBe('kilogram');
	});

	it('keeps the last result while the draft changes, until the next submit', () => {
		const solved = submit(edit(INITIAL_CALCULATOR_FORM, 'E', '2'));
		const edited = edit(solved, 'm', '1');
		expect(edited.view).toBe(solved.view);
		expect(submit(edited).view).toEqual({
			status: 'failed',
			error: expect.objectContaining({ code: 'inputs/overdetermined' }),
		});
	});

	it('answers an empty submit with the input-needed message', () => {
		expect(submit(INITIAL_CALCULATOR_FORM).view).toEqual({ status: 'needed' });
	});

	it('surfaces typed engine errors on submit', () => {
		expect(submit(edit(INITIAL_CALCULATOR_FORM, 'E', 'two')).view).toEqual({
			status: 'failed',
			error: expect.objectContaining({ code: 'inputs/not-a-number' }),
		});
	});

	it('solves in the units selected at submit time', () => {
		const solved = submit(edit(INITIAL_CALCULATOR_FORM, 'm', '1'), { m: 'gram', E: 'erg' });
		if (solved.view.status !== 'solved') throw new Error('expected a solution');
		expect(solved.view.solution.unit).toBe('erg');
		expect(solved.view.unitSymbol).toBe('erg');
	});

	it('reset clears both the draft and the result', () => {
		const solved = submit(edit(INITIAL_CALCULATOR_FORM, 'E', '2'));
		expect(calculatorFormReducer(solved, { type: 'reset' })).toEqual(INITIAL_CALCULATOR_FORM);
	});
});

describe('result formatting', () => {
	it('splits the power of ten off formatted values', () => {
		expect(scientificParts('2.2253e-17')).toEqual({ mantissa: '2.2253', exponent: '-17' });
		expect(scientificParts('2.99792e+8')).toEqual({ mantissa: '2.99792', exponent: '8' });
		expect(scientificParts('42.5')).toEqual({ mantissa: '42.5', exponent: null });
	});

	it('copies symbol, operator, value and unit as plain text', () => {
		expect(calculatorResultText('m', solution(), 'kg')).toBe('m = 2.2253 × 10⁻¹⁷ kg');
		expect(calculatorResultText('A', solution({ value: 6.25, exact: false }), 'm²')).toBe(
			'A ≈ 6.25 m²',
		);
		expect(calculatorResultText('c', solution({ value: 5 }), '')).toBe('c = 5');
	});
});
