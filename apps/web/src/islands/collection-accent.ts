/**
 * Collection slug to its legacy type-accent class, written as literal class
 * names so Tailwind's scanner and the generated theme selectors match.
 * Categories and branches carry no collection accent and fall back to the
 * default one.
 */
const COLLECTION_ACCENT: Readonly<Record<string, string>> = {
	equations: 'type-equations',
	constants: 'type-constants',
	magnitudes: 'type-magnitudes',
	variables: 'type-variables',
	units: 'type-units',
	prefixes: 'type-prefixes',
	paths: 'type-paths',
};

export function collectionAccent(collection: string): string {
	return COLLECTION_ACCENT[collection] ?? '';
}
