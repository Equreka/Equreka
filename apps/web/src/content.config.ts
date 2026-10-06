import { defineCollection } from 'astro:content';
import { equrekaLoader } from '@equreka/content/astro';

/**
 * Collections load straight from packages/content YAML via the shared
 * loader, which Zod-validates against @equreka/schema — no schema is
 * redeclared here (pages cast entry data through lib/collections.ts).
 */
export const collections = {
	categories: defineCollection({ loader: equrekaLoader('categories') }),
	branches: defineCollection({ loader: equrekaLoader('branches') }),
	magnitudes: defineCollection({ loader: equrekaLoader('magnitudes') }),
	units: defineCollection({ loader: equrekaLoader('units') }),
	prefixes: defineCollection({ loader: equrekaLoader('prefixes') }),
	constants: defineCollection({ loader: equrekaLoader('constants') }),
	variables: defineCollection({ loader: equrekaLoader('variables') }),
	equations: defineCollection({ loader: equrekaLoader('equations') }),
	paths: defineCollection({ loader: equrekaLoader('paths') }),
};
