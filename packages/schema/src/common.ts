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
 * Boolean under the failsafe YAML parse, where every scalar arrives as a
 * string: exactly 'true'/'false' coerce; YAML 1.1 spellings ('yes', 'on',
 * '1') fail loudly. Native booleans stay valid for TS callers.
 */
export const strictBool = z.union([
	z.boolean(),
	z.enum(['true', 'false']).transform((value) => value === 'true'),
]);

/**
 * Integer under the failsafe YAML parse: a base-10 digit string coerces via
 * Number() with a safe-integer assert; native ints stay valid for TS callers.
 */
export const intFromString = z.union([
	z.number().int(),
	z
		.string()
		.regex(/^-?\d+$/, 'integer string like "2" or "-1"')
		.transform((value, ctx) => {
			const parsed = Number(value);
			if (!Number.isSafeInteger(parsed)) {
				ctx.addIssue({ code: 'custom', message: `integer exceeds safe range: ${value}` });
				return z.NEVER;
			}
			return parsed;
		}),
]);

/**
 * Exact ratio for factors that have no finite decimal form (Fahrenheit's
 * 5/9). Digit strings only — a number union would reopen the float64
 * truncation leak the failsafe parse closed; consumers feed BigInt directly.
 */
export const rational = z.object({
	num: z.string().regex(/^-?\d+$/, 'integer string like "5" or "-2"'),
	den: z.string().regex(/^[1-9]\d*$/, 'positive integer string like "9"'),
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
 * Provenance of one authored number: the publication (`name`), an optional
 * locator inside it (`ref`: table, section or entry, e.g. 'B.8'), and an
 * optional link. `name: 'convention'` marks a value fixed by customary
 * definition rather than by a standards body; `ref` then states the rule.
 */
export const valueSource = z
	.object({
		name: z.string().min(1),
		url: z.url().optional(),
		ref: z.string().min(1).optional(),
	})
	.strict();

/**
 * Editorial state: `reviewed` asserts a human checked the entry's numbers
 * against the cited source; every entry starts as `draft`.
 */
export const editorialStatus = z.enum(['draft', 'reviewed']);

/**
 * Cross-vocabulary identities for disambiguation and linked-data export:
 * a Wikidata item QID and a QUDT vocabulary IRI.
 */
export const externalIds = z
	.object({
		wikidata: z
			.string()
			.regex(/^Q[1-9]\d*$/, 'Wikidata QID like "Q11573"')
			.optional(),
		qudt: z.url({ protocol: /^https?$/, hostname: /^qudt\.org$/ }).optional(),
	})
	.strict();

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
	status: editorialStatus.default('draft'),
	externalIds: externalIds.optional(),
});

export type Slug = z.infer<typeof slug>;
export type DecimalString = z.infer<typeof decimalString>;
export type Rational = z.infer<typeof rational>;
export type ExactNumber = z.infer<typeof exactNumber>;
export type LocalizedText = z.infer<typeof localizedText>;
export type Symbol = z.infer<typeof symbol>;
export type Reference = z.infer<typeof reference>;
export type ValueSource = z.infer<typeof valueSource>;
export type EditorialStatus = z.infer<typeof editorialStatus>;
export type ExternalIds = z.infer<typeof externalIds>;
