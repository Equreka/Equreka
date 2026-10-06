export interface BranchOrdering {
	category: string;
	order: number;
}

/**
 * One navigation group: the entries filed under `branch`, or under no branch
 * of the category when `branch` is null (rendered as "General").
 */
export interface BranchGroup<T> {
	branch: string | null;
	entries: T[];
}

/**
 * Slugs of the category's branches in display order: authored `order`, then
 * slug so equal orders still sort deterministically.
 */
export function branchesOfCategory(
	branches: Readonly<Record<string, BranchOrdering>>,
	category: string,
): string[] {
	return Object.entries(branches)
		.filter(([, branch]) => branch.category === category)
		.sort(([slugA, a], [slugB, b]) => a.order - b.order || (slugA < slugB ? -1 : 1))
		.map(([slug]) => slug);
}

/**
 * Groups entries by branch in `branchOrder` sequence, shared by the web
 * pages and the mobile screens so both navigate the same taxonomy. An entry
 * filed under several of the branches appears in each; entries filed under
 * none of them form a trailing null group. Empty groups are omitted and
 * each group keeps the input order, so callers sort entries once, upfront.
 */
export function groupByBranch<T extends { branches: readonly string[] }>(
	entries: readonly T[],
	branchOrder: readonly string[],
): BranchGroup<T>[] {
	const groups: BranchGroup<T>[] = branchOrder
		.map((branch) => ({
			branch,
			entries: entries.filter((entry) => entry.branches.includes(branch)),
		}))
		.filter((group) => group.entries.length > 0);
	const unfiled = entries.filter(
		(entry) => !entry.branches.some((branch) => branchOrder.includes(branch)),
	);
	return unfiled.length === 0 ? groups : [...groups, { branch: null, entries: unfiled }];
}
