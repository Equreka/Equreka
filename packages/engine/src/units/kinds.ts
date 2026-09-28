import type { CompiledMagnitude } from '@equreka/schema';

/**
 * The slice fields the quantity-kind walk reads, so a trimmed client payload
 * can drive it without rebuilding full magnitudes.
 */
export type KindGraph = Readonly<
	Record<string, Pick<CompiledMagnitude, 'slug' | 'dimension' | 'kindOf'>>
>;

/**
 * How a magnitude relates to every other magnitude of its dimension:
 * `broader` is its kindOf chain nearest first, `narrower` every transitive
 * specialization, `sameDimension` the remaining same-dimension magnitudes —
 * distinct kinds (siblings included) that only share a dimension.
 */
export interface KindRelations {
	broader: string[];
	narrower: string[];
	sameDimension: string[];
}

/**
 * The kindOf chain above `slug`, nearest first. Stops at an unknown parent
 * or a repeat, so a malformed graph (the build rejects cycles) terminates.
 */
export function kindAncestors(graph: KindGraph, slug: string): string[] {
	const chain: string[] = [];
	let parent = graph[slug]?.kindOf;
	while (
		parent !== undefined &&
		parent !== slug &&
		!chain.includes(parent) &&
		graph[parent] !== undefined
	) {
		chain.push(parent);
		parent = graph[parent]?.kindOf;
	}
	return chain;
}

/**
 * Every magnitude whose kindOf chain passes through `slug`, sorted.
 */
export function kindDescendants(graph: KindGraph, slug: string): string[] {
	return Object.keys(graph)
		.filter((candidate) => candidate !== slug && kindAncestors(graph, candidate).includes(slug))
		.sort();
}

/**
 * The magnitudes whose units measure `slug` without leaving its kind: the
 * magnitude itself, its ancestors (a unit of energy measures work) and its
 * descendants (work is an energy, so a work unit converts energy). Siblings
 * are excluded — heat's units do not scope work. Empty for an unknown slug.
 */
export function kindFamily(graph: KindGraph, slug: string): string[] {
	if (graph[slug] === undefined) return [];
	return [...new Set([slug, ...kindAncestors(graph, slug), ...kindDescendants(graph, slug)])];
}

export function kindRelations(graph: KindGraph, slug: string): KindRelations {
	const own = graph[slug];
	if (own === undefined) return { broader: [], narrower: [], sameDimension: [] };
	const family = new Set(kindFamily(graph, slug));
	const dimensionKey = own.dimension.join(',');
	return {
		broader: kindAncestors(graph, slug),
		narrower: kindDescendants(graph, slug),
		sameDimension: Object.values(graph)
			.filter(
				(magnitude) =>
					!family.has(magnitude.slug) && magnitude.dimension.join(',') === dimensionKey,
			)
			.map((magnitude) => magnitude.slug)
			.sort(),
	};
}
