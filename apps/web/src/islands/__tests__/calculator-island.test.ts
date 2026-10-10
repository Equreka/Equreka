/** @vitest-environment jsdom */
import engineArtifact from '@equreka/content/artifact/engine.json';
import type { CalculatorSolution } from '@equreka/core/hooks/use-calculator-units';
import { SETTINGS_KEY } from '@equreka/core/hooks/use-settings';
import type { NumberFormat } from '@equreka/engine/format';
import type { CompiledEquationMeta, EngineSlice } from '@equreka/schema';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculatorField } from '../../lib/calculator-fields';
import { kvLocalStorage } from '../../lib/kv-local-storage';
import CalculatorIsland, { ResultView } from '../calculator-island';

const slice = engineArtifact as unknown as EngineSlice;
const massEnergy = slice.equations['mass-energy-equivalence'] as CompiledEquationMeta;

const islandProps = {
	meta: massEnergy,
	fields: [
		calculatorField(massEnergy, 'E', 'Energy', ''),
		calculatorField(massEnergy, 'm', 'Mass', ''),
	],
	constants: [
		{
			key: 'c',
			name: 'Speed of light',
			symbolText: 'c',
			value: slice.constants['speed-of-light']?.value ?? '',
			unitSymbol: 'm/s',
		},
	],
	nonNegative: [],
};

const writeText = vi.fn(async (_text: string) => undefined);

function storeNumberFormat(numberFormat: NumberFormat): void {
	kvLocalStorage.set(SETTINGS_KEY, JSON.stringify({ numberFormat }));
}

function resultLine(): string {
	return document.querySelector('.eq-calc-result')?.textContent ?? '';
}

/**
 * Solves E for m = 1 g (E = 8.987551787368177e13 J) through the real form,
 * once the equation's solution chunk has loaded.
 */
async function solveOneGram(): Promise<void> {
	const calculate = screen.getByRole('button', { name: 'Calculate' }) as HTMLButtonElement;
	await waitFor(() => expect(calculate.disabled).toBe(false));
	fireEvent.change(screen.getByLabelText('Mass (m)'), { target: { value: '0.001' } });
	fireEvent.click(calculate);
	await waitFor(() => expect(resultLine()).not.toBe(''));
}

beforeEach(() => {
	localStorage.clear();
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
	cleanup();
	writeText.mockClear();
});

describe('calculator island result format', () => {
	it('prints the result readable by default and copies what it shows', async () => {
		render(createElement(CalculatorIsland, islandProps));
		await solveOneGram();
		expect(resultLine()).toBe('E=8.987551787×10+13');

		fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith('E = 8.987551787 × 10¹³'));
	});

	it('prints every round-trip digit when the setting is scientific', async () => {
		storeNumberFormat('scientific');
		render(createElement(CalculatorIsland, islandProps));
		await solveOneGram();
		expect(resultLine()).toBe('E=8.987551787368177×10+13');

		fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith('E = 8.987551787368177 × 10¹³'));
	});

	it('reprints a shown result when the setting changes', async () => {
		render(createElement(CalculatorIsland, islandProps));
		await solveOneGram();
		expect(resultLine()).toBe('E=8.987551787×10+13');

		act(() => storeNumberFormat('scientific'));
		expect(resultLine()).toBe('E=8.987551787368177×10+13');
		act(() => storeNumberFormat('readable'));
		expect(resultLine()).toBe('E=8.987551787×10+13');
	});
});

describe('calculator result view', () => {
	const projectile: CalculatorSolution = {
		symbol: '\\theta',
		value: 2.9966313365235766e1,
		baseValue: 0.523,
		root: 0,
		allRoots: [2.9966313365235766e1, 6.003368663476423e1],
		unit: 'degree',
		exact: false,
	};

	function renderSolved(format: NumberFormat): HTMLElement {
		return render(
			createElement(ResultView, {
				view: { status: 'solved', solution: projectile, unitSymbol: '°' },
				locale: 'en',
				format,
				fieldOf: () => undefined,
			}),
		).container;
	}

	it('prints the result and every root in the readable format', () => {
		const container = renderSolved('readable');
		expect(container.querySelector('.eq-calc-result')?.textContent).toBe('\\theta≈29.96631337°');
		expect(container.querySelector('sup')).toBeNull();
		expect(screen.getByText(/^All roots:/).textContent).toBe(
			'All roots: 29.96631337, 60.03368663 — the admissible root is shown above.',
		);
	});

	it('prints the result and every root in the scientific format', () => {
		const container = renderSolved('scientific');
		expect(container.querySelector('.eq-calc-result')?.textContent).toBe(
			'\\theta≈2.9966313365235766×10+1°',
		);
		expect(container.querySelector('sup')?.textContent).toBe('+1');
		expect(screen.getByText(/^All roots:/).textContent).toBe(
			'All roots: 2.9966313365235766 × 10¹, 6.003368663476423 × 10¹ — the admissible root is shown above.',
		);
	});
});
