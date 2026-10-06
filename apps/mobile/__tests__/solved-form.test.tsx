import type { CompiledEquationMeta } from '@equreka/schema';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { CalculatorScreen } from '../features/calculator/calculator-screen';
import { buildSolvedForm } from '../features/calculator/solved-form';
import { SolvedFormView } from '../features/calculator/solved-form-view';
import { getEngineSlice, getPresentation } from '../shared/content/artifact';
import { createRuntimeMath, type RuntimeMath } from '../shared/math/runtime-mathjax';
import { createRuntimeMathCore } from '../shared/math/runtime-mathjax-core';
import { renderWithProvider } from './helpers/render';

jest.mock('expo-router', () => ({
	useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const TEST_BUDGET_MS = 60_000;

const realRenderer: RuntimeMath = createRuntimeMath(
	async () => createRuntimeMathCore(),
	TEST_BUDGET_MS,
);

const rejectingRenderer: RuntimeMath = {
	render: async () => {
		throw new Error('renderer unavailable');
	},
};

function equation(slug: string) {
	const meta = getEngineSlice().equations[slug];
	const presentation = getPresentation('equations')[slug];
	if (meta === undefined || presentation === undefined) throw new Error(`missing ${slug}`);
	return { meta, solutions: presentation.solutions };
}

describe('buildSolvedForm', () => {
	it('emits the symbolic line and the substituted line for the solved term', () => {
		const { meta, solutions } = equation('mass-energy-equivalence');
		const lines = buildSolvedForm(meta, solutions, 'm', { E: '8.99e+16', c: '299792458' });
		expect(lines).not.toBeNull();
		expect(lines?.[0]?.tex).toBe('m = \\frac{E}{c^{2}}');
		expect(lines?.[1]?.tex).toBe('m = \\frac{8.99\\times10^{16}}{\\left(299792458\\right)^{2}}');
		expect(lines?.[1]?.text).toBe('m = 8.99e+16 / 299792458^2');
	});

	it('keeps pi symbolic and never substitutes the solved term itself', () => {
		const { meta, solutions } = equation('area-circle');
		const lines = buildSolvedForm(meta, solutions, 'r', { A: '3', '\\pi': '3.14', r: '9' });
		expect(lines?.[0]).toEqual({ tex: 'r = \\sqrt{\\frac{A}{\\pi}}', text: 'r = sqrt(A / pi)' });
		expect(lines?.[1]).toEqual({ tex: 'r = \\sqrt{\\frac{3}{\\pi}}', text: 'r = sqrt(3 / pi)' });
	});

	it('returns null without an authored solution or with an unparsable one', () => {
		const { meta } = equation('pythagorean-theorem');
		expect(buildSolvedForm(meta, {}, 'a', {})).toBeNull();
		expect(buildSolvedForm(meta, { a: 'sqrt(' }, 'a', {})).toBeNull();
	});

	it('shows the solved form of the root the engine chose', () => {
		const meta: CompiledEquationMeta = {
			slug: 'projectile-range',
			kind: 'equation',
			name: { en: 'Projectile range' },
			calculatorEnabled: true,
			terms: {
				R: { kind: 'symbol', identifier: 'R' },
				v: { kind: 'symbol', identifier: 'v' },
				'\\theta': { kind: 'symbol', identifier: 'theta' },
				g: { kind: 'symbol', identifier: 'g' },
			},
			solvable: ['R', '\\theta'],
		};
		const solutions = {
			'\\theta': ['asin(g * R / v^2) / 2', 'pi / 2 - asin(g * R / v^2) / 2'],
		};
		const knowns = { R: '5', v: '10', g: '9.8' };
		expect(buildSolvedForm(meta, solutions, '\\theta', knowns)?.[0]?.text).toBe(
			'θ = asin(g * R / v^2) / 2',
		);
		const second = buildSolvedForm(meta, solutions, '\\theta', knowns, 1);
		expect(second?.[0]?.tex).toBe(
			'\\theta = \\frac{\\pi}{2} - \\frac{\\arcsin\\left(\\frac{g R}{v^{2}}\\right)}{2}',
		);
		expect(second?.[1]?.text).toBe('θ = pi / 2 - asin(9.8 * 5 / 10^2) / 2');
		expect(buildSolvedForm(meta, solutions, '\\theta', knowns, 2)).toBeNull();
	});
});

describe('SolvedFormView', () => {
	const lines = [
		{ tex: 'm = \\frac{E}{c^{2}}', text: 'm = E / c^2' },
		{ tex: 'm = \\frac{2}{\\left(3\\right)^{2}}', text: 'm = 2 / 3^2' },
	];

	it('falls back to the plain solution text when the renderer rejects', async () => {
		await renderWithProvider(<SolvedFormView lines={lines} renderer={rejectingRenderer} />);
		expect(await screen.findByText('m = E / c^2')).toBeTruthy();
		expect(await screen.findByText('m = 2 / 3^2')).toBeTruthy();
		expect(screen.queryByTestId('runtime-math')).toBeNull();
	});

	it('draws each line as runtime SVG when the renderer succeeds', async () => {
		await renderWithProvider(<SolvedFormView lines={lines} renderer={realRenderer} />);
		const drawn = await screen.findAllByTestId('runtime-math', {}, { timeout: TEST_BUDGET_MS });
		expect(drawn).toHaveLength(2);
		expect(screen.queryByText('m = E / c^2')).toBeNull();
	});
});

describe('CalculatorScreen solved form', () => {
	it('shows the numeric result and typesets the solved form after one input', async () => {
		await renderWithProvider(
			<CalculatorScreen slug="mass-energy-equivalence" renderer={realRenderer} />,
		);
		await fireEvent.changeText(screen.getByLabelText('Energy (E)'), '8.99e16');
		expect(screen.getByText(/\(m\) =/)).toBeTruthy();
		const drawn = await screen.findAllByTestId('runtime-math', {}, { timeout: TEST_BUDGET_MS });
		expect(drawn).toHaveLength(2);
	});

	it('keeps the numeric result when the renderer is unavailable', async () => {
		await renderWithProvider(
			<CalculatorScreen slug="mass-energy-equivalence" renderer={rejectingRenderer} />,
		);
		await fireEvent.changeText(screen.getByLabelText('Mass (m)'), '2');
		expect(screen.getByText(/\(E\) =/)).toBeTruthy();
		expect(await screen.findByText(/^E = m \* c\^2$/)).toBeTruthy();
	});
});
