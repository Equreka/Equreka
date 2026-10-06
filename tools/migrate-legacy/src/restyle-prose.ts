import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, isMap, isScalar, parseDocument, Scalar } from 'yaml';

/**
 * One-shot restyle (2026-08-13 YAML hardening): re-emits description.en/.es
 * scalars authored as wrapped single/double-quoted strings into folded block
 * scalars (`en: >-`), removing the apostrophe-doubling trap (`circle''s`)
 * from the corpus. Every other byte is preserved via range splicing; every
 * file is gated on a failsafe reparse + corpus-wide deep-compare. Kept as a
 * record of the migration — not part of any build.
 */
const PARSE_OPTIONS = {
	version: '1.2',
	schema: 'failsafe',
	merge: false,
	uniqueKeys: true,
} as const;

const CONTENT_ROOT = fileURLToPath(new URL('../../../packages/content/content/', import.meta.url));

interface Replacement {
	start: number;
	end: number;
	text: string;
}

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) return walk(full);
		return entry.endsWith('.yaml') ? [full] : [];
	});
}

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

/**
 * Renders one prose string as a folded block scalar whose body sits at
 * `keyIndent + 2` (the corpus block-scalar convention), or null when the
 * yaml stringifier cannot hold the folded style for this value (the caller
 * then keeps the authored form). The stringifier emits a top-level block
 * scalar with its own base indent, so the body is re-based, preserving
 * relative indentation of more-indented lines.
 */
function foldedScalar(value: string, keyIndent: number): string | null {
	const targetIndent = keyIndent + 2;
	const doc = new Document(value);
	if (!isScalar(doc.contents)) return null;
	doc.contents.type = Scalar.BLOCK_FOLDED;
	const out = doc.toString({ blockQuote: 'folded', lineWidth: Math.max(40, 100 - targetIndent) });
	if (!out.startsWith('>')) return null;
	const [header, ...body] = (out.endsWith('\n') ? out.slice(0, -1) : out).split('\n');
	if (header === undefined || /[0-9]/.test(header) || body.length === 0) return null;
	const baseIndent = Math.min(
		...body.filter((line) => line !== '').map((line) => line.length - line.trimStart().length),
	);
	if (!Number.isFinite(baseIndent)) return null;
	const pad = ' '.repeat(targetIndent);
	return [header, ...body.map((line) => (line === '' ? line : pad + line.slice(baseIndent)))].join(
		'\n',
	);
}

function restyleFile(file: string, before: string): string | null {
	const doc = parseDocument(before, PARSE_OPTIONS);
	if (doc.errors.length > 0) {
		throw new Error(`${relative(CONTENT_ROOT, file)}: parse errors before restyle`);
	}
	const description = doc.get('description', true);
	if (!isMap(description)) return null;
	const replacements: Replacement[] = [];
	for (const pair of description.items) {
		const { key, value } = pair;
		if (!isScalar(key) || !isScalar(value)) continue;
		if (key.value !== 'en' && key.value !== 'es') continue;
		if (value.type !== Scalar.QUOTE_SINGLE && value.type !== Scalar.QUOTE_DOUBLE) continue;
		if (typeof value.value !== 'string' || value.range == null || key.range == null) continue;
		const lineStart = before.lastIndexOf('\n', key.range[0] - 1) + 1;
		const folded = foldedScalar(value.value, key.range[0] - lineStart);
		if (folded === null) continue;
		replacements.push({ start: value.range[0], end: value.range[1], text: folded });
	}
	if (replacements.length === 0) return null;
	let after = before;
	for (const { start, end, text } of [...replacements].sort((a, b) => b.start - a.start)) {
		after = after.slice(0, start) + text + after.slice(end);
	}
	return after;
}

const files = walk(CONTENT_ROOT).sort();
const snapshot = new Map<string, unknown>(
	files.map((file) => [file, parseDocument(readFileSync(file, 'utf8'), PARSE_OPTIONS).toJS()]),
);

let rewritten = 0;
let folded = 0;
for (const file of files) {
	const before = readFileSync(file, 'utf8');
	const after = restyleFile(file, before);
	if (after === null) continue;
	const check = parseDocument(after, PARSE_OPTIONS);
	if (check.errors.length > 0) {
		throw new Error(
			`${relative(CONTENT_ROOT, file)}: restyle would produce parse errors — not written`,
		);
	}
	if (!deepEquals(snapshot.get(file), check.toJS())) {
		throw new Error(
			`${relative(CONTENT_ROOT, file)}: restyle would change semantics — not written`,
		);
	}
	writeFileSync(file, after, 'utf8');
	rewritten += 1;
	folded += (after.match(/: >-$/gm) ?? []).length;
}

let verified = 0;
for (const file of files) {
	const reparsed = parseDocument(readFileSync(file, 'utf8'), PARSE_OPTIONS);
	if (reparsed.errors.length > 0) {
		throw new Error(`${relative(CONTENT_ROOT, file)}: parse errors after restyle`);
	}
	if (!deepEquals(snapshot.get(file), reparsed.toJS())) {
		throw new Error(`${relative(CONTENT_ROOT, file)}: restyle is not semantics-preserving`);
	}
	verified += 1;
}

console.log(
	`restyle-prose: ${files.length} files scanned, ${rewritten} rewritten (${folded} folded scalars), ${verified}/${files.length} deep-compare identical`,
);
