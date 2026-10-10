import { presentationShardOf } from '@equreka/content/presentation-shards';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';
import {
	branchSectionsOfCollection,
	getEntity,
	getSummary,
	listEntries,
} from '../entities/content/lookup';
import { BranchScreen } from '../features/branch/branch-screen';
import { CategoryScreen } from '../features/category/category-screen';
import { EntryScreen } from '../features/entry/entry-screen';
import { buildSearchLanes, runSearch } from '../features/search/use-search-lanes';
import { getPresentationShard } from '../shared/content/artifact';
import { renderWithProvider } from './helpers/render';

jest.mock('expo-router', () => ({
	useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('../shared/content/artifact', () => {
	const actual = jest.requireActual<typeof import('../shared/content/artifact')>(
		'../shared/content/artifact',
	);
	return { ...actual, getPresentationShard: jest.fn(actual.getPresentationShard) };
});

const shardLoader = jest.mocked(getPresentationShard);

beforeEach(() => {
	shardLoader.mockClear();
});

describe('list, navigation and search screens', () => {
	it('build the browse lists of equations and units from their indexes, evaluating no detail shard', () => {
		const equations = branchSectionsOfCollection('equations', 'en').flatMap(
			(section) => section.entries,
		);
		expect(equations.map((entry) => entry.name)).toContain('Pythagorean theorem');
		expect(listEntries('units', 'en').find((entry) => entry.slug === 'kelvin')).toMatchObject({
			name: 'Kelvin',
			symbolText: 'K',
		});
		expect(shardLoader).not.toHaveBeenCalled();
	});

	it('section a category and list a branch, evaluating no detail shard', async () => {
		await renderWithProvider(<CategoryScreen slug="physics" />);
		expect(screen.getByText('Thermodynamics')).toBeTruthy();
		await renderWithProvider(<BranchScreen slug="thermodynamics" />);
		expect(screen.getByText(/^Kelvin\s+K$/)).toBeTruthy();
		expect(shardLoader).not.toHaveBeenCalled();
	});

	it('resolve cross-references and search, evaluating no detail shard', () => {
		expect(getSummary('units', 'kelvin', 'en')).toMatchObject({ name: 'Kelvin', symbolText: 'K' });
		const rows = runSearch(buildSearchLanes('en'), 'pythagorean');
		expect(rows.map((row) => row.key)).toContain('equations:pythagorean-theorem');
		expect(shardLoader).not.toHaveBeenCalled();
	});
});

describe('entry screens', () => {
	it('render an equation from the one shard its slug hashes to', async () => {
		await renderWithProvider(<EntryScreen collection="equations" slug="pythagorean-theorem" />);
		expect(screen.getByText('Pythagorean theorem')).toBeTruthy();
		expect(screen.getByText('Leg a')).toBeTruthy();
		expect(shardLoader.mock.calls).toEqual([
			['equations', presentationShardOf('equations', 'pythagorean-theorem')],
		]);
	});

	it('merge an entry once and serve the same object afterwards', () => {
		const first = getEntity('units', 'nautical-mile');
		expect(first?.description?.en).toMatch(/navigation/);
		expect(getEntity('units', 'nautical-mile')).toBe(first);
		expect(shardLoader.mock.calls).toEqual([
			['units', presentationShardOf('units', 'nautical-mile')],
		]);
	});
});
