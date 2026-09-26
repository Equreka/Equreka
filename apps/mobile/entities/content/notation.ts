import type { CompiledDimension } from '@equreka/schema';

const SUPERSCRIPT_DIGITS: Record<string, string> = {
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
 * Display symbols for the compiled 8-tuple's positions [L, M, T, I, Th, N,
 * J, A]: ISO 80000 dimension symbols (Θ for thermodynamic temperature) plus
 * A for the engine's synthetic angle dimension.
 */
const DIMENSION_SYMBOLS = ['L', 'M', 'T', 'I', 'Θ', 'N', 'J', 'A'] as const;

export function toSuperscript(value: number): string {
	return String(value)
		.split('')
		.map((char) => SUPERSCRIPT_DIGITS[char] ?? char)
		.join('');
}

/**
 * Exponent notation for a compiled dimension vector ("L² M T⁻²"); the empty
 * string for the all-zero (dimensionless) vector.
 */
export function formatDimension(dimension: CompiledDimension): string {
	const parts: string[] = [];
	dimension.forEach((exponent, index) => {
		if (exponent === 0) return;
		const symbol = DIMENSION_SYMBOLS[index] ?? '?';
		parts.push(exponent === 1 ? symbol : `${symbol}${toSuperscript(exponent)}`);
	});
	return parts.join(' ');
}

const DECIMAL_STRING_RE = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function groupIntegerDigits(digits: string): string {
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function groupFractionDigits(digits: string): string {
	return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/**
 * A decimal string at full precision with digits grouped in thousands on
 * both sides of the point; a scientific-notation exponent renders as
 * " × 10ⁿ". Falls back to the raw string when the input is not a decimal
 * string.
 */
export function formatFullPrecision(value: string): string {
	const match = DECIMAL_STRING_RE.exec(value);
	if (match === null) return value;
	const [, sign, integer = '', fraction, exponent] = match;
	let text = sign + groupIntegerDigits(integer);
	if (fraction !== undefined) text += `.${groupFractionDigits(fraction)}`;
	if (exponent !== undefined) text += ` × 10${toSuperscript(Number(exponent))}`;
	return text;
}

/**
 * The exponent n when the decimal string is exactly 10ⁿ ("1e3" → 3, "0.01"
 * → -2, "1000" → 3); null otherwise, so callers can fall back to plain
 * display instead of failing on a future non-decimal prefix.
 */
export function powerOfTenExponent(value: string): number | null {
	const match = DECIMAL_STRING_RE.exec(value);
	if (match === null || match[1] === '-') return null;
	const [, , integer = '', fraction = '', exponent] = match;
	const digits = integer + fraction;
	const oneIndex = digits.indexOf('1');
	if (oneIndex === -1 || !/^0*10*$/.test(digits)) return null;
	return integer.length - 1 - oneIndex + (exponent === undefined ? 0 : Number(exponent));
}
