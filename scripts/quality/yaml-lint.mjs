import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Raw-text lint for content YAML — catches hazards that are invisible after
 * parsing (ADR 0002): TeX inside double-quoted scalars (\m is an illegal
 * YAML escape), unquoted numerics on decimal-string fields (silent float64
 * truncation), and ' #' comment-swallowing inside plain scalars.
 */
const CONTENT_ROOT = join(process.cwd(), 'packages', 'content', 'content');

/** Fields whose values must be quoted decimal strings or rational maps, never bare numbers. */
const DECIMAL_FIELDS = ['value', 'factor', 'offset', 'uncertainty', 'expected', 'input'];

const violations = [];

function walk(dir) {
	let entries = [];
	try {
		entries = readdirSync(dir);
	} catch {
		return [];
	}
	return entries.flatMap((entry) => {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) return walk(full);
		return entry.endsWith('.yaml') || entry.endsWith('.yml') ? [full] : [];
	});
}

const decimalFieldPattern = new RegExp(
	`^\\s*(?:- )?(${DECIMAL_FIELDS.join('|')}):\\s*(-?\\d|\\.\\d)`,
);
const doubleQuotedBackslash = /"[^"]*\\[^"]*"/;
const plainScalarComment = /^\s*[\w-]+:\s+[^'"|>#\s][^'"#]*\s#/;

for (const file of walk(CONTENT_ROOT)) {
	const lines = readFileSync(file, 'utf8').split('\n');
	lines.forEach((line, index) => {
		const at = `${file}:${index + 1}`;
		if (decimalFieldPattern.test(line)) {
			violations.push(
				`${at} unquoted numeric on a decimal-string field — quote it: ${line.trim()}`,
			);
		}
		if (doubleQuotedBackslash.test(line)) {
			violations.push(
				`${at} backslash inside double-quoted scalar (TeX breaks) — use single quotes or plain: ${line.trim()}`,
			);
		}
		if (plainScalarComment.test(line)) {
			violations.push(
				`${at} ' #' inside a plain scalar silently drops the tail — quote the value: ${line.trim()}`,
			);
		}
	});
}

if (violations.length > 0) {
	console.error(`yaml-lint: ${violations.length} violation(s):`);
	for (const violation of violations) console.error(`  ${violation}`);
	process.exit(1);
}
console.log('yaml-lint: ok');
