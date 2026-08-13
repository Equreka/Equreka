import { z } from 'zod';

/**
 * Content collections, in canonical display order. The folder name under
 * packages/content/content/ doubles as the collection name.
 */
export const COLLECTIONS = [
	'categories',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/**
 * Kebab-case identifier; the filename (minus extension) is the slug and is
 * never authored inside the file.
 */
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case');

/**
 * Slug reference to another collection. The `ref:<collection>` description is
 * machine-read by the pipeline's referential-integrity pass — do not remove.
 */
export const ref = (collection: CollectionName) => slug.describe(`ref:${collection}`);

/**
 * Arbitrary-precision decimal as a string, preserved verbatim through YAML,
 * artifact, and engine boundaries (ADR 0002: unquoted numbers silently
 * truncate to float64 at parse time). Accepts scientific notation.
 */
export const decimalString = z
	.string()
	.regex(/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/, 'decimal string like "299792458", "0.3048" or "1e-19"');

/**
 * Exact ratio for factors that have no finite decimal form (Fahrenheit's 5/9).
 */
export const rational = z.object({
	num: z.number().int(),
	den: z.number().int().positive(),
});

export const exactNumber = z.union([decimalString, rational]);

/**
 * Localized prose: English is the source language, Spanish lands
 * incrementally (missing es falls back to en with an untranslated notice).
 */
export const localizedText = z.object({
	en: z.string().min(1),
	es: z.string().min(1).optional(),
});

/**
 * Authored symbol: TeX is the single source; plain-text form is derived from
 * TeX unless overridden (HTML is always derived at compile time).
 */
export const symbol = z.object({
	tex: z.string().min(1),
	text: z.string().min(1).optional(),
});

export const reference = z.object({
	title: z.string().min(1),
	url: z.url(),
});

/**
 * Fields shared by every entity. `aliases` holds ASCII transliterations and
 * notation variants ("mu", "ohm", "km/h", "kmh") that feed the exact-match
 * search lane — symbol lookup fails on default tokenizers without them.
 */
export const entityBase = z.object({
	name: localizedText,
	description: localizedText.optional(),
	categories: z.array(ref('categories')).default([]),
	aliases: z.array(z.string().min(1)).default([]),
	references: z.array(reference).default([]),
});

export type Slug = z.infer<typeof slug>;
export type DecimalString = z.infer<typeof decimalString>;
export type Rational = z.infer<typeof rational>;
export type ExactNumber = z.infer<typeof exactNumber>;
export type LocalizedText = z.infer<typeof localizedText>;
export type Symbol = z.infer<typeof symbol>;
export type Reference = z.infer<typeof reference>;
