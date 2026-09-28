import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { BranchScreen } from '../features/branch/branch-screen';
import { CategoryScreen } from '../features/category/category-screen';
import { EntryScreen } from '../features/entry/entry-screen';
import { HomeScreen } from '../features/home/home-screen';
import { SettingsScreen } from '../features/settings/settings-screen';
import { renderWithProvider } from './helpers/render';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
	useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-sharing', () => ({
	isAvailableAsync: jest.fn(async () => false),
	shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-document-picker', () => ({
	getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-file-system', () => ({
	File: class MockFile {
		uri = 'file:///mock';
		write(): void {}
		async text(): Promise<string> {
			return '{}';
		}
	},
	Paths: { cache: { uri: 'file:///cache/' } },
}));

describe('HomeScreen', () => {
	it('renders the lead, category chips and browse cards, and navigates on press', async () => {
		await renderWithProvider(<HomeScreen />);
		expect(screen.getByText('Equreka')).toBeTruthy();
		expect(screen.getByText('Physics')).toBeTruthy();
		await fireEvent.press(screen.getByText('Units'));
		expect(mockPush).toHaveBeenCalledWith('/browse/units');
	});
});

describe('SettingsScreen', () => {
	it('switches the locale through the shared settings hook', async () => {
		await renderWithProvider(<SettingsScreen />);
		expect(screen.getByText('Settings')).toBeTruthy();
		await fireEvent.press(screen.getByText('Español'));
		expect(screen.getByText('Ajustes')).toBeTruthy();
		await fireEvent.press(screen.getByText('English'));
		expect(screen.getByText('Settings')).toBeTruthy();
	});
});

describe('EntryScreen', () => {
	it('renders a unit with its engine-computed conversions', async () => {
		await renderWithProvider(<EntryScreen collection="units" slug="metre" />);
		expect(screen.getByText('Metre')).toBeTruthy();
		expect(screen.getByText('Conversions')).toBeTruthy();
		expect(screen.getByText(/^Kilometre/)).toBeTruthy();
	});

	it('renders a constant at six figures and full precision', async () => {
		await renderWithProvider(<EntryScreen collection="constants" slug="avogadro-constant" />);
		expect(screen.getByText('Avogadro constant')).toBeTruthy();
		expect(screen.getByText('Full precision')).toBeTruthy();
	});

	it('marks a draft entry', async () => {
		await renderWithProvider(<EntryScreen collection="units" slug="metre" />);
		expect(screen.getByText('draft')).toBeTruthy();
	});

	it('leaves a reviewed entry unmarked', async () => {
		await renderWithProvider(<EntryScreen collection="units" slug="stone" />);
		expect(screen.getByText('Stone')).toBeTruthy();
		expect(screen.queryByText('draft')).toBeNull();
	});

	it('renders a magnitude-less compound unit without a magnitude link or converter', async () => {
		await renderWithProvider(<EntryScreen collection="units" slug="reciprocal-mole" />);
		expect(screen.getByText('Reciprocal mole')).toBeTruthy();
		expect(screen.getByText('compound')).toBeTruthy();
		expect(
			screen.getByText(
				'Compound unit: its dimension comes from its composition, not from a named magnitude.',
			),
		).toBeTruthy();
		expect(screen.queryByText(/^Convert /)).toBeNull();
	});

	it('lists quantity-kind neighbours and the kind-family units of a magnitude', async () => {
		await renderWithProvider(<EntryScreen collection="magnitudes" slug="work" />);
		expect(screen.getByText('Broader kind')).toBeTruthy();
		expect(screen.getByText(/^Energy\s+E$/)).toBeTruthy();
		expect(screen.getByText('Same dimension')).toBeTruthy();
		expect(screen.getByText(/^Heat\s+Q$/)).toBeTruthy();
		expect(screen.getByText(/^Erg\s/)).toBeTruthy();
		expect(screen.queryByText('Narrower kinds')).toBeNull();
	});

	it('lists narrower kinds on a parent magnitude', async () => {
		await renderWithProvider(<EntryScreen collection="magnitudes" slug="energy" />);
		expect(screen.getByText('Narrower kinds')).toBeTruthy();
		expect(screen.getByText(/^Work\s+W$/)).toBeTruthy();
		expect(screen.getByText(/^Heat\s+Q$/)).toBeTruthy();
		expect(screen.queryByText('Broader kind')).toBeNull();
	});

	it('reports an unknown entry instead of crashing', async () => {
		await renderWithProvider(<EntryScreen collection="units" slug="does-not-exist" />);
		expect(screen.getByText('This entry is not in the bundled library.')).toBeTruthy();
	});
});

describe('CategoryScreen', () => {
	it('sections a category by branch in authored order and opens a branch screen', async () => {
		await renderWithProvider(<CategoryScreen slug="physics" />);
		expect(screen.getByText('Mechanics')).toBeTruthy();
		expect(screen.getByText('Modern physics')).toBeTruthy();
		expect(screen.queryByText(/^General/)).toBeNull();
		await fireEvent.press(screen.getByText('Thermodynamics'));
		expect(mockPush).toHaveBeenCalledWith('/branch/thermodynamics');
	});
});

describe('BranchScreen', () => {
	it("lists the branch's entries by collection under its category badge", async () => {
		await renderWithProvider(<BranchScreen slug="thermodynamics" />);
		expect(screen.getByText('Thermodynamics')).toBeTruthy();
		expect(screen.getByText('Branch of Physics')).toBeTruthy();
		expect(screen.getByText(/^Kelvin/)).toBeTruthy();
		expect(screen.getByText(/^Boltzmann constant/)).toBeTruthy();
		expect(screen.queryByText(/^Metre/)).toBeNull();
	});

	it('reports an unknown branch instead of crashing', async () => {
		await renderWithProvider(<BranchScreen slug="alchemy" />);
		expect(screen.getByText('This entry is not in the bundled library.')).toBeTruthy();
	});
});
