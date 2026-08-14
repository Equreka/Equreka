const ENTRY_ROUTES: Record<string, (slug: string) => string> = {
	categories: (slug) => `/categories/${slug}/`,
	magnitudes: (slug) => `/magnitudes/${slug}/`,
	units: (slug) => `/units/${slug}/`,
	prefixes: (slug) => `/prefixes/#${slug}`,
	constants: (slug) => `/constants/${slug}/`,
	equations: (slug) => `/equations/${slug}/`,
};

/**
 * Site route for one catalog entry, or undefined for collections without a
 * page (variables, paths). Prefixes share the single /prefixes/ page, so
 * every prefix routes to its anchor there. Island-safe: pure strings, no
 * server imports.
 */
export function entryHref(collection: string, slug: string): string | undefined {
	return ENTRY_ROUTES[collection]?.(slug);
}
