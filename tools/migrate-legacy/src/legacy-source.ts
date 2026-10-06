import { readFileSync } from 'node:fs';
import JSON5 from 'json5';
import { MigrationError } from './report.js';

const NUMERIC_LITERAL = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

/**
 * Blanks // and block comments (string-aware, honoring escapes and JSON5
 * line continuations) so the raw-text literal scan cannot match
 * commented-out rows.
 */
export function stripJson5Comments(source: string): string {
	let output = '';
	let index = 0;
	let mode: 'code' | 'single' | 'double' | 'line' | 'block' = 'code';
	while (index < source.length) {
		const char = source.charAt(index);
		const next = source.charAt(index + 1);
		if (mode === 'code') {
			if (char === '/' && next === '/') {
				mode = 'line';
				output += '  ';
				index += 2;
				continue;
			}
			if (char === '/' && next === '*') {
				mode = 'block';
				output += '  ';
				index += 2;
				continue;
			}
			if (char === "'") mode = 'single';
			if (char === '"') mode = 'double';
			output += char;
			index += 1;
			continue;
		}
		if (mode === 'single' || mode === 'double') {
			if (char === '\\') {
				output += source.slice(index, index + 2);
				index += 2;
				continue;
			}
			if ((mode === 'single' && char === "'") || (mode === 'double' && char === '"')) {
				mode = 'code';
			}
			output += char;
			index += 1;
			continue;
		}
		if (mode === 'line') {
			if (char === '\n') {
				mode = 'code';
				output += char;
			} else {
				output += ' ';
			}
			index += 1;
			continue;
		}
		if (char === '*' && next === '/') {
			mode = 'code';
			output += '  ';
			index += 2;
			continue;
		}
		output += char === '\n' ? '\n' : ' ';
		index += 1;
	}
	return output;
}

function scanValueLiterals(stripped: string, filePath: string): string[] {
	const literals: string[] = [];
	const marker = /(?:^|[^\w$])value\s*:\s*/g;
	for (let match = marker.exec(stripped); match !== null; match = marker.exec(stripped)) {
		const rest = stripped.slice(marker.lastIndex);
		if (rest.startsWith("'") || rest.startsWith('"')) continue;
		const literal = /^[-+.\w]+/.exec(rest);
		if (!literal) throw new MigrationError(`${filePath}: cannot read literal after "value:"`);
		literals.push(literal[0]);
	}
	return literals;
}

interface NumericHolder {
	holder: Record<string, unknown>;
	parsed: number;
}

function collectNumericValueHolders(node: unknown, out: NumericHolder[]): void {
	if (Array.isArray(node)) {
		for (const item of node) collectNumericValueHolders(item, out);
		return;
	}
	if (node === null || typeof node !== 'object') return;
	const record = node as Record<string, unknown>;
	for (const [key, entry] of Object.entries(record)) {
		if (key === 'value' && typeof entry === 'number') {
			out.push({ holder: record, parsed: entry });
		} else {
			collectNumericValueHolders(entry, out);
		}
	}
}

/**
 * Parses a legacy JSON5 file and replaces every numeric `value` field with
 * its exact source-text literal, asserting count/order alignment between the
 * parse and the raw-text scan so no float ever leaks downstream.
 */
export function loadLegacyJson5(filePath: string): Record<string, unknown> {
	const raw = readFileSync(filePath, 'utf8');
	const data = JSON5.parse(raw) as Record<string, unknown>;
	const literals = scanValueLiterals(stripJson5Comments(raw), filePath);
	const holders: NumericHolder[] = [];
	collectNumericValueHolders(data, holders);
	if (literals.length !== holders.length) {
		throw new MigrationError(
			`${filePath}: found ${literals.length} value literals in source but ${holders.length} numeric value fields in parse`,
		);
	}
	holders.forEach((entry, index) => {
		const literal = literals[index];
		if (literal === undefined || Number(literal) !== entry.parsed) {
			throw new MigrationError(
				`${filePath}: literal/parse misalignment at value #${index + 1} (${literal} vs ${entry.parsed}) — manual review`,
			);
		}
		if (!NUMERIC_LITERAL.test(literal)) {
			throw new MigrationError(`${filePath}: unsupported numeric literal "${literal}"`);
		}
		entry.holder.value = literal;
	});
	return data;
}
