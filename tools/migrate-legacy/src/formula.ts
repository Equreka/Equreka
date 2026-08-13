import type { Rational } from './rational.js';
import {
	add,
	divide,
	equals,
	fromDecimalLiteral,
	multiply,
	rational,
	subtract,
	toNumber,
} from './rational.js';
import { MigrationError } from './report.js';

/**
 * Affine coefficients of a legacy conversion formula: target = factor · value + offset.
 */
export interface AffineCoefficients {
	readonly factor: Rational;
	readonly offset: Rational;
}

type Token = { kind: 'number'; value: Rational } | { kind: 'value' } | { kind: 'op'; op: string };

function tokenize(formula: string): Token[] {
	const tokens: Token[] = [];
	let rest = formula;
	while (rest.length > 0) {
		const trimmed = rest.replace(/^\s+/, '');
		if (trimmed.length === 0) break;
		const number = /^\d+(?:\.\d+)?/.exec(trimmed);
		if (number) {
			tokens.push({ kind: 'number', value: fromDecimalLiteral(number[0]) });
			rest = trimmed.slice(number[0].length);
			continue;
		}
		if (trimmed.startsWith('value')) {
			tokens.push({ kind: 'value' });
			rest = trimmed.slice('value'.length);
			continue;
		}
		const op = trimmed.charAt(0);
		if (!'+-*/()'.includes(op)) {
			throw new MigrationError(`formula tokenizer: unexpected input at "${trimmed}"`);
		}
		tokens.push({ kind: 'op', op });
		rest = trimmed.slice(1);
	}
	return tokens;
}

/**
 * Recursive-descent evaluator for the legacy grammar (numbers, `value`,
 * + - * /, parentheses) over exact rationals. No eval, no Function.
 */
function evaluate(formula: string, value: Rational): Rational {
	const tokens = tokenize(formula);
	let position = 0;

	const peek = (): Token | undefined => tokens[position];
	const takeOp = (ops: string): string | undefined => {
		const token = tokens[position];
		if (token !== undefined && token.kind === 'op' && ops.includes(token.op)) {
			position += 1;
			return token.op;
		}
		return undefined;
	};

	const parseFactor = (): Rational => {
		if (takeOp('-') !== undefined) return subtract(rational(0n), parseFactor());
		if (takeOp('(') !== undefined) {
			const inner = parseExpression();
			if (takeOp(')') === undefined) throw new MigrationError(`formula: missing ")" in ${formula}`);
			return inner;
		}
		const token = peek();
		if (token !== undefined && token.kind === 'number') {
			position += 1;
			return token.value;
		}
		if (token !== undefined && token.kind === 'value') {
			position += 1;
			return value;
		}
		throw new MigrationError(`formula: unexpected end or token in ${formula}`);
	};

	const parseTerm = (): Rational => {
		let result = parseFactor();
		for (let op = takeOp('*/'); op !== undefined; op = takeOp('*/')) {
			result = op === '*' ? multiply(result, parseFactor()) : divide(result, parseFactor());
		}
		return result;
	};

	const parseExpression = (): Rational => {
		let result = parseTerm();
		for (let op = takeOp('+-'); op !== undefined; op = takeOp('+-')) {
			result = op === '+' ? add(result, parseTerm()) : subtract(result, parseTerm());
		}
		return result;
	};

	const result = parseExpression();
	if (position !== tokens.length) {
		throw new MigrationError(`formula: trailing tokens in ${formula}`);
	}
	return result;
}

/**
 * Derives exact affine coefficients: offset = f(0), factor = f(1) − f(0),
 * asserting f(2) = 2·factor + offset so non-affine formulas abort the run.
 */
export function deriveAffine(formula: string): AffineCoefficients {
	const f0 = evaluate(formula, rational(0n));
	const f1 = evaluate(formula, rational(1n));
	const f2 = evaluate(formula, rational(2n));
	const factor = subtract(f1, f0);
	const offset = f0;
	const expected = add(multiply(rational(2n), factor), offset);
	if (!equals(f2, expected)) {
		throw new MigrationError(`formula is not affine: ${formula}`);
	}
	return { factor, offset };
}

/**
 * Sanity guard tying derived coefficients back to the legacy row value,
 * which the old app displayed as f(1).
 */
export function assertMatchesRowValue(
	coefficients: AffineCoefficients,
	rowValue: string,
	context: string,
): void {
	const predicted = toNumber(add(coefficients.factor, coefficients.offset));
	const recorded = Number(rowValue);
	const scale = Math.max(Math.abs(predicted), Math.abs(recorded), 1);
	if (Math.abs(predicted - recorded) / scale > 1e-9) {
		throw new MigrationError(
			`${context}: formula f(1)=${predicted} disagrees with legacy row value ${rowValue}`,
		);
	}
}
