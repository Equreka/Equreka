import { MigrationError } from './report.js';

/**
 * Exact rational over bigint (always reduced, denominator positive) used to
 * derive affine conversion coefficients without floating point.
 */
export interface Rational {
	readonly num: bigint;
	readonly den: bigint;
}

/**
 * Schema-facing form of a coefficient: a decimal string when the reduced
 * denominator is 1, else a `{num, den}` rational object.
 */
export type ExactNumberValue = string | { num: number; den: number };

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) {
		const t = x % y;
		x = y;
		y = t;
	}
	return x === 0n ? 1n : x;
}

export function rational(num: bigint, den = 1n): Rational {
	if (den === 0n) throw new MigrationError('rational: zero denominator');
	const sign = den < 0n ? -1n : 1n;
	const n = num * sign;
	const d = den * sign;
	const g = gcd(n, d);
	return { num: n / g, den: d / g };
}

export function add(a: Rational, b: Rational): Rational {
	return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function subtract(a: Rational, b: Rational): Rational {
	return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function multiply(a: Rational, b: Rational): Rational {
	return rational(a.num * b.num, a.den * b.den);
}

export function divide(a: Rational, b: Rational): Rational {
	if (b.num === 0n) throw new MigrationError('rational: division by zero');
	return rational(a.num * b.den, a.den * b.num);
}

export function equals(a: Rational, b: Rational): boolean {
	return a.num === b.num && a.den === b.den;
}

export function isZero(a: Rational): boolean {
	return a.num === 0n;
}

export function toNumber(a: Rational): number {
	return Number(a.num) / Number(a.den);
}

/**
 * Parses a plain decimal literal ("273.15", "-7.5") into an exact rational.
 * Exponent forms are rejected: the legacy formula grammar never uses them.
 */
export function fromDecimalLiteral(text: string): Rational {
	const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
	if (!match) throw new MigrationError(`not a plain decimal literal: ${text}`);
	const sign = match[1] === '-' ? -1n : 1n;
	const whole = match[2] ?? '0';
	const frac = match[3] ?? '';
	const scale = 10n ** BigInt(frac.length);
	const magnitude = BigInt(whole) * scale + (frac === '' ? 0n : BigInt(frac));
	return rational(sign * magnitude, scale);
}

export function toExactNumber(a: Rational): ExactNumberValue {
	if (a.den === 1n) return a.num.toString();
	const num = Number(a.num);
	const den = Number(a.den);
	if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den)) {
		throw new MigrationError(`rational ${a.num}/${a.den} exceeds safe integer range`);
	}
	return { num, den };
}

export function describe(a: Rational): string {
	return a.den === 1n ? a.num.toString() : `${a.num}/${a.den}`;
}
