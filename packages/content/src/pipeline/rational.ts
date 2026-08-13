import type { ExactNumber } from '@equreka/schema';

/**
 * Exact rational for build-time factor composition (ADR 0002: exact
 * arithmetic only at build, float64 at runtime). Invariant: `den > 0`,
 * `gcd(|num|, den) = 1`, sign carried by `num`.
 */
export interface Rat {
	readonly num: bigint;
	readonly den: bigint;
}

export const RAT_ZERO: Rat = { num: 0n, den: 1n };
export const RAT_ONE: Rat = { num: 1n, den: 1n };

const DECIMAL_RE = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

export function rat(num: bigint, den: bigint): Rat {
	if (den === 0n) {
		throw new RangeError('rational denominator must be non-zero');
	}
	const sign = den < 0n ? -1n : 1n;
	const n = num * sign;
	const d = den * sign;
	const g = gcd(n < 0n ? -n : n, d);
	return { num: n / g, den: d / g };
}

export function ratFromDecimal(text: string): Rat {
	const match = DECIMAL_RE.exec(text);
	if (!match) {
		throw new RangeError(`not a decimal string: ${JSON.stringify(text)}`);
	}
	const sign = match[1] === '-' ? -1n : 1n;
	const intPart = match[2] ?? '0';
	const fracPart = match[3] ?? '';
	const exponent = BigInt(match[4] ?? '0') - BigInt(fracPart.length);
	const digits = sign * BigInt(intPart + fracPart);
	if (exponent >= 0n) {
		return rat(digits * 10n ** exponent, 1n);
	}
	return rat(digits, 10n ** -exponent);
}

export function ratFromExact(value: ExactNumber): Rat {
	if (typeof value === 'string') {
		return ratFromDecimal(value);
	}
	return rat(BigInt(value.num), BigInt(value.den));
}

export function ratMul(a: Rat, b: Rat): Rat {
	return rat(a.num * b.num, a.den * b.den);
}

export function ratPow(base: Rat, exponent: number): Rat {
	if (!Number.isInteger(exponent)) {
		throw new RangeError('rational exponent must be an integer');
	}
	if (exponent === 0) {
		return RAT_ONE;
	}
	if (exponent < 0) {
		if (base.num === 0n) {
			throw new RangeError('cannot raise zero to a negative exponent');
		}
		return ratPow(rat(base.den, base.num), -exponent);
	}
	let result = RAT_ONE;
	for (let i = 0; i < exponent; i += 1) {
		result = ratMul(result, base);
	}
	return result;
}

export function ratIsZero(value: Rat): boolean {
	return value.num === 0n;
}

export function ratIsOne(value: Rat): boolean {
	return value.num === 1n && value.den === 1n;
}

export function ratEq(a: Rat, b: Rat): boolean {
	return a.num === b.num && a.den === b.den;
}

export interface DecimalRendering {
	text: string;
	exact: boolean;
}

/**
 * Renders a rational as a plain decimal string. Terminating expansions
 * (reduced denominator has only prime factors 2 and 5) are written exactly;
 * anything else is rounded half-even to `significantDigits` significant
 * digits and flagged inexact, so 5/9 keeps a machine-checkable precision
 * contract instead of silently truncating (ADR 0002).
 */
export function ratToDecimal(value: Rat, significantDigits = 36): DecimalRendering {
	if (value.num === 0n) {
		return { text: '0', exact: true };
	}
	const negative = value.num < 0n;
	const n = negative ? -value.num : value.num;
	const d = value.den;
	const { twos, fives, rest } = factorOutTenParts(d);
	if (rest === 1n) {
		const decimals = Number(twos > fives ? twos : fives);
		const scaled = (n * 10n ** BigInt(decimals)) / d;
		return { text: formatScaled(scaled, decimals, negative), exact: true };
	}
	const exponent = decimalExponent(n, d);
	const shift = BigInt(significantDigits) - BigInt(exponent);
	const numerator = shift >= 0n ? n * 10n ** shift : n;
	const denominator = shift >= 0n ? d : d * 10n ** -shift;
	let quotient = numerator / denominator;
	const remainder = numerator % denominator;
	const doubled = remainder * 2n;
	if (doubled > denominator || (doubled === denominator && quotient % 2n === 1n)) {
		quotient += 1n;
	}
	let adjustedExponent = exponent;
	if (quotient === 10n ** BigInt(significantDigits)) {
		quotient /= 10n;
		adjustedExponent += 1;
	}
	return {
		text: formatSignificand(quotient, adjustedExponent, significantDigits, negative),
		exact: false,
	};
}

function gcd(a: bigint, b: bigint): bigint {
	let x = a;
	let y = b;
	while (y !== 0n) {
		const t = x % y;
		x = y;
		y = t;
	}
	return x === 0n ? 1n : x;
}

function factorOutTenParts(value: bigint): { twos: bigint; fives: bigint; rest: bigint } {
	let rest = value;
	let twos = 0n;
	let fives = 0n;
	while (rest % 2n === 0n) {
		rest /= 2n;
		twos += 1n;
	}
	while (rest % 5n === 0n) {
		rest /= 5n;
		fives += 1n;
	}
	return { twos, fives, rest };
}

/**
 * Exponent e such that n/d ∈ [10^(e-1), 10^e) — the count of digits left of
 * the decimal point (≤ 0 for values below 1).
 */
function decimalExponent(n: bigint, d: bigint): number {
	let e = n.toString().length - d.toString().length + 1;
	while (!isAtLeastPowerOfTen(n, d, e - 1)) {
		e -= 1;
	}
	while (isAtLeastPowerOfTen(n, d, e)) {
		e += 1;
	}
	return e;
}

function isAtLeastPowerOfTen(n: bigint, d: bigint, power: number): boolean {
	if (power >= 0) {
		return n >= d * 10n ** BigInt(power);
	}
	return n * 10n ** BigInt(-power) >= d;
}

function formatScaled(units: bigint, decimals: number, negative: boolean): string {
	const digits = units.toString().padStart(decimals + 1, '0');
	const sign = negative ? '-' : '';
	if (decimals === 0) {
		return sign + digits;
	}
	const intPart = digits.slice(0, digits.length - decimals);
	const fracPart = digits.slice(digits.length - decimals).replace(/0+$/, '');
	return fracPart === '' ? sign + intPart : `${sign}${intPart}.${fracPart}`;
}

function formatSignificand(
	quotient: bigint,
	exponent: number,
	significantDigits: number,
	negative: boolean,
): string {
	const digits = quotient.toString().padStart(significantDigits, '0');
	const sign = negative ? '-' : '';
	if (exponent >= significantDigits) {
		return sign + digits + '0'.repeat(exponent - significantDigits);
	}
	if (exponent > 0) {
		const fracPart = digits.slice(exponent).replace(/0+$/, '');
		const intPart = digits.slice(0, exponent);
		return fracPart === '' ? sign + intPart : `${sign}${intPart}.${fracPart}`;
	}
	const fracPart = ('0'.repeat(-exponent) + digits).replace(/0+$/, '');
	return `${sign}0.${fracPart}`;
}
