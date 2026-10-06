import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
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
	return {
		...actual,
		getEngineSlice: () => ({
			...slice,
			equations: {
				...slice.equations,
				'arc-length': {
					slug: 'arc-length',
					kind: 'formula',
					name: { en: 'Arc length' },
					calculatorEnabled: true,
					terms: {
						s: { kind: 'symbol', label: { en: 'Arc' }, unit: 'metre', identifier: 's' },
						'r_{0}': { kind: 'symbol', label: { en: 'Radius' }, unit: 'metre', identifier: 'r_0' },
						'\\theta': {
							kind: 'symbol',
							label: { en: 'Angle' },
							unit: 'radian',
							identifier: 'theta',
						},
					},
					solvable: ['\\theta', 's'],
				},
				combinations: {
					slug: 'combinations',
					kind: 'formula',
					name: { en: 'Combinations' },
					calculatorEnabled: true,
					terms: {
						C: { kind: 'symbol', label: { en: 'Combinations' }, identifier: 'C' },
						n: { kind: 'symbol', label: { en: 'Items' }, identifier: 'n', integer: true },
						k: { kind: 'symbol', label: { en: 'Chosen' }, identifier: 'k', integer: true },
					},
					solvable: ['C'],
				},
			},
		}),
		getSolutions: () => ({
			...actual.getSolutions(),
			'arc-length': {
				s: ({ r_0 = Number.NaN, theta = Number.NaN }: Record<string, number>) => r_0 * theta,
				'\\theta': ({ s = Number.NaN, r_0 = Number.NaN }: Record<string, number>) => s / r_0,
			},
			combinations: { C: () => 10 },
		}),
	};
});

const rejectingRenderer: RuntimeMath = {
	render: async () => {
		throw new Error('renderer unavailable');
	},
};

describe('CalculatorScreen term symbols and the solvable set', () => {
	it('labels a TeX-keyed term with plain text, never raw TeX', async () => {
		await renderWithProvider(<CalculatorScreen slug="arc-length" renderer={rejectingRenderer} />);
		expect(screen.getByLabelText('Angle (θ)')).toBeTruthy();
		expect(screen.getByLabelText('Radius (r₀)')).toBeTruthy();
		expect(screen.queryByText(/\\theta|r_\{0\}/)).toBeNull();
		await fireEvent.changeText(screen.getByLabelText('Arc (s)'), '3');
		await fireEvent.changeText(screen.getByLabelText('Radius (r₀)'), '2');
		expect(screen.getByText(/^Angle \(θ\) =/)).toBeTruthy();
		expect(screen.getByText('1.5')).toBeTruthy();
	});

	it('marks a term outside the solvable set as required and names it when left empty', async () => {
		await renderWithProvider(<CalculatorScreen slug="arc-length" renderer={rejectingRenderer} />);
		expect(
			screen.getByText('This calculator solves for s, θ only: fill in every other field.'),
		).toBeTruthy();
		expect(screen.getByPlaceholderText('Required')).toBeTruthy();
		expect(screen.getAllByPlaceholderText('Leave empty to solve')).toHaveLength(2);
		await fireEvent.changeText(screen.getByLabelText('Arc (s)'), '3');
		expect(
			screen.getByText('Fill in r₀. The field to leave empty must be one of: θ, s.'),
		).toBeTruthy();
	});

	it('rejects a fractional value on an integer term', async () => {
		await renderWithProvider(<CalculatorScreen slug="combinations" renderer={rejectingRenderer} />);
		await fireEvent.changeText(screen.getByLabelText('Items (n)'), '5');
		await fireEvent.changeText(screen.getByLabelText('Chosen (k)'), '2.5');
		expect(screen.getByText('Enter a whole number for k.')).toBeTruthy();
		await fireEvent.changeText(screen.getByLabelText('Chosen (k)'), '2');
		expect(screen.getByText('10')).toBeTruthy();
	});
});
