import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { CalculatorScreen } from '../features/calculator/calculator-screen';
import { getEngineSlice } from '../shared/content/artifact';
import type { RuntimeMath } from '../shared/math/runtime-mathjax';
import { renderWithProvider } from './helpers/render';

jest.mock('expo-router', () => ({
	useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const rejectingRenderer: RuntimeMath = {
	render: async () => {
		throw new Error('renderer unavailable');
	},
};

function chip(group: string, unit: string) {
	return within(screen.getByLabelText(group)).getByLabelText(unit);
}

function isSelected(group: string, unit: string): boolean {
	return chip(group, unit).props.accessibilityState?.selected === true;
}

describe('CalculatorScreen unit selection', () => {
	it('offers unit chips per unit-bearing term, defaulting to the base unit', async () => {
		await renderWithProvider(
			<CalculatorScreen slug="mass-energy-equivalence" renderer={rejectingRenderer} />,
		);
		expect(isSelected('Unit for Mass (m)', 'Kilogram')).toBe(true);
		expect(isSelected('Unit for Mass (m)', 'Gram')).toBe(false);
		expect(isSelected('Unit for Energy (E)', 'Joule')).toBe(true);
		expect(chip('Unit for Energy (E)', 'Erg')).toBeTruthy();
		expect(screen.queryByLabelText('Unit for Speed of light (c)')).toBeNull();
	});

	it('converts a gram input to kilograms before solving', async () => {
		await renderWithProvider(
			<CalculatorScreen slug="mass-energy-equivalence" renderer={rejectingRenderer} />,
		);
		await fireEvent.press(chip('Unit for Mass (m)', 'Gram'));
		await fireEvent.changeText(screen.getByLabelText('Mass (m)'), '1');
		expect(isSelected('Unit for Mass (m)', 'Gram')).toBe(true);
		expect(screen.getByText('89875500000000')).toBeTruthy();
		expect(screen.getByText(/\(E\) =/)).toBeTruthy();
		expect(await screen.findByText('E = 0.001 * 299792458^2')).toBeTruthy();
		expect(
			screen.getByText(
				"The substituted form shows each value in its term's base unit, the units the formula is written in.",
			),
		).toBeTruthy();
	});

	it('shows the result in its own picked unit, shared with the solved field', async () => {
		await renderWithProvider(
			<CalculatorScreen slug="mass-energy-equivalence" renderer={rejectingRenderer} />,
		);
		await fireEvent.changeText(screen.getByLabelText('Mass (m)'), '0.001');
		expect(isSelected('Result unit', 'Joule')).toBe(true);
		await fireEvent.press(chip('Result unit', 'Erg'));
		expect(screen.getByText('898755000000000000000')).toBeTruthy();
		expect(isSelected('Unit for Energy (E)', 'Erg')).toBe(true);
	});

	it('renders no unit chips for unitless terms', async () => {
		const unitless = Object.values(getEngineSlice().equations).find(
			(equation) =>
				equation.calculatorEnabled &&
				Object.values(equation.terms).every(
					(term) => term.kind === 'symbol' && term.unit === undefined,
				),
		);
		expect(unitless).toBeDefined();
		await renderWithProvider(<CalculatorScreen slug={unitless?.slug ?? ''} />);
		expect(screen.queryByLabelText(/^Unit for /)).toBeNull();
	});
});
