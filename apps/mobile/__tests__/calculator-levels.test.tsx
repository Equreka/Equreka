import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { CalculatorScreen } from '../features/calculator/calculator-screen';
import type { RuntimeMath } from '../shared/math/runtime-mathjax';
import { renderWithProvider } from './helpers/render';

jest.mock('expo-router', () => ({
	useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('../shared/content/artifact', () => {
	const actual = jest.requireActual<typeof import('../shared/content/artifact')>(
		'../shared/content/artifact',
	);
	const slice = actual.getEngineSlice();
	const units = actual.getPresentation('units');
	return {
		...actual,
		getMathBody: () => undefined,
		getPresentation: (collection: Parameters<typeof actual.getPresentation>[0]) =>
			collection === 'units'
				? { ...units, 'test-bel': { ...units.unitless, symbolTex: 'dB', symbolText: 'dB' } }
				: actual.getPresentation(collection),
		getEngineSlice: () => ({
			...slice,
			magnitudes: {
				...slice.magnitudes,
				'test-level': {
					slug: 'test-level',
					name: { en: 'Test level' },
					symbolTex: 'L',
					baseUnit: 'unitless',
					displayUnit: {
						slug: 'test-bel',
						name: { en: 'Test decibel' },
						symbolTex: 'dB',
						symbolText: 'dB',
					},
					dimension: [0, 0, 0, 0, 0, 0, 0, 0],
					nonNegative: false,
				},
			},
			equations: {
				...slice.equations,
				'test-level-formula': {
					slug: 'test-level-formula',
					kind: 'formula',
					name: { en: 'Test level formula' },
					calculatorEnabled: true,
					terms: {
						L: { kind: 'magnitude', ref: 'test-level', identifier: 'L' },
						r: { kind: 'symbol', label: { en: 'Ratio' }, unit: 'unitless', identifier: 'r' },
					},
					solvable: ['L', 'r'],
				},
			},
		}),
		getSolutions: () => ({
			...actual.getSolutions(),
			'test-level-formula': {
				L: ({ r = Number.NaN }: Record<string, number>) => 10 * Math.log10(r),
				r: ({ L = Number.NaN }: Record<string, number>) => 10 ** (L / 10),
			},
		}),
	};
});

const rejectingRenderer: RuntimeMath = {
	render: async () => {
		throw new Error('renderer unavailable');
	},
};

/**
 * A synthetic level (display unit `test-bel`, symbol dB) beside a ratio
 * on the corpus unit one. The artifact mock withholds math bodies, so
 * every unit symbol renders as plain text and can be counted.
 */
function renderLevel() {
	return renderWithProvider(
		<CalculatorScreen slug="test-level-formula" renderer={rejectingRenderer} />,
	);
}

describe('CalculatorScreen display units', () => {
	it('decorates a level with its display unit and offers it no unit', async () => {
		await renderLevel();
		expect(screen.getByLabelText('Test level (L)')).toBeTruthy();
		expect(screen.getAllByText('dB')).toHaveLength(1);
		expect(screen.queryByLabelText('Unit for Test level (L)')).toBeNull();
		expect(screen.getByLabelText('Unit for Ratio (r)')).toBeTruthy();
	});

	it('prints a solved level with its display unit and no unit choice', async () => {
		await renderLevel();
		await fireEvent.changeText(screen.getByLabelText('Ratio (r)'), '100');
		expect(screen.getByText(/^Test level \(L\) =/)).toBeTruthy();
		expect(screen.getByText('20')).toBeTruthy();
		expect(screen.getAllByText('dB')).toHaveLength(2);
		expect(screen.queryByLabelText('Result unit')).toBeNull();
	});
});

describe('CalculatorScreen unit-one terms', () => {
	it('prints no unit one beside the ratio field or its result', async () => {
		await renderLevel();
		const fieldChips = screen.getByLabelText('Unit for Ratio (r)');
		expect(screen.getAllByText('1')).toEqual([within(fieldChips).getByText('1')]);

		await fireEvent.changeText(screen.getByLabelText('Test level (L)'), '20');
		expect(screen.getByText(/^Ratio \(r\) =/)).toBeTruthy();
		expect(screen.getByText('100')).toBeTruthy();
		const resultChips = screen.getByLabelText('Result unit');
		expect(screen.getAllByText('1')).toEqual([
			within(fieldChips).getByText('1'),
			within(resultChips).getByText('1'),
		]);
	});
});
