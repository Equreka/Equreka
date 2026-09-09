import { z } from 'zod';
import {
	decimalString,
	entityBase,
	exactNumber,
	intFromString,
	localizedText,
	ref,
	slug,
	strictBool,
	symbol,
} from './common.js';

export const category = z
	.object({
		name: localizedText,
		description: localizedText.optional(),
		aliases: z.array(z.string().min(1)).default([]),
		order: intFromString.refine((value) => value >= 0, 'order must be nonnegative'),
	})
	.strict();

/**
 * SI base-dimension exponents plus a synthetic angle dimension `A` (ADR 0002:
 * 30° → rad must convert while ° → dimensionless must not silently succeed).
 * Partial: omitted keys are exponent 0.
 */
export const dimensionVector = z
	.object({
		L: intFromString,
		M: intFromString,
		T: intFromString,
		I: intFromString,
		Th: intFromString,
		N: intFromString,
		J: intFromString,
		A: intFromString,
	})
	.partial();

export const magnitude = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		baseUnit: ref('units'),
		dimension: dimensionVector,
		nonNegative: strictBool.default(false),
	})
	.strict();

export const unitSystem = z.enum(['si', 'si-derived', 'imperial', 'uscs', 'cgs', 'other']);

/**
 * Affine mapping to the magnitude's SI-coherent base unit:
 * base = factor · value + offset. Base units themselves omit every
 * derivation field (enforced by the refinement below and by the pipeline
 * against magnitude.baseUnit).
 */
export const toBase = z
	.object({
		factor: exactNumber,
		offset: exactNumber.default('0'),
		exact: strictBool.default(true),
	})
	.strict();

/**
 * One factor of a composed unit: `unit` raised to a nonzero integer power.
 */
export const composeOperand = z
	.object({
		unit: ref('units'),
		exp: intFromString.refine((n) => n !== 0, 'exponent 0 is meaningless'),
	})
	.strict();

/**
 * Product form: this unit = factor · Π unitᵢ^expᵢ. `factor` is an exact
 * scalar (default 1) so exact non-unit ratios compose without a hand-typed
 * decimal (arcminute = degree/60); the pipeline multiplies it into the
 * rational factor chain and verifies the dimension sum against unitOf.
 */
export const compose = z
	.object({
		factor: exactNumber.default('1'),
		of: z.array(composeOperand).min(1),
	})
	.strict();

/**
 * Derivation-free authoring is legal only for the SI-coherent anchors the
 * pipeline whitelists and for nonConvertible units; everything else must
 * derive so its dimension is machine-verified. `nonConvertible` marks
 * wiki-only units with no linear/affine mapping (levels such as the
 * decibel): they resolve no factor, never enter the engine slice, and may
 * not anchor a magnitude or appear in another unit's derivation.
 */
export const unit = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		unitOf: z.array(ref('magnitudes')).min(1),
		system: unitSystem.default('other'),
		nonConvertible: strictBool.default(false),
		toBase: toBase.optional(),
		prefixOf: z
			.object({
				prefix: ref('prefixes'),
				base: ref('units'),
			})
			.strict()
			.optional(),
		compose: compose.optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		const forms = [value.toBase, value.prefixOf, value.compose].filter((f) => f !== undefined);
		if (forms.length > 1) {
			ctx.addIssue({
				code: 'custom',
				message:
					'a unit is authored in at most one form: toBase | prefixOf | compose (none = base unit)',
			});
		}
		if (value.nonConvertible && forms.length > 0) {
			ctx.addIssue({
				code: 'custom',
				message: 'a nonConvertible unit has no mapping to a base and therefore no derivation form',
			});
		}
	});

export const prefix = entityBase
	.extend({
		symbol,
		value: decimalString,
		system: z.enum(['si', 'binary']).default('si'),
	})
	.strict();

export const constant = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		value: decimalString,
		unit: ref('units'),
		exact: strictBool.default(false),
		irrational: strictBool.default(false),
		uncertainty: decimalString.optional(),
		source: z
			.object({
				name: z.string().min(1),
				url: z.url().optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

export const variable = entityBase
	.extend({
		symbol,
		defaultUnit: ref('units').optional(),
	})
	.strict();

/**
 * `symbol` terms are equation-local unknowns with no wiki entity behind
 * them (the legs of a right triangle): a display label plus an optional
 * unit that fixes their dimension for the build-time consistency check.
 */
export const equationTerm = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('magnitude'), ref: ref('magnitudes') }).strict(),
	z.object({ kind: z.literal('constant'), ref: ref('constants') }).strict(),
	z.object({ kind: z.literal('variable'), ref: ref('variables') }).strict(),
	z
		.object({ kind: z.literal('symbol'), label: localizedText, unit: ref('units').optional() })
		.strict(),
]);

