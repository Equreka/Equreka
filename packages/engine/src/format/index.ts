export const DEFAULT_SIG_FIGS = 6;

const MAX_SIG_FIGS = 21;

/**
 * Fixed-notation magnitude bounds, mirroring Number#toString's switch points
 * (≥ 1e21 or < 1e-6 goes scientific) so formatted values and native
 * stringification never disagree about notation.
 */
const FIXED_UPPER_BOUND = 1e21;
const FIXED_LOWER_BOUND = 1e-6;

function clampSigFigs(sigFigs: number): number {
	if (!Number.isFinite(sigFigs)) return DEFAULT_SIG_FIGS;
	return Math.min(MAX_SIG_FIGS, Math.max(1, Math.round(sigFigs)));
}

function trimTrailingZeros(fixed: string): string {
	if (!fixed.includes('.')) return fixed;
	return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Rewrites a `toPrecision` result in exponential form ("1.23457e+8") to
 * fixed notation. Only exponents inside the fixed-notation bounds reach
 * this, so the digit expansion stays small.
 */
function expandExponent(literal: string): string {
	const eIndex = literal.indexOf('e');
	if (eIndex === -1) return literal;
	const mantissa = literal.slice(0, eIndex);
	const exponent = Number(literal.slice(eIndex + 1));
	const negative = mantissa.startsWith('-');
	const unsigned = negative ? mantissa.slice(1) : mantissa;
	const digits = unsigned.replace('.', '');
	const pointIndex = unsigned.includes('.') ? unsigned.indexOf('.') : unsigned.length;
	const newPoint = pointIndex + exponent;
	let body: string;
	if (newPoint <= 0) {
		body = `0.${'0'.repeat(-newPoint)}${digits}`;
	} else if (newPoint >= digits.length) {
		body = digits + '0'.repeat(newPoint - digits.length);
	} else {
		body = `${digits.slice(0, newPoint)}.${digits.slice(newPoint)}`;
	}
	return negative ? `-${body}` : body;
}

/**
 * Rounds to `sigFigs` significant figures (default 6) and renders the
 * shortest equivalent decimal: float64 noise is absorbed by the rounding
 * (0.1 + 0.2 → "0.3") and trailing zeros are dropped. Magnitudes outside
 * the fixed-notation bounds delegate to formatExponential. Non-finite input
 * stringifies as-is ("NaN", "Infinity") — no throws. Built on ECMA-262
 * Number formatting only (no Intl) so output is byte-identical across V8,
 * JavaScriptCore, and Hermes.
 */
export function formatSigFigs(value: number, sigFigs: number = DEFAULT_SIG_FIGS): string {
	if (!Number.isFinite(value)) return String(value);
	if (value === 0) return '0';
	const digits = clampSigFigs(sigFigs);
	const magnitude = Math.abs(value);
	if (magnitude >= FIXED_UPPER_BOUND || magnitude < FIXED_LOWER_BOUND) {
		return formatExponential(value, digits);
	}
	return trimTrailingZeros(expandExponent(value.toPrecision(digits)));
}

/**
 * Scientific notation at `sigFigs` significant figures with trailing zeros
 * trimmed from the mantissa ("2.998e+8", "1e-7"). Zero renders as "0";
 * non-finite input stringifies as-is.
 */
export function formatExponential(value: number, sigFigs: number = DEFAULT_SIG_FIGS): string {
	if (!Number.isFinite(value)) return String(value);
	if (value === 0) return '0';
	const digits = clampSigFigs(sigFigs);
	const literal = value.toExponential(digits - 1);
	const eIndex = literal.indexOf('e');
	const mantissa = trimTrailingZeros(literal.slice(0, eIndex));
	return mantissa + literal.slice(eIndex);
}
