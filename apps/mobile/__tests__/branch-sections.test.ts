import { branchesOfCategory } from '@equreka/core/taxonomy';
import { describe, expect, it } from '@jest/globals';
import {
	branchSectionsInCategory,
	branchSectionsOfCollection,
	entriesInBranch,
	orderedBranches,
} from '../entities/content/lookup';
import { COLLECTION_ORDER } from '../entities/content/routes';
import type { MemberCollection } from '../entities/content/types';
import { getPresentation } from '../shared/content/artifact';

const MEMBER_COLLECTIONS = COLLECTION_ORDER.filter(
	(collection): collection is MemberCollection =>
		collection !== 'categories' && collection !== 'branches',
);

function filedEntities(
	collection: MemberCollection,
): { categories: string[]; branches: string[] }[] {
	return Object.values(getPresentation(collection));
}

describe('branch sections', () => {
	it('orders branches by category, then by authored order within it', () => {
		const order = orderedBranches();
		expect(order.indexOf('si-system')).toBeLessThan(order.indexOf('geometry'));
		expect(order.indexOf('mechanics')).toBeLessThan(order.indexOf('thermodynamics'));
		expect(order.indexOf('thermodynamics')).toBeLessThan(order.indexOf('amount-of-substance'));
	});

	it('sections a browse list by branch, repeating multi-branch entries', () => {
		const sections = branchSectionsOfCollection('units', 'en');
		const slugsOf = (branch: string) =>
			sections.find((section) => section.branch === branch)?.entries.map((entry) => entry.slug);
		expect(slugsOf('thermodynamics')).toContain('joule');
		expect(slugsOf('mechanics')).toContain('joule');
		const branchless = filedEntities('units').some((unit) => unit.branches.length === 0);
		expect(sections.some((section) => section.branch === null)).toBe(branchless);
	});

	it('sections a category by its filed branches in authored order, with no General section', () => {
		const chemistry = MEMBER_COLLECTIONS.flatMap(filedEntities).filter((entity) =>
			entity.categories.includes('chemistry'),
		);
		const filed = branchesOfCategory(getPresentation('branches'), 'chemistry').filter((branch) =>
			chemistry.some((entity) => entity.branches.includes(branch)),
		);
		expect(filed).toEqual(expect.arrayContaining(['amount-of-substance', 'atomic-structure']));
		const sections = branchSectionsInCategory('chemistry', 'en');
		expect(sections.map((section) => section.branch)).toEqual(filed);
	});

	it('lists a branch by collection', () => {
		const listing = MEMBER_COLLECTIONS.filter((collection) =>
			filedEntities(collection).some((entity) => entity.branches.includes('amount-of-substance')),
		);
		expect(listing).toEqual(expect.arrayContaining(['magnitudes', 'units', 'constants']));
		const groups = entriesInBranch('amount-of-substance', 'en');
		expect(groups.map((group) => group.collection)).toEqual(listing);
	});
});
