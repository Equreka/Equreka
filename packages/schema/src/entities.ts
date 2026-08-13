import { z } from 'zod';
import {
	decimalString,
	entityBase,
	exactNumber,
	localizedText,
	ref,
	slug,
	symbol,
} from './common.js';

export const category = z
	.object({
		name: localizedText,
		description: localizedText.optional(),
		aliases: z.array(z.string().min(1)).default([]),
		order: z.number().int().nonnegative(),
	})
	.strict();

/**
 * SI base-dimension exponents plus a synthetic angle dimension `A` (ADR 0002:
 * 30° → rad must convert while ° → dimensionless must not silently succeed).
 * Partial: omitted keys are exponent 0.
 */
export const dimensionVector = z
	.object({
		L: z.number().int(),
		M: z.number().int(),
		T: z.number().int(),
		I: z.number().int(),
		Th: z.number().int(),
		N: z.number().int(),
		J: z.number().int(),
		A: z.number().int(),
	})
	.partial();

export const magnitude = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		baseUnit: ref('units'),
		dimension: dimensionVector,
		nonNegative: z.boolean().default(false),
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
		exact: z.boolean().default(true),
	})
	.strict();

export const unit = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		unitOf: z.array(ref('magnitudes')).min(1),
		system: unitSystem.default('other'),
		toBase: toBase.optional(),
		prefixOf: z
			.object({
				prefix: ref('prefixes'),
				base: ref('units'),
			})
			.strict()
			.optional(),
		compose: z
			.array(
				z
					.object({
						unit: ref('units'),
						exp: z
							.number()
							.int()
							.refine((n) => n !== 0, 'exponent 0 is meaningless'),
					})
					.strict(),
			)
			.min(1)
			.optional(),
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
		exact: z.boolean().default(false),
		irrational: z.boolean().default(false),
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

export const equationTerm = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('magnitude'), ref: ref('magnitudes') }).strict(),
	z.object({ kind: z.literal('constant'), ref: ref('constants') }).strict(),
	z.object({ kind: z.literal('variable'), ref: ref('variables') }).strict(),
]);

/**
 * Equations and formulas share one schema (`kind` is taxonomy only).
 * `expression` is annotated TeX using \mag{}/\const{}/\var{} macros; every
 * macro argument must be a key of `terms` and vice versa (pipeline-enforced).
 * `solutions` are hand-authored per-variable solved forms in a small
 * expression grammar, machine-verified at build (ADR 0002) — the calculator
 * can only solve for symbols listed here.
 */
export const equation = entityBase
	.extend({
		kind: z.enum(['equation', 'formula']).default('equation'),
		expression: z.string().min(1),
		terms: z.record(z.string().min(1), equationTerm),
		solutions: z.record(z.string().min(1), z.string().min(1)).default({}),
		calculator: z
			.object({
				enabled: z.boolean().default(false),
				solveFor: z.array(z.string().min(1)).optional(),
			})
			.strict()
			.default({ enabled: false }),
		units: z.array(ref('units')).default([]),
	})
	.strict();

export const pathStep = z.discriminatedUnion('kind', [
	z
		.object({
			id: slug,
			kind: z.literal('entry'),
			collection: z.enum([
				'magnitudes',
				'units',
				'prefixes',
				'constants',
				'variables',
				'equations',
			]),
			slug: slug,
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
]);

export const path = entityBase
	.extend({
		steps: z.array(pathStep).min(1),
	})
	.strict()
	.superRefine((value, ctx) => {
		const ids = value.steps.map((s) => s.id);
		if (new Set(ids).size !== ids.length) {
			ctx.addIssue({ code: 'custom', message: 'step ids must be unique within a path' });
		}
	});

export type Category = z.infer<typeof category>;
export type DimensionVector = z.infer<typeof dimensionVector>;
export type Magnitude = z.infer<typeof magnitude>;
export type Unit = z.infer<typeof unit>;
export type UnitSystem = z.infer<typeof unitSystem>;
export type Prefix = z.infer<typeof prefix>;
export type Constant = z.infer<typeof constant>;
export type Variable = z.infer<typeof variable>;
export type EquationTerm = z.infer<typeof equationTerm>;
export type Equation = z.infer<typeof equation>;
export type PathStep = z.infer<typeof pathStep>;
export type Path = z.infer<typeof path>;
