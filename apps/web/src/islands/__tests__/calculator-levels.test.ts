/** @vitest-environment jsdom */
import type { SolutionFn } from '@equreka/engine/solutions';
import type {
	CompiledDisplayUnit,
	CompiledEquationMeta,
	CompiledUnit,
	EngineSlice,
} from '@equreka/schema';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildConverterPayload } from '../../integrations/equreka-assets';
import {
	calculatorField,
	convertibleFieldUnit,
	displayFieldUnit,
} from '../../lib/calculator-fields';
import CalculatorIsland from '../calculator-island';

vi.mock('@equreka/content/artifact/solutions/index.js', () => ({
	loadSolutions: async (slug: string): Promise<Record<string, SolutionFn> | undefined> =>
		slug === 'test-level-formula'
			? {
					L: ({ r = Number.NaN }) => 10 * Math.log10(r),
					r: ({ L = Number.NaN }) => 10 ** (L / 10),
				}
			: undefined,
}));

const ZERO: CompiledUnit['dimension'] = [0, 0, 0, 0, 0, 0, 0, 0];

function ratioUnit(slug: string, symbolText: string, factor: string): CompiledUnit {
	return {
		slug,
		name: { en: slug === 'test-one' ? 'Test one' : 'Test percent' },
		symbolTex: symbolText,
		symbolText,
		magnitudes: ['test-ratio', 'test-level'],
		system: 'other',
		dimension: ZERO,
		factor,
		offset: '0',
		exact: true,
		affine: false,
	};
}

const DECIBEL: CompiledDisplayUnit = {
	slug: 'test-bel',
	name: { en: 'Test decibel' },
	symbolTex: 'dB',
	symbolText: 'dB',
};

const SLICE: EngineSlice = {
	schemaVersion: 0,
	contentHash: '',
	units: {
		'test-one': ratioUnit('test-one', '1', '1'),
		'test-percent': ratioUnit('test-percent', '%', '0.01'),
	},
	magnitudes: {
		'test-ratio': {
			slug: 'test-ratio',
			name: { en: 'Test ratio' },
			symbolTex: 'r',
			baseUnit: 'test-one',
			dimension: ZERO,
			nonNegative: false,
		},
		'test-level': {
			slug: 'test-level',
			name: { en: 'Test level' },
			symbolTex: 'L',
			baseUnit: 'test-one',
			displayUnit: DECIBEL,
			dimension: ZERO,
			nonNegative: false,
		},
	},
	prefixes: {},
	constants: {},
	equations: {},
};

const META: CompiledEquationMeta = {
	slug: 'test-level-formula',
	kind: 'formula',
	name: { en: 'Test level formula' },
	calculatorEnabled: true,
	terms: {
		L: { kind: 'magnitude', ref: 'test-level', identifier: 'L' },
		r: { kind: 'magnitude', ref: 'test-ratio', identifier: 'r' },
	},
	solvable: ['L', 'r'],
};

const PROPS = {
	meta: META,
	fields: [
		calculatorField(META, 'L', 'Test level', displayFieldUnit(DECIBEL)),
		calculatorField(META, 'r', 'Test ratio', convertibleFieldUnit(SLICE.units['test-one'])),
	],
	constants: [],
	nonNegative: [],
};

const writeText = vi.fn(async (_text: string) => undefined);

function resultLine(): string {
	return document.querySelector('.eq-calc-result')?.textContent ?? '';
}

/**
 * Renders the island once the converter payload and the solution chunk
 * have both arrived, so every assertion sees the loaded unit pickers.
 */
async function renderLoaded(): Promise<void> {
	render(createElement(CalculatorIsland, PROPS));
	await screen.findByRole('combobox', { name: 'Unit for Test ratio (r)' });
	const calculate = screen.getByRole('button', { name: 'Calculate' }) as HTMLButtonElement;
	await waitFor(() => expect(calculate.disabled).toBe(false));
}

async function solve(label: string, value: string): Promise<void> {
	fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
	fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
	await waitFor(() => expect(resultLine()).not.toBe(''));
}

beforeEach(() => {
	localStorage.clear();
	vi.stubGlobal('fetch', async () => Response.json(buildConverterPayload(SLICE, 'en')));
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	writeText.mockClear();
});

describe('calculator island display units', () => {
	it('labels a level with its display unit and offers it no conversion', async () => {
		await renderLoaded();
		expect(screen.getByLabelText('Test level (dB)')).toBeTruthy();
		expect(screen.queryByRole('combobox', { name: /Test level/ })).toBeNull();
		expect(screen.queryByRole('checkbox')).toBeNull();
	});

	it('prints and copies a solved level with its display unit', async () => {
		await renderLoaded();
		await solve('Test ratio (r)', '100');
		expect(resultLine()).toBe('L=20dB');
		fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith('L = 20 dB'));
	});

	it('takes a typed level as the number of decibels', async () => {
		await renderLoaded();
		await solve('Test level (dB)', '20');
		expect(resultLine()).toBe('r=100');
	});
});

describe('calculator island unit-one terms', () => {
	it('prints no (1) in the label and no trailing 1 in the result or the copy', async () => {
		await renderLoaded();
		expect(screen.getByLabelText('Test ratio (r)')).toBeTruthy();
		await solve('Test level (dB)', '20');
		expect(resultLine()).toBe('r=100');
		fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith('r = 100'));
	});

	it('still converts a ratio to a picked unit and labels it', async () => {
		await renderLoaded();
		const picker = screen.getByRole('combobox', { name: 'Unit for Test ratio (r)' });
		expect(
			Array.from((picker as HTMLSelectElement).options).map((option) => option.textContent),
		).toEqual(['% — Test percent', '1 — Test one']);
		fireEvent.change(picker, { target: { value: 'test-percent' } });
		expect(screen.getByLabelText('Test ratio (%)')).toBeTruthy();
		await solve('Test level (dB)', '20');
		expect(resultLine()).toBe('r=10000%');
	});
});
