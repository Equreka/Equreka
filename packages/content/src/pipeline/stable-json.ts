export interface StableStringifyOptions {
	compact?: boolean;
}

/**
 * JSON.stringify with recursively sorted object keys: tab-indented by
 * default for files people open (editor schemas, cache-key inputs),
 * whitespace-free with `compact` for shipped artifacts, whose bytes count
 * against their budgets (ADR 0010). dist/ artifacts must be byte-identical
 * across builds and platforms so Turborepo caching and content-hash
 * comparisons stay meaningful.
 */
export function stableStringify(value: unknown, options: StableStringifyOptions = {}): string {
	return JSON.stringify(sortValue(value), null, options.compact === true ? undefined : '\t');
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortValue);
	}
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
			a < b ? -1 : a > b ? 1 : 0,
		);
		return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
	}
	return value;
}
