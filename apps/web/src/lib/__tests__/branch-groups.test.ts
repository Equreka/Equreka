import branchesPresentation from '@equreka/content/artifact/presentation/branches.json';
import unitsPresentation from '@equreka/content/artifact/presentation/units.json';
import { branchesOfCategory, groupByBranch } from '@equreka/core/taxonomy';
import { describe, expect, it } from 'vitest';

const branches = branchesPresentation as unknown as Record<
	string,
	{ category: string; order: number }
>;

const units = unitsPresentation as unknown as Record<
	string,
	{ categories: string[]; branches: string[] }
>;

const entry = (slug: string, entryBranches: string[]) => ({ slug, branches: entryBranches });

describe('branchesOfCategory', () => {
	it('orders a category by authored order, then slug', () => {
		const record = {
			b: { category: 'physics', order: 1 },
			a: { category: 'physics', order: 1 },
			c: { category: 'physics', order: 0 },
			z: { category: 'chemistry', order: 0 },
		};
		expect(branchesOfCategory(record, 'physics')).toEqual(['c', 'a', 'b']);
		expect(branchesOfCategory(record, 'mathematics')).toEqual([]);
	});

	it('opens physics on mechanics in the real artifact', () => {
		expect(branchesOfCategory(branches, 'physics')[0]).toBe('mechanics');
	});
});

describe('groupByBranch', () => {
	it('groups in branch order, repeats multi-branch entries and trails the unfiled group', () => {
		const entries = [
			entry('joule', ['mechanics', 'thermodynamics']),
			entry('kelvin', ['thermodynamics']),
			entry('pi', ['geometry']),
			entry('loose', []),
		];
		expect(
			groupByBranch(entries, ['mechanics', 'waves', 'thermodynamics']).map((group) => [
				group.branch,
				group.entries.map((item) => item.slug),
			]),
		).toEqual([
			['mechanics', ['joule']],
			['thermodynamics', ['joule', 'kelvin']],
			[null, ['pi', 'loose']],
		]);
	});

	it('omits the unfiled group when every entry has a branch of the category', () => {
		expect(groupByBranch([entry('metre', ['mechanics'])], ['mechanics'])).toEqual([
			{ branch: 'mechanics', entries: [entry('metre', ['mechanics'])] },
		]);
	});

	it('files every physics unit of the real artifact under a physics branch', () => {
		const physicsUnits = Object.entries(units)
			.filter(([, unit]) => unit.categories.includes('physics'))
			.map(([slug, unit]) => ({ slug, branches: unit.branches }));
		const groups = groupByBranch(physicsUnits, branchesOfCategory(branches, 'physics'));
		expect(groups.some((group) => group.branch === null)).toBe(false);
		expect(groups.find((group) => group.branch === 'thermodynamics')?.entries).toContainEqual({
			slug: 'kelvin',
			branches: ['thermodynamics'],
		});
	});
});
