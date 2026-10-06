import { z } from 'zod';
import {
	decimalString,
	entityBase,
	exactNumber,
	externalIds,
	intFromString,
	localizedText,
	ref,
	slug,
	strictBool,
	symbol,
	valueSource,
} from './common.js';

export const category = z
	.object({
		name: localizedText,
		description: localizedText.optional(),
		aliases: z.array(z.string().min(1)).default([]),
		order: intFromString.refine((value) => value >= 0, 'order must be nonnegative'),
		externalIds: externalIds.optional(),
	})
	.strict();

/**
 * A sub-discipline of exactly one category (physics → thermodynamics), the
 * second navigation level. `order` sorts branches within their category.
 */
export const branch = z
	.object({
		name: localizedText,
		description: localizedText.optional(),
		aliases: z.array(z.string().min(1)).default([]),
		category: ref('categories'),
		order: intFromString.refine((value) => value >= 0, 'order must be nonnegative'),
		externalIds: externalIds.optional(),
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

/**
 * `kindOf` names the broader quantity kind this magnitude specializes
 * (work → energy, weight → force; ADR 0006). The pipeline requires an
 * identical dimension vector and an acyclic chain. Convertibility in the
 * engine stays dimension equality; the hierarchy only scopes which units a
 * magnitude's converter and unit table offer by default.
 */
export const magnitude = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		baseUnit: ref('units'),
		dimension: dimensionVector,
		kindOf: ref('magnitudes').optional(),
		nonNegative: strictBool.default(false),
	})
	.strict();

export const unitSystem = z.enum(['si', 'si-derived', 'imperial', 'uscs', 'cgs', 'other']);

/**
 * Affine mapping to the magnitude's SI-coherent base unit:
 * base = factor · value + offset. Base units themselves omit every
 * derivation field (enforced by the refinement below and by the pipeline
 * against magnitude.baseUnit). `source` cites where the factor is defined
 * (a NIST SP 811 Appendix B row, or 'convention' for calendar reckoning).
 */
