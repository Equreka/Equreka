const ENTRY_ROUTES: Record<string, (slug: string) => string> = {
	categories: (slug) => `/categories/${slug}/`,
	branches: (slug) => `/branches/${slug}/`,
	magnitudes: (slug) => `/magnitudes/${slug}/`,
	units: (slug) => `/units/${slug}/`,
	prefixes: (slug) => `/prefixes/#${slug}`,
	constants: (slug) => `/constants/${slug}/`,
	equations: (slug) => `/equations/${slug}/`,
	paths: (slug) => `/paths/${slug}/`,
};

/**
 * Site route for one catalog entry, or undefined for collections without a
 * page (variables). Prefixes share the single /prefixes/ page, so
 * every prefix routes to its anchor there. Island-safe: pure strings, no
 * server imports.
 */
export function entryHref(collection: string, slug: string): string | undefined {
	return ENTRY_ROUTES[collection]?.(slug);
}

/**
 * `href` carrying the learning-path context the dormant PathContextBar
 * reads client-side (`?path=&step=`), inserted before any fragment so the
 * prefixes anchor still lands.
 */
export function withPathContext(href: string, pathSlug: string, stepId: string): string {
	const hashAt = href.indexOf('#');
	const base = hashAt === -1 ? href : href.slice(0, hashAt);
	const hash = hashAt === -1 ? '' : href.slice(hashAt);
	const query = `path=${encodeURIComponent(pathSlug)}&step=${encodeURIComponent(stepId)}`;
	return `${base}${base.includes('?') ? '&' : '?'}${query}${hash}`;
}

/**
 * Route for a step with no entry page of its own (prose, check, or an
 * entry into a page-less collection): the step's anchor on its path page.
 */
export function pathStepAnchor(pathSlug: string, stepId: string): string {
	return `/paths/${pathSlug}/#step-${stepId}`;
}
