import { Document, parse as parseYaml, Scalar, visit } from 'yaml';
import { MigrationError } from './report.js';

const DOUBLE_QUOTED_BACKSLASH = /"[^"\n]*\\[^"\n]*"/;
const DECIMAL_KEYS = new Set(['value', 'factor', 'offset', 'expected', 'input']);

function deepEquals(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => deepEquals(item, b[index]));
	}
	if (
		a !== null &&
		b !== null &&
		typeof a === 'object' &&
		typeof b === 'object' &&
		!Array.isArray(a) &&
		!Array.isArray(b)
	) {
		const left = a as Record<string, unknown>;
		const right = b as Record<string, unknown>;
		const keys = Object.keys(left);
		if (keys.length !== Object.keys(right).length) return false;
		return keys.every((key) => deepEquals(left[key], right[key]));
	}
	return false;
}

function isRationalObject(entry: unknown): boolean {
	if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false;
	const record = entry as Record<string, unknown>;
	return (
		Object.keys(record).length === 2 &&
		typeof record.num === 'number' &&
		typeof record.den === 'number'
	);
}

function assertDecimalFieldsAreStrings(node: unknown, context: string): void {
	if (Array.isArray(node)) {
		for (const item of node) assertDecimalFieldsAreStrings(item, context);
		return;
	}
	if (node === null || typeof node !== 'object') return;
	const record = node as Record<string, unknown>;
	for (const [key, entry] of Object.entries(record)) {
		if (DECIMAL_KEYS.has(key) && typeof entry !== 'string' && !isRationalObject(entry)) {
			throw new MigrationError(
				`${context}: field '${key}' re-parsed as ${typeof entry}, expected string or rational`,
			);
		}
		assertDecimalFieldsAreStrings(entry, context);
	}
}

/**
 * Serializes an entity with the ADR-0002 hazards designed out: plain keys,
 * single-quoted strings (TeX backslashes survive), block literals for
 * multi-paragraph prose, 100-column width — then proves it by asserting no
 * double-quoted-backslash scalar exists, the text round-trips deep-equal,
 * and decimal fields re-parse as strings.
 */
export function emitYaml(entity: Record<string, unknown>, context: string): string {
	const doc = new Document(entity);
	visit(doc, {
		Scalar(_key, node) {
			if (typeof node.value === 'string' && node.value.includes('\n')) {
				node.type = Scalar.BLOCK_LITERAL;
			}
		},
	});
	const text = doc.toString({
		blockQuote: 'literal',
		defaultKeyType: Scalar.PLAIN,
		defaultStringType: Scalar.QUOTE_SINGLE,
		lineWidth: 100,
	});
	if (DOUBLE_QUOTED_BACKSLASH.test(text)) {
		throw new MigrationError(`${context}: emitted a double-quoted scalar wrapping a backslash`);
	}
	const reparsed: unknown = parseYaml(text);
	if (!deepEquals(entity, reparsed)) {
		throw new MigrationError(`${context}: YAML round-trip is not identity`);
	}
	assertDecimalFieldsAreStrings(reparsed, context);
	return text;
}
