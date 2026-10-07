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

const SUPERSCRIPT_CHARS: Readonly<Record<string, string>> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'-': '⁻',
	'+': '',
};

/**
 * Unicode superscript digits for an integer exponent (-17 → "⁻¹⁷"), so a
 * power of ten in plain text stays readable once pasted.
 */
export function toSuperscript(value: number): string {
	return String(value)
		.split('')
		.map((char) => SUPERSCRIPT_CHARS[char] ?? char)
		.join('');
}

export const NUMBER_FORMATS = ['readable', 'scientific'] as const;

/**
 * How a calculator result prints. `readable` rounds to READABLE_SIG_FIGS
 * and uses plain notation inside [1e-3, 1e6); `scientific` keeps every
 * shortest round-trip digit of the float64 in scientific notation, the
 * original app's decimal.js output (`toExpPos: 0`, `toExpNeg: 0`).
 */
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

export const DEFAULT_NUMBER_FORMAT: NumberFormat = 'readable';

export const READABLE_SIG_FIGS = 10;

/**
 * Decimal exponents of the rounded value that `readable` prints in plain
 * notation: 1e-3 ≤ |x| < 1e6. Deciding on the rounded value keeps
 * 999999.99999999 from printing as a plain "1000000".
 */
const READABLE_PLAIN_EXPONENTS = { min: -3, max: 5 } as const;

/**
 * A formatted result split for superscript rendering: `exponent` is null
 * for plain notation. `sign` is kept, "+" included, so a renderer can
 * draw both signs as the original result card did.
 */
export interface ResultParts {
	mantissa: string;
	exponent: { sign: '+' | '-'; digits: string } | null;
}

function withExponent(mantissa: string, exponent: number): ResultParts {
	return {
		mantissa,
		exponent: { sign: exponent < 0 ? '-' : '+', digits: String(Math.abs(exponent)) },
	};
}

function readableParts(value: number): ResultParts {
	const literal = value.toExponential(READABLE_SIG_FIGS - 1);
	const eIndex = literal.indexOf('e');
	const exponent = Number(literal.slice(eIndex + 1));
	if (exponent >= READABLE_PLAIN_EXPONENTS.min && exponent <= READABLE_PLAIN_EXPONENTS.max) {
		return { mantissa: trimTrailingZeros(expandExponent(literal)), exponent: null };
	}
	return withExponent(trimTrailingZeros(literal.slice(0, eIndex)), exponent);
}

/**
 * `Number#toExponential()` without an argument yields the shortest
 * round-trip digits; an exponent of 0 falls back to plain digits.
 */
function scientificParts(value: number): ResultParts {
	const literal = value.toExponential();
	const eIndex = literal.indexOf('e');
	const exponent = Number(literal.slice(eIndex + 1));
	if (exponent === 0) return { mantissa: String(value), exponent: null };
	return withExponent(literal.slice(0, eIndex), exponent);
}

/**
 * The one formatter for calculator results on every platform. Zero prints
 * "0" and non-finite input stringifies as-is ("NaN", "Infinity") in both
 * formats. ECMA-262 Number formatting only, so output is byte-identical
 * across V8, JavaScriptCore, and Hermes.
 */
export function formatResult(
	value: number,
	format: NumberFormat = DEFAULT_NUMBER_FORMAT,
): ResultParts {
	if (!Number.isFinite(value)) return { mantissa: String(value), exponent: null };
	if (value === 0) return { mantissa: '0', exponent: null };
	return format === 'readable' ? readableParts(value) : scientificParts(value);
}

/**
 * Plain-text twin of ResultParts for the clipboard and text-only displays
 * ("8.98755 × 10¹³"); a positive exponent carries no "+".
 */
export function resultText({ mantissa, exponent }: ResultParts): string {
	if (exponent === null) return mantissa;
	return `${mantissa} × 10${toSuperscript(Number(`${exponent.sign}${exponent.digits}`))}`;
}
