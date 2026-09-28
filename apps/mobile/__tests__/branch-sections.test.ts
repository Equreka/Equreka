import { describe, expect, it } from '@jest/globals';
import {
	branchSectionsInCategory,
	branchSectionsOfCollection,
	entriesInBranch,
	orderedBranches,
} from '../entities/content/lookup';

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
		expect(sections.some((section) => section.branch === null)).toBe(false);
	});

	it('closes a category with no General section when every entry has a branch', () => {
		const sections = branchSectionsInCategory('chemistry', 'en');
		expect(sections.map((section) => section.branch)).toEqual([
			'amount-of-substance',
			'atomic-structure',
		]);
	});

	it('lists a branch by collection', () => {
		const groups = entriesInBranch('amount-of-substance', 'en');
		expect(groups.map((group) => group.collection)).toEqual(['magnitudes', 'units', 'constants']);
	});
});
