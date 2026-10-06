import { expect } from 'vitest';
import type { EngineError, EngineResult } from '../errors.js';

export function unwrap<T>(result: EngineResult<T>): T {
	if (!result.ok) {
		throw new Error(`expected ok result, got ${result.error.code}: ${result.error.message}`);
	}
	return result.value;
}

export function unwrapErr<T>(result: EngineResult<T>): EngineError {
	if (result.ok) {
		throw new Error(`expected error result, got ok(${String(result.value)})`);
	}
	return result.error;
}

/**
 * Relative closeness with an absolute floor near zero: affine conversions
 * lose absolute precision to offset cancellation, so a pure relative bound
 * is unsatisfiable around 0.
 */
export function expectClose(actual: number, expected: number, tolerance = 1e-12): void {
	const scale = Math.max(1, Math.abs(expected));
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * scale);
}
