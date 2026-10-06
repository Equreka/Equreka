import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Raw-text lint for content YAML — catches hazards that are invisible after
 * parsing (ADR 0002): TeX inside double-quoted scalars (\m is an illegal
 * YAML escape, including scalars wrapped across lines), unquoted numerics on
 * decimal-string fields (silent float64 truncation), ' #' comment-swallowing
 * inside plain scalars, and %YAML/%TAG directives (parser re-typing). Per
 * file it also requires the editor schema header and bans inline
 * translations in entity files (they live in `<slug>.<locale>.yaml`
 * sidecars, which follow the same quoting rules). The rule engine is
 * exported for yaml-lint.selftest.mjs.
 */
const CONTENT_ROOT = join(process.cwd(), 'packages', 'content', 'content');

/** Fields whose values must be quoted decimal/integer strings, never bare numbers. */
const DECIMAL_FIELDS = [
	'value',
	'factor',
	'offset',
	'uncertainty',
	'expected',
	'input',
	'num',
	'den',
];

/**
 * Mirrors TRANSLATION_LOCALES in @equreka/schema; the content loader is the
 * authoritative check, this rule reports the same mistake before a build.
 */
const TRANSLATION_LOCALES = ['es'];

const localeAlternation = TRANSLATION_LOCALES.join('|');
const sidecarFilename = new RegExp(`^[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:${localeAlternation})\\.yaml$`);
const flowTranslationKey = new RegExp(`[{,]\\s*(?:${localeAlternation})\\s*:`);

const decimalFieldPattern = new RegExp(
	`^\\s*(?:- )?(${DECIMAL_FIELDS.join('|')}):\\s*(-?\\d|\\.\\d)`,
);
const doubleQuotedBackslash = /"[^"]*\\[^"]*"/;
const blockScalarHeader = /^[|>][0-9+-]{0,2}(?:[ \t]+#.*)?$/;
const lineDecomposition = /^(\s*)((?:- )*)(?:([^\s:#'"][^\s:]*):(?:[ \t]+|$))?(.*)$/;

const INLINE_TRANSLATION_MESSAGE =
	'inline translation key — move the text into the <slug>.<locale>.yaml sidecar';

const DQ_BACKSLASH_MESSAGE =
	'backslash inside double-quoted scalar (TeX breaks) — use single quotes or plain';

/**
 * Scans a quoted-scalar region of one line from `start`, honoring ''
 * doubling (single) and backslash escapes (double). `backslash` reports any
 * \ seen inside a double-quoted region — the TeX-destruction hazard.
 */
function scanQuoted(text, start, type) {
	let backslash = false;
	for (let i = start; i < text.length; i += 1) {
		const ch = text[i];
		if (type === 'single') {
			if (ch !== "'") continue;
			if (text[i + 1] === "'") {
				i += 1;
				continue;
			}
			return { closed: true, backslash };
		}
		if (ch === '\\') {
			backslash = true;
			i += 1;
			continue;
		}
		if (ch === '"') return { closed: true, backslash };
	}
	return { closed: false, backslash };
}

/**
 * Lints one file's raw text. Line-oriented state machine: block-scalar
 * bodies are skipped entirely (prose is data), and multiline quoted scalars
 * are tracked across lines — the two holes a per-line regex cannot see.
 */
export function lintText(text, options = {}) {
	const forbiddenKeys = new Set(options.forbiddenKeys ?? []);
	const violations = [];
	const lines = text.split('\n');
	const flag = (index, message) => {
		violations.push({ line: index + 1, message, text: lines[index].trim() });
	};
	let blockIndent = null;
	let openQuote = null;
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		if (blockIndent !== null) {
			const indent = line.length - line.trimStart().length;
			if (line.trim() === '' || indent > blockIndent) continue;
			blockIndent = null;
		}
		if (openQuote !== null) {
			const scan = scanQuoted(line, 0, openQuote);
			if (openQuote === 'double' && scan.backslash) flag(index, DQ_BACKSLASH_MESSAGE);
			if (scan.closed) openQuote = null;
			continue;
		}
		if (/^%(YAML|TAG)/.test(line)) {
			flag(index, 'YAML directive is banned in content (%YAML/%TAG re-type scalars)');
			continue;
		}
		if (decimalFieldPattern.test(line)) {
			flag(index, 'unquoted numeric on a decimal-string field — quote it');
		}
		const parts = lineDecomposition.exec(line);
		if (parts?.[3] !== undefined && forbiddenKeys.has(parts[3])) {
			flag(index, INLINE_TRANSLATION_MESSAGE);
		}
		const value = parts === null ? line.trimStart() : parts[4];
		if (forbiddenKeys.size > 0 && value.startsWith('{') && flowTranslationKey.test(value)) {
			flag(index, INLINE_TRANSLATION_MESSAGE);
		}
		if (value === '' || value.startsWith('#')) continue;
		const first = value[0];
		if (first === "'" || first === '"') {
			const type = first === "'" ? 'single' : 'double';
			const scan = scanQuoted(value, 1, type);
			if (type === 'double' && scan.backslash) flag(index, DQ_BACKSLASH_MESSAGE);
			if (!scan.closed) openQuote = type;
			continue;
		}
		if ((first === '|' || first === '>') && blockScalarHeader.test(value)) {
			blockIndent = line.length - line.trimStart().length;
			continue;
		}
		if (/\s#/.test(value)) {
			flag(index, "' #' inside a plain scalar silently drops the tail — quote the value");
		}
		if (doubleQuotedBackslash.test(value)) {
			flag(index, DQ_BACKSLASH_MESSAGE);
		}
	}
	return violations;
}

/**
 * Lints one content file by its path relative to the content root
 * (`<collection>/<name>.yaml`): the raw-text rules, the schema header the
 * file kind requires, and — for entity files — the inline-translation ban.
 */
export function lintFile(relPath, text) {
	const segments = relPath.split(/[\\/]/);
	const name = segments.pop() ?? '';
	const collection = segments.join('/');
	const sidecar = sidecarFilename.test(name);
	const header = `# yaml-language-server: $schema=../../dist/schemas/${collection}${sidecar ? '.locale' : ''}.schema.json`;
	const violations = lintText(text, { forbiddenKeys: sidecar ? [] : TRANSLATION_LOCALES });
	const firstLine = text.split('\n', 1)[0]?.replace(/\r$/, '');
	if (firstLine !== header) {
		violations.unshift({
			line: 1,
			message: `first line must be the schema header '${header}'`,
			text: firstLine ?? '',
		});
	}
	return violations;
}

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

function main() {
	const violations = [];
	for (const file of walk(CONTENT_ROOT)) {
		for (const violation of lintFile(relative(CONTENT_ROOT, file), readFileSync(file, 'utf8'))) {
			violations.push(`${file}:${violation.line} ${violation.message}: ${violation.text}`);
		}
	}
	if (violations.length > 0) {
		console.error(`yaml-lint: ${violations.length} violation(s):`);
		for (const violation of violations) console.error(`  ${violation}`);
		process.exit(1);
	}
	console.log('yaml-lint: ok');
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
