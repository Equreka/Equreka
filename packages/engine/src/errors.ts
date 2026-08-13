/**
 * Stable engine error codes. Each code doubles as an i18n message key, so
 * renaming one is a breaking change for both apps' locale bundles.
 */
export type ErrorCode =
	| 'inputs/empty'
	| 'inputs/underdetermined'
	| 'inputs/overdetermined'
	| 'inputs/not-a-number'
	| 'units/unknown'
	| 'units/incompatible-dimensions'
	| 'solve/no-real-solution'
	| 'solve/domain'
	| 'internal/unsupported';

/**
 * Structured failure payload. `message` is a developer-facing English string;
 * UIs localize from `code` and interpolate from `details`.
 */
export interface EngineError {
	code: ErrorCode;
	message: string;
	details?: Record<string, unknown>;
}

/**
 * Discriminated result envelope — the engine's public API never throws.
 */
export type EngineResult<T> = { ok: true; value: T } | { ok: false; error: EngineError };

export function ok<T>(value: T): EngineResult<T> {
	return { ok: true, value };
}

export function err(
	code: ErrorCode,
	message: string,
	details?: Record<string, unknown>,
): { ok: false; error: EngineError } {
	return {
		ok: false,
		error: details === undefined ? { code, message } : { code, message, details },
	};
}
