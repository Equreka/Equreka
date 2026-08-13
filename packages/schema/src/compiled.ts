import { z } from 'zod';
import { decimalString, localizedText, slug } from './common.js';
import { unitSystem } from './entities.js';

/**
 * Full 8-component dimension exponent vector [L, M, T, I, Th, N, J, A] as a
 * tuple — the compiled form of the authored partial dimension object. Two
 * quantities are convertible iff their vectors are equal.
 */
export const compiledDimension = z.tuple([
	z.number().int(),
	z.number().int(),
	z.number().int(),
	z.number().int(),
	z.number().int(),
	z.number().int(),
	z.number().int(),
	z.number().int(),
]);

/**
 * Engine-slice unit: every authoring form (toBase / prefixOf / compose)
 * resolved at build time to one exact factor/offset pair against the
 * SI-coherent unit of its dimension. Values stay decimal strings until the
 * engine parses them at its float64 boundary.
 */
export const compiledUnit = z.object({
	slug,
	name: localizedText,
	symbolTex: z.string(),
	symbolText: z.string(),
	magnitudes: z.array(slug),
	system: unitSystem,
	dimension: compiledDimension,
	factor: decimalString,
	offset: decimalString,
	exact: z.boolean(),
	affine: z.boolean(),
});

export const compiledMagnitude = z.object({
	slug,
	name: localizedText,
	symbolTex: z.string(),
	baseUnit: slug,
	dimension: compiledDimension,
	nonNegative: z.boolean(),
});

export const compiledPrefix = z.object({
	slug,
	name: localizedText,
	symbolTex: z.string(),
	value: decimalString,
});

export const compiledConstant = z.object({
	slug,
	name: localizedText,
	symbolTex: z.string(),
	symbolText: z.string(),
	value: decimalString,
	unit: slug,
	exact: z.boolean(),
	irrational: z.boolean(),
});

/**
 * Engine-slice equation metadata. The solved-form implementations live in
 * the codegen'd solutions module (dist/solutions.js) keyed by
 * `${slug}.${termKey}`; this record carries everything else the calculator
 * UI and the engine need to wire inputs.
 */
export const compiledEquationMeta = z.object({
	slug,
	kind: z.enum(['equation', 'formula']),
	name: localizedText,
	calculatorEnabled: z.boolean(),
	terms: z.record(
		z.string(),
		z.object({
			kind: z.enum(['magnitude', 'constant', 'variable']),
			ref: slug,
			identifier: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
		}),
	),
	solvable: z.array(z.string()),
});

/**
 * The engine slice — the only artifact shard runtime islands load
 * (no HTML, no SVG; a few hundred KB). Sharding contract per ADR 0002.
 */
export const engineSlice = z.object({
	schemaVersion: z.number().int(),
	contentHash: z.string(),
	magnitudes: z.record(slug, compiledMagnitude),
	units: z.record(slug, compiledUnit),
	prefixes: z.record(slug, compiledPrefix),
	constants: z.record(slug, compiledConstant),
	equations: z.record(slug, compiledEquationMeta),
});

export const DIMENSION_KEYS = ['L', 'M', 'T', 'I', 'Th', 'N', 'J', 'A'] as const;

export type CompiledDimension = z.infer<typeof compiledDimension>;
export type CompiledUnit = z.infer<typeof compiledUnit>;
export type CompiledMagnitude = z.infer<typeof compiledMagnitude>;
export type CompiledPrefix = z.infer<typeof compiledPrefix>;
export type CompiledConstant = z.infer<typeof compiledConstant>;
export type CompiledEquationMeta = z.infer<typeof compiledEquationMeta>;
export type EngineSlice = z.infer<typeof engineSlice>;