export const toBase = z
	.object({
		factor: exactNumber,
		offset: exactNumber.default('0'),
		exact: strictBool.default(true),
		source: valueSource.optional(),
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
 * rational factor chain and verifies the dimension sum against unitOf —
 * or, when unitOf is empty, takes that sum as the unit's dimension.
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
 * not anchor a magnitude or appear in another unit's derivation. An empty
 * `unitOf` is legal only with `compose` (N·m, kW·h): the dimension then
 * comes from the operands, so no synthetic magnitude is minted to host it.
 * `prefixes` lists the SI prefixes the pipeline expands this unit with
 * (ADR 0007): each one yields a generated `<prefix><slug>` unit in
 * `prefixOf` form, and a hand file of that slug overrides it. `namePlural`
 * is the lowercase running-prose plural ('metres', 'hertz') the generated
 * names and descriptions are composed from, so it is required with
 * `prefixes`.
 */
export const unit = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		namePlural: localizedText.optional(),
		unitOf: z.array(ref('magnitudes')).default([]),
		system: unitSystem.default('other'),
		nonConvertible: strictBool.default(false),
		prefixes: z.array(ref('prefixes')).default([]),
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
		if (value.unitOf.length === 0 && value.compose === undefined) {
			ctx.addIssue({
				code: 'custom',
				path: ['unitOf'],
				message:
					'unitOf may be empty only for a compose-form unit, whose dimension derives from its operands',
			});
		}
		if (value.nonConvertible && forms.length > 0) {
			ctx.addIssue({
				code: 'custom',
				message: 'a nonConvertible unit has no mapping to a base and therefore no derivation form',
			});
		}
		if (value.prefixes.length === 0) {
			return;
		}
		if (value.prefixOf !== undefined) {
			ctx.addIssue({
				code: 'custom',
				path: ['prefixes'],
				message: 'a prefixed unit takes no further prefixes; declare them on its base unit',
			});
		}
		if (value.nonConvertible) {
			ctx.addIssue({
				code: 'custom',
				path: ['prefixes'],
				message: 'a nonConvertible unit has no factor for a prefix to scale',
			});
		}
		if (new Set(value.prefixes).size !== value.prefixes.length) {
			ctx.addIssue({ code: 'custom', path: ['prefixes'], message: 'prefixes must not repeat' });
		}
		if (value.namePlural === undefined) {
			ctx.addIssue({
				code: 'custom',
				path: ['namePlural'],
				message:
					'namePlural is required with prefixes: generated names and descriptions count in the plural',
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

/**
 * Authored rounded forms of a constant's value, in the constant's own unit
 * and in display order (`'3e+8'` for c, `'3.1416'` for π). They are the
 * values a reader quotes, never computed from `value`, and only
 * presentation reads them; absent means the entry has none.
 */
export const constantApproximations = z
	.array(decimalString)
	.min(1)
	.refine((values) => new Set(values).size === values.length, {
		message: 'approximations must not repeat',
	});

/**
 * `truncated` marks an authored `value` that cuts off a true value with no
 * finite decimal form: an irrational number (π) or an exactly defined value
 * with endless digits (ħ = h/2π, the molar volume). Presentation appends an
 * ellipsis to it. A measured value is a rounding with an uncertainty, never
 * a truncation, so the flag needs `exact` or `irrational`.
 */
export const constant = entityBase
	.extend({
		symbol,
		symbolAlt: symbol.optional(),
		value: decimalString,
		approximations: constantApproximations.optional(),
		unit: ref('units'),
		exact: strictBool.default(false),
		irrational: strictBool.default(false),
		truncated: strictBool.default(false),
		uncertainty: decimalString.optional(),
		source: valueSource.optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.irrational && !value.truncated) {
			ctx.addIssue({
				code: 'custom',
				path: ['truncated'],
				message: 'an irrational value has no finite decimal form: declare truncated: true',
			});
		}
		if (value.truncated && !value.exact && !value.irrational) {
			ctx.addIssue({
				code: 'custom',
				path: ['truncated'],
				message:
					'truncated applies to an exact or irrational value; a measured value is rounded, not truncated',
			});
		}
	});

export const variable = entityBase
	.extend({
		symbol,
		defaultUnit: ref('units').optional(),
	})
	.strict();

/**
 * Name a term takes in solutions, the codegen'd solutions module and the
 * engine slice. Authored only to override the derivation from the term key
 * (font and text wrappers unwrapped, then every character outside
 * `[A-Za-z0-9_]` dropped) when it is unreadable or collides:
 * `[\mathrm{H}^{+}]` derives a bare `H`, so it declares `cH`.
 */
export const identifierName = z
	.string()
	.regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'identifier: a letter, then letters, digits or _');

/**
 * `symbol` terms are equation-local unknowns with no wiki entity behind
 * them (the legs of a right triangle): a display label plus an optional
 * unit that fixes their dimension for the build-time consistency check.
 * `integer` marks a term that only takes integer values (the n and k of a
 * binomial coefficient): the verifier samples it from the integers 0–10,
 * and the calculator receives the flag. `delta` marks a term that is a
 * difference (ΔT): the calculator converts it without the affine offset,
 * so 10 °C of warming is 10 K, not 283.15 K. A constant has a fixed value,
 * so it takes neither flag.
 */
export const equationTerm = z.discriminatedUnion('kind', [
	z
		.object({
			kind: z.literal('magnitude'),
			ref: ref('magnitudes'),
			identifier: identifierName.optional(),
			integer: strictBool.default(false),
			delta: strictBool.default(false),
		})
		.strict(),
	z
		.object({
			kind: z.literal('constant'),
			ref: ref('constants'),
			identifier: identifierName.optional(),
		})
		.strict(),
	z
		.object({
			kind: z.literal('variable'),
			ref: ref('variables'),
			identifier: identifierName.optional(),
			integer: strictBool.default(false),
			delta: strictBool.default(false),
		})
		.strict(),
	z
		.object({
			kind: z.literal('symbol'),
			label: localizedText,
			unit: ref('units').optional(),
			identifier: identifierName.optional(),
			integer: strictBool.default(false),
			delta: strictBool.default(false),
		})
		.strict(),
]);

/**
 * One term's solved form: a single expression, or the roots of a
 * multi-valued one (a quadratic, an inverse sine) in preference order —
 * the calculator shows the first root that is real and admissible, so the
 * physical root comes first.
 */
export const equationSolution = z.union([z.string().min(1), z.array(z.string().min(1)).min(2)]);

/**
 * The teaching level of a learning path or an equation, shared so both
 * read on one scale.
 */
export const contentLevel = z.enum(['intro', 'intermediate', 'advanced']);

/**
 * Equations and formulas share one schema (`kind` is taxonomy only).
 * `expression` is annotated TeX using \mag{}/\const{}/\var{} macros; every
 * macro argument must be a key of `terms` and vice versa (pipeline-enforced).
 * `solutions` are hand-authored per-variable solved forms in a small
 * expression grammar, machine-verified at build (ADR 0002) — the calculator
 * can only solve for symbols listed here. `calculator.solveFor` narrows the
 * terms the calculator may leave unknown (default: every non-constant
 * term). `algebraic: false` marks notation no solver reads (∇, ∂, ∫): it
 * takes no solutions and no calculator, and the verifier never parses it.
 * Related units are derived from terms at build time, never authored.
 */
export const equation = entityBase
	.extend({
		kind: z.enum(['equation', 'formula']).default('equation'),
		level: contentLevel,
		algebraic: strictBool.default(true),
		expression: z.string().min(1),
		terms: z.record(z.string().min(1), equationTerm),
		solutions: z.record(z.string().min(1), equationSolution).default({}),
		calculator: z
			.object({
				enabled: strictBool.default(false),
				solveFor: z.array(z.string().min(1)).min(1).optional(),
			})
			.strict()
			.default({ enabled: false }),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.algebraic) {
			return;
		}
		if (Object.keys(value.solutions).length > 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['solutions'],
				message: 'a non-algebraic equation (algebraic: false) authors no solutions',
			});
		}
		if (value.calculator.enabled) {
			ctx.addIssue({
				code: 'custom',
				path: ['calculator', 'enabled'],
				message: 'a non-algebraic equation (algebraic: false) has no calculator',
			});
		}
	});

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

/**
 * `prerequisites` reference other paths (resolved and cycle-checked by the
 * pipeline). `estimatedMinutes` is an authored reading-time estimate.
 */
export const path = entityBase
	.extend({
		level: contentLevel,
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
export type Branch = z.infer<typeof branch>;
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
export type EquationSolution = z.infer<typeof equationSolution>;
export type Equation = z.infer<typeof equation>;
export type PathEntryCollection = z.infer<typeof pathEntryCollection>;
export type PathEntryRef = z.infer<typeof pathEntryRef>;
export type ContentLevel = z.infer<typeof contentLevel>;
export type PathStep = z.infer<typeof pathStep>;
export type Path = z.infer<typeof path>;
