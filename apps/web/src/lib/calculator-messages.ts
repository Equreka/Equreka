import type { EngineError } from '@equreka/engine';

/**
 * English calculator strings keyed by engine error code (the code doubles as
 * an i18n key per @equreka/engine — this module is the en bundle until the
 * i18n pass lands).
 */
export const CALCULATOR_MESSAGES: Record<EngineError['code'], string> = {
	'inputs/empty': 'Fill in every value except the one to solve for.',
	'inputs/underdetermined': 'Leave exactly one field empty — the one to solve for.',
	'inputs/overdetermined': 'Every field is filled. Clear the one you want to solve for.',
	'inputs/not-a-number': 'Enter numeric values only.',
	'units/unknown': 'This equation references an unknown unit.',
	'units/incompatible-dimensions': 'These units measure different quantities.',
	'solve/no-real-solution': 'No real solution exists for these values.',
	'solve/domain': 'These values are outside the domain of the equation.',
	'internal/unsupported': 'This equation cannot be solved for that term.',
};

/**
 * Codes that describe an incomplete fill-all-but-one state rather than a
 * failed computation — the UI shows these as muted guidance, not alerts.
 */
export const CALCULATOR_HINT_CODES: ReadonlySet<EngineError['code']> = new Set([
	'inputs/empty',
	'inputs/underdetermined',
	'inputs/overdetermined',
]);