/**
 * Equations and formulas share one schema (`kind` is taxonomy only).
 * `expression` is annotated TeX using \mag{}/\const{}/\var{} macros; every
 * macro argument must be a key of `terms` and vice versa (pipeline-enforced).
 * `solutions` are hand-authored per-variable solved forms in a small
 * expression grammar, machine-verified at build (ADR 0002) — the calculator
 * can only solve for symbols listed here. Related units are derived from
 * terms at build time, never authored.
 */
export const equation = entityBase
	.extend({
		kind: z.enum(['equation', 'formula']).default('equation'),
		expression: z.string().min(1),
		terms: z.record(z.string().min(1), equationTerm),
		solutions: z.record(z.string().min(1), z.string().min(1)).default({}),
		calculator: z
			.object({
				enabled: strictBool.default(false),
				solveFor: z.array(z.string().min(1)).optional(),
			})
			.strict()
			.default({ enabled: false }),
	})
	.strict();

/**
 * Wiki collections a path step may point at; `paths` and `categories` are
 * excluded so a step is always one concrete entry (a category is a listing,
 * a nested path is a prerequisite).
 */
export const pathEntryCollection = z.enum([
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
]);

/**
 * The entry a step points at. Nested under `ref` rather than flattened into
 * the step: Astro's content layer treats any `{ collection, id | slug }`
 * object as a reference and would read the step's own `id` as the target.
 */
export const pathEntryRef = z
	.object({
		collection: pathEntryCollection,
		slug: slug,
	})
	.strict();

/**
 * Step grammar v1 (ADR 0004): `entry` sends the learner to one wiki entry,
 * `prose` is authored transition text, `check` is a self-check question
 * whose answer the learner reveals — no grading engine, prose only.
 */
export const pathStep = z.discriminatedUnion('kind', [
	z
		.object({
			id: slug,
			kind: z.literal('entry'),
			ref: pathEntryRef,
			note: localizedText.optional(),
		})
		.strict(),
	z
		.object({
			id: slug,
			kind: z.literal('prose'),
			body: localizedText,
		})
		.strict(),
	z
		.object({
			id: slug,
			kind: z.literal('check'),
			prompt: localizedText,
			answer: localizedText,
		})
		.strict(),
]);

export const pathLevel = z.enum(['intro', 'intermediate', 'advanced']);

/**
 * `prerequisites` reference other paths (resolved and cycle-checked by the
 * pipeline). `estimatedMinutes` is an authored reading-time estimate.
 */
export const path = entityBase
	.extend({
		level: pathLevel,
		prerequisites: z.array(ref('paths')).default([]),
		estimatedMinutes: intFromString
			.refine((value) => value > 0, 'estimatedMinutes must be positive')
			.optional(),
		steps: z.array(pathStep).min(1),
	})
	.strict()
	.superRefine((value, ctx) => {
		const ids = value.steps.map((s) => s.id);
		if (new Set(ids).size !== ids.length) {
			ctx.addIssue({ code: 'custom', message: 'step ids must be unique within a path' });
		}
		if (new Set(value.prerequisites).size !== value.prerequisites.length) {
			ctx.addIssue({ code: 'custom', message: 'prerequisites must not repeat' });
		}
	});

export type Category = z.infer<typeof category>;
export type DimensionVector = z.infer<typeof dimensionVector>;
export type Magnitude = z.infer<typeof magnitude>;
export type Unit = z.infer<typeof unit>;
export type Compose = z.infer<typeof compose>;
export type ComposeOperand = z.infer<typeof composeOperand>;
export type UnitSystem = z.infer<typeof unitSystem>;
export type Prefix = z.infer<typeof prefix>;
export type Constant = z.infer<typeof constant>;
export type Variable = z.infer<typeof variable>;
export type EquationTerm = z.infer<typeof equationTerm>;
export type Equation = z.infer<typeof equation>;
export type PathEntryCollection = z.infer<typeof pathEntryCollection>;
export type PathEntryRef = z.infer<typeof pathEntryRef>;
export type PathLevel = z.infer<typeof pathLevel>;
export type PathStep = z.infer<typeof pathStep>;
export type Path = z.infer<typeof path>;
