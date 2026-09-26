import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
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

	it('reports an unknown entry instead of crashing', async () => {
		await renderWithProvider(<EntryScreen collection="units" slug="does-not-exist" />);
		expect(screen.getByText('This entry is not in the bundled library.')).toBeTruthy();
	});
});
