import { defineCollection } from 'astro:content';
import { equrekaLoader } from '@equreka/content/astro';

/**
 * Collections load straight from packages/content YAML via the shared
 * loader, which Zod-validates against @equreka/schema — no schema is
 * redeclared here (pages cast entry data through lib/collections.ts).
 */
export const collections = {
	categories: defineCollection({ loader: equrekaLoader('categories') }),
	magnitudes: defineCollection({ loader: equrekaLoader('magnitudes') }),
	units: defineCollection({ loader: equrekaLoader('units') }),
};
