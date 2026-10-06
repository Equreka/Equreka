import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
	ComputeEngine,
	version as computeEngineVersion,
	type Expression,
	isFunction,
} from '@cortex-js/compute-engine';
import { SCHEMA_VERSION } from '@equreka/schema';
import { CONTENT_PIPELINE_VERSION } from '../pipeline-version.js';
import { sha256 } from './load.js';
import {
	collectIdentifiers,
	evaluateSolution,
	parseSolution,
	type SolutionAst,
} from './solution-parser.js';
import { buildIdentifierMap, type IdentityTerm, macroUses, stripMacrosWith } from './tex.js';
import { type ContentFile, type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

const SAMPLE_TARGET = 20;
const SAMPLE_ATTEMPT_LIMIT = 400;
const RELATIVE_TOLERANCE = 1e-9;

/**
 * Compute-engine built-ins an expression may use bare, outside any
 * annotation macro (`\pi` parses to Pi, `e` to ExponentialE).
 */
const KNOWN_CE_SYMBOLS: ReadonlySet<string> = new Set(['Pi', 'ExponentialE']);

/**
 * Compute-engine reads a raw term key as TeX of its own (`KE` → K·E, `e` →
 * Euler's number, `i` → the imaginary unit, `\Delta x` → a product), so
 * before parsing every annotation macro becomes `{\mathrm{q<index>}}`,
 * probed against compute-engine 0.105.0 to parse as the single symbol
 * `q<index>`.
 */
function placeholderOf(index: number): string {
	return `q${index}`;
}

/**
 * Matches a symbol compute-engine derived from a placeholder by attaching
 * a subscript written outside the macro (`\var{v}_{0}` → `q1_0`).
 */
const PLACEHOLDER_DERIVED_RE = /^(q\d+)(_.*)$/;

export interface EquationSolutionInput {
	slug: string;
	expression: string;
	terms: Readonly<Record<string, IdentityTerm>>;
	solutions: Record<string, string>;
	constantValues: Record<string, number>;
}

/**
 * `asts` is keyed by term key — the key the solutions module is emitted
 * under and the engine looks up — never by identifier.
 */
export interface EquationVerification {
	asts: Map<string, SolutionAst>;
	messages: string[];
	samples: Record<string, number>;
	cached: boolean;
}

/**
 * One additive operand of an equation side: the side's value is the signed
 * sum of its operands' values.
 */
interface SignedOperand {
	sign: 1 | -1;
	expr: Expression;
}

interface ParsedSides {
	lhs: SignedOperand[];
	rhs: SignedOperand[];
}

/**
 * Machine-verifies hand-authored solved forms (ADR 0002, ADR 0009): for each
 * solution, seeded random substitutions must make the original equation
 * balance when the target takes the solution's value. Constants are
 * substituted at their compiled values; compute-engine is the build-time
 * oracle and never ships. Each equation gets a fresh engine: a shared one
 * leaks symbol declarations between parses, so a verdict would depend on
 * which equations were parsed before it (and on the verify cache).
 */
export function verifyEquation(input: EquationSolutionInput, numeric = true): EquationVerification {
	const messages: string[] = [];
	const asts = new Map<string, SolutionAst>();
	const samples: Record<string, number> = {};
	const result: EquationVerification = { asts, messages, samples, cached: false };
	const identity = buildIdentifierMap(input.terms);
	if (identity.errors.length > 0) {
		messages.push(
			'solutions not verified: the term identifiers break the identity contract (see the integrity issues)',
		);
		return result;
	}

	const termKeys = Object.keys(input.terms);
	const keyByIdentifier = new Map(
		[...identity.byTermKey].map(([key, identifier]) => [identifier, key]),
	);
	const constants = new Map<string, number>();
	for (const [key, term] of Object.entries(input.terms)) {
		if (term.kind !== 'constant') {
			continue;
		}
		const value = input.constantValues[key];
		if (value === undefined || !Number.isFinite(value)) {
			messages.push(`constant term '${key}' has no finite compiled value`);
			continue;
		}
		constants.set(key, value);
	}

	for (const [targetKey, source] of Object.entries(input.solutions)) {
		const targetId = identity.byTermKey.get(targetKey);
		if (targetId === undefined) {
			continue;
		}
		let ast: SolutionAst;
		try {
			ast = parseSolution(source);
		} catch (error) {
			messages.push(
				`solution for '${targetKey}': ${error instanceof Error ? error.message : String(error)}`,
			);
			continue;
		}
		let usable = true;
		for (const name of collectIdentifiers(ast)) {
			if (name === targetId) {
				messages.push(`solution for '${targetKey}' references its own target '${name}'`);
				usable = false;
			} else if (!keyByIdentifier.has(name)) {
				messages.push(`solution for '${targetKey}' uses unknown identifier '${name}'`);
				usable = false;
			}
		}
		if (usable) {
			asts.set(targetKey, ast);
		}
	}
	if (messages.length > 0 || !numeric) {
		return result;
	}

	const sides = parseSides(input.expression, termKeys, messages);
	if (sides === undefined) {
		return result;
	}

	for (const [targetKey, ast] of asts) {
		const freeKeys = termKeys.filter((key) => key !== targetKey && !constants.has(key));
		const random = mulberry32(fnv1a(`${input.slug}:${targetKey}`));
		let valid = 0;
		let failed = false;
		for (let attempt = 0; attempt < SAMPLE_ATTEMPT_LIMIT && valid < SAMPLE_TARGET; attempt += 1) {
			const values = new Map(constants);
			for (const key of freeKeys) {
				values.set(key, 0.1 + random() * 9.9);
			}
			const candidate = evaluateSolution(ast, identifierEnv(identity.byTermKey, values));
			if (!Number.isFinite(candidate)) {
				continue;
			}
			values.set(targetKey, candidate);
			const balance = sideBalance(sides, placeholderEnv(termKeys, values));
			if (balance === undefined) {
				continue;
			}
			if (!balance.balanced) {
				messages.push(
					`solution for '${targetKey}' disagrees with the equation: ` +
						`with ${formatValues(values)} the sides evaluate to ${balance.lhs} vs ${balance.rhs}`,
				);
				failed = true;
				break;
			}
			valid += 1;
		}
		if (!failed && valid < SAMPLE_TARGET) {
			messages.push(
				`solution for '${targetKey}' produced only ${valid}/${SAMPLE_TARGET} valid samples in ${SAMPLE_ATTEMPT_LIMIT} attempts`,
			);
		}
		samples[targetKey] = valid;
	}
	return result;
}

/**
 * Parses the expression with every macro replaced by its term's placeholder
 * and splits both sides into additive operands. A symbol that is not a
 * placeholder or a known built-in was written outside every macro and is an
 * error. The macro-free residue (each macro replaced by `1`) is parsed too,
 * so authored text that happens to spell a placeholder (`\mathrm{q0}`)
 * cannot pose as a term.
 */
function parseSides(
	expression: string,
	termKeys: readonly string[],
	messages: string[],
): ParsedSides | undefined {
	const placeholders = new Map(termKeys.map((key, index) => [key, placeholderOf(index)]));
	const unknownArgs = macroUses(expression).filter((use) => !placeholders.has(use.arg));
	for (const use of unknownArgs) {
		messages.push(`expression macro argument '${use.arg}' is not a terms key`);
	}
	if (unknownArgs.length > 0) {
		return undefined;
	}

	const ce = new ComputeEngine();
	const synthetic = stripMacrosWith(
		expression,
		(arg) => `\\mathrm{${placeholders.get(arg) ?? ''}}`,
	);
	const parsed = ce.parse(synthetic);
	if (!parsed.isValid || !isFunction(parsed, 'Equal') || parsed.nops !== 2) {
		messages.push(
			`compute-engine could not parse '${expression}' as an equation: ${parsed.toString()}`,
		);
		return undefined;
	}
	const residue = ce.parse(stripMacrosWith(expression, () => '1'));
	const allowed = new Set([...placeholders.values(), ...KNOWN_CE_SYMBOLS]);
	const keyByPlaceholder = new Map([...placeholders].map(([key, name]) => [name, key]));
	const unannotated = new Set([
		...residue.symbols.filter((symbol) => !KNOWN_CE_SYMBOLS.has(symbol)),
		...parsed.symbols
			.filter((symbol) => !allowed.has(symbol))
			.map((symbol) => authoredSymbol(symbol, keyByPlaceholder)),
	]);
	for (const symbol of unannotated) {
		messages.push(
			`unannotated symbol '${symbol}' in expression: every quantity, subscripts and accents included, goes inside \\mag{}, \\const{} or \\var{}`,
		);
	}
	if (unannotated.size > 0) {
		return undefined;
	}
	return { lhs: additiveOperands(parsed.op1, 1), rhs: additiveOperands(parsed.op2, 1) };
}

/**
 * A placeholder-derived symbol named back in authored terms (`q1_0` →
 * `v_0`), so no message leaks a synthetic name.
 */
function authoredSymbol(symbol: string, keyByPlaceholder: ReadonlyMap<string, string>): string {
	const match = PLACEHOLDER_DERIVED_RE.exec(symbol);
	const key = match === null ? undefined : keyByPlaceholder.get(match[1] ?? '');
	return key === undefined ? symbol : `${key}${match?.[2] ?? ''}`;
}

function opposite(sign: 1 | -1): 1 | -1 {
	return sign === 1 ? -1 : 1;
}

function additiveOperands(expr: Expression, sign: 1 | -1): SignedOperand[] {
	if (isFunction(expr, 'Add')) {
		return expr.ops.flatMap((op) => additiveOperands(op, sign));
	}
	if (isFunction(expr, 'Negate')) {
		return expr.ops.flatMap((op) => additiveOperands(op, opposite(sign)));
	}
	if (isFunction(expr, 'Subtract')) {
		return expr.ops.flatMap((op, index) =>
			additiveOperands(op, index === 0 ? sign : opposite(sign)),
		);
	}
	return [{ sign, expr }];
}

interface Balance {
	lhs: number;
	rhs: number;
	balanced: boolean;
}

/**
 * Scale-free agreement test. The tolerance scales with the largest additive
 * operand on either side, so it neither vanishes when a side is exactly
 * zero (`a x^2 + b x + c = 0`) nor swamps tiny magnitudes the way an
 * absolute floor does (with h ≈ 6.6e-34, `E = 2 h f` passes any 1e-9
 * absolute tolerance). Undefined marks an invalid sample: an operand that
 * is non-finite or has a non-zero imaginary part, which `.re` alone would
 * silently drop (`sqrt(-4)` has re 0).
 */
function sideBalance(sides: ParsedSides, env: Record<string, number>): Balance | undefined {
	const lhsValues = signedValues(sides.lhs, env);
	const rhsValues = signedValues(sides.rhs, env);
	if (lhsValues === undefined || rhsValues === undefined) {
		return undefined;
	}
	const sum = (values: readonly number[]): number =>
		values.reduce((total, value) => total + value, 0);
	const lhs = sum(lhsValues);
	const rhs = sum(rhsValues);
	const scale = Math.max(...[...lhsValues, ...rhsValues].map((value) => Math.abs(value)));
	const residual = Math.abs(lhs - rhs);
	const balanced = scale === 0 ? residual === 0 : residual <= RELATIVE_TOLERANCE * scale;
	return { lhs, rhs, balanced };
}

function signedValues(
	operands: readonly SignedOperand[],
	env: Record<string, number>,
): number[] | undefined {
	const values = operands.map((operand) => {
		const value = operand.expr.subs(env).N();
		return Number.isFinite(value.re) && value.im === 0 ? operand.sign * value.re : undefined;
	});
	return values.every((value): value is number => value !== undefined) ? values : undefined;
}

function identifierEnv(
	identifiers: ReadonlyMap<string, string>,
	values: ReadonlyMap<string, number>,
): Record<string, number> {
	return Object.fromEntries(
		[...values].flatMap(([key, value]) => {
			const identifier = identifiers.get(key);
			return identifier === undefined ? [] : [[identifier, value]];
		}),
	);
}

function placeholderEnv(
	termKeys: readonly string[],
	values: ReadonlyMap<string, number>,
): Record<string, number> {
	return Object.fromEntries(
		termKeys.flatMap((key, index) => {
			const value = values.get(key);
			return value === undefined ? [] : [[placeholderOf(index), value]];
		}),
	);
}

interface VerifyCache {
	entries: Record<string, { messages: string[]; samples: Record<string, number> }>;
}

export interface CorpusVerification {
	issues: Issue[];
	equations: Map<string, EquationVerification>;
}

export function verifyCorpusSolutions(
	corpus: Corpus,
	files: readonly ContentFile[],
	cacheDir: string | null,
): CorpusVerification {
	const issues: Issue[] = [];
	const equations = new Map<string, EquationVerification>();
	const fileByRelPath = new Map(files.map((file) => [file.relPath, file]));
	const cachePath = cacheDir === null ? null : join(cacheDir, 'solution-verify.json');
	const cache = readCache(cachePath);
	let cacheDirty = false;

	for (const [slug, equation] of corpus.equations) {
		const relPath = fileOf('equations', slug);
		const constantValues: Record<string, number> = {};
		for (const [key, term] of Object.entries(equation.terms)) {
			if (term.kind === 'constant') {
				const constant = corpus.constants.get(term.ref);
				if (constant !== undefined) {
					constantValues[key] = Number(constant.value);
				}
			}
		}
		const input: EquationSolutionInput = {
			slug,
			expression: equation.expression,
			terms: equation.terms,
			solutions: equation.solutions,
			constantValues,
		};
		const file = fileByRelPath.get(relPath);
		const key = file === undefined ? null : cacheKey(file, constantValues);
		const hit = key !== null ? cache.entries[key] : undefined;
		let verification: EquationVerification;
		if (hit !== undefined) {
			verification = verifyEquation(input, false);
			if (verification.messages.length === 0) {
				verification = {
					...verification,
					messages: [...hit.messages],
					samples: { ...hit.samples },
					cached: true,
				};
			}
		} else {
			verification = verifyEquation(input, true);
			if (key !== null) {
				cache.entries[key] = {
					messages: [...verification.messages],
					samples: { ...verification.samples },
				};
				cacheDirty = true;
			}
		}
		equations.set(slug, verification);
		for (const message of verification.messages) {
			issues.push(issue('error', 'solutions', relPath, message));
		}
	}

	if (cachePath !== null && cacheDirty) {
		writeCache(cachePath, cache);
	}
	return { issues, equations };
}

/**
 * Content-addressed cache key: file bytes, tool/schema/pipeline versions,
 * and the substituted constant values — a constant edit must invalidate
 * every equation that verified against the old value.
 */
function cacheKey(file: ContentFile, constantValues: Record<string, number>): string {
	const constants = JSON.stringify(
		Object.fromEntries(Object.entries(constantValues).sort(([a], [b]) => (a < b ? -1 : 1))),
	);
	const suffix = `|ce=${computeEngineVersion}|schema=${SCHEMA_VERSION}|pipeline=${CONTENT_PIPELINE_VERSION}|constants=${constants}`;
	return sha256(Buffer.concat([file.bytes, Buffer.from(suffix, 'utf8')]));
}

function readCache(cachePath: string | null): VerifyCache {
	if (cachePath !== null) {
		try {
			const parsed = JSON.parse(readFileSync(cachePath, 'utf8')) as VerifyCache;
			if (parsed !== null && typeof parsed.entries === 'object') {
				return parsed;
			}
		} catch {
			return { entries: {} };
		}
	}
	return { entries: {} };
}

function writeCache(cachePath: string, cache: VerifyCache): void {
	try {
		mkdirSync(dirname(cachePath), { recursive: true });
		writeFileSync(cachePath, JSON.stringify(cache));
	} catch {
		return;
	}
}

function formatValues(values: ReadonlyMap<string, number>): string {
	return [...values].map(([key, value]) => `${key}=${value}`).join(', ');
}

function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
