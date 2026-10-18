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
import {
	collectIdentifiers,
	evaluateSolution,
	parseSolution,
	type SolutionAst,
	solutionRoots,
} from '../solution-grammar.js';
import { sha256 } from './load.js';
import { buildIdentifierMap, type IdentityTerm, macroUses, stripMacrosWith } from './tex.js';
import { type ContentFile, type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

const SAMPLE_TARGET = 20;
const SAMPLE_ATTEMPT_LIMIT = 400;
const RELATIVE_TOLERANCE = 1e-9;
const INTEGER_SAMPLE_MAX = 10;

/**
 * Significant digits compute-engine evaluates the sides at; its default, 21,
 * keeps about five of `1/\sqrt{1 - v^2/c^2} - 1` at a few metres per second
 * (the difference is near 1e-16), far from the 1e-9 balance. At 50 a side
 * is exact to well under the tolerance across the sampling boxes, so a
 * disagreement measures the root, which the calculator evaluates in float64:
 * a root that cancels catastrophically fails here instead of printing noise.
 */
const SIDE_PRECISION = 50;

/**
 * Where a free real term is drawn from. Every root first samples the unit
 * box; a root real only where terms differ by many orders of magnitude
 * (`p = sqrt(E^2 - (m c^2)^2) / c` needs E above m c², about 9e16 m) is left
 * short there and gets a second, log-uniform pass with its own seed, so the
 * unit-box samples, and the verdicts they give, never move. Integer terms
 * keep the integers 0–INTEGER_SAMPLE_MAX in both.
 */
interface SamplingBox {
	label: string;
	seedSuffix: string;
	draw: (random: () => number) => number;
}

const WIDE_BOX_DECADES = 30;

const SAMPLING_BOXES: readonly SamplingBox[] = [
	{ label: '[0.1, 10)', seedSuffix: '', draw: (random) => 0.1 + random() * 9.9 },
	{
		label: `log-uniform over 1e-${WIDE_BOX_DECADES} to 1e${WIDE_BOX_DECADES}`,
		seedSuffix: ':wide',
		draw: (random) => 10 ** (WIDE_BOX_DECADES * (2 * random() - 1)),
	},
];

/**
 * `\log` with no base subscript: compute-engine reads it as base 10, many
 * readers as base e, so an expression must name the base.
 */
const BARE_LOG_RE = /\\log(?![A-Za-z])(?!\s*_)/;

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

/**
 * A term as the verifier samples it: an `integer` term draws from the
 * integers 0–INTEGER_SAMPLE_MAX instead of a sampling box's reals.
 */
export interface SampledTerm extends IdentityTerm {
	integer?: boolean | undefined;
}

/**
 * `algebraic: false` (default true) marks notation no solver reads (∇, ∂,
 * ∫): the expression is never handed to compute-engine, so only the
 * bare-`\log` rule applies to it.
 */
export interface EquationSolutionInput {
	slug: string;
	expression: string;
	algebraic?: boolean | undefined;
	terms: Readonly<Record<string, SampledTerm>>;
	solutions: Readonly<Record<string, string | readonly string[]>>;
	constantValues: Record<string, number>;
}

/**
 * `asts` is keyed by term key — the key the solutions module is emitted
 * under and the engine looks up — never by identifier, and holds every
 * root in authored order. `samples` counts each root's valid samples.
 */
export interface EquationVerification {
	asts: Map<string, SolutionAst[]>;
	messages: string[];
	samples: Record<string, number[]>;
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

interface SamplingContext {
	slug: string;
	termKeys: readonly string[];
	terms: Readonly<Record<string, SampledTerm>>;
	identifiers: ReadonlyMap<string, string>;
	constants: ReadonlyMap<string, number>;
	sides: ParsedSides;
}

/**
 * The outcome of sampling one root. `points` are the identifier records
 * (target excluded) of its valid samples, where the duplicate-root check
 * evaluates the other roots.
 */
interface RootSampling {
	points: Record<string, number>[];
	message?: string;
}

/**
 * How messages name one authored root: by term key alone for a
 * single-root solution, with a 1-based position for a multi-root one.
 */
export function solutionLabel(termKey: string, root: number, rootCount: number): string {
	return rootCount === 1
		? `solution for '${termKey}'`
		: `solution for '${termKey}' root ${root + 1} of ${rootCount}`;
}

/**
 * Machine-verifies hand-authored solved forms (ADR 0002, ADR 0009): for each
 * root of each solution, seeded random substitutions must make the
 * original equation balance when the target takes the root's value; a
 * root is checked only where it is real, and two roots of one solution
 * that never differ are rejected as duplicates. Constants are substituted
 * at their compiled values; compute-engine is the build-time oracle and
 * never ships. Each equation gets a fresh engine: a shared one leaks symbol
 * declarations between parses, so a verdict would depend on which
 * equations were parsed before it (and on the verify cache). Every root
 * must name every other non-constant term (`parseRoot`), and a
 * non-algebraic expression is never parsed.
 */
export function verifyEquation(input: EquationSolutionInput, numeric = true): EquationVerification {
	const messages: string[] = [];
	const asts = new Map<string, SolutionAst[]>();
	const samples: Record<string, number[]> = {};
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
	const influencers = new Map(
		[...keyByIdentifier].filter(([, key]) => input.terms[key]?.kind !== 'constant'),
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

	for (const [targetKey, solution] of Object.entries(input.solutions)) {
		const targetId = identity.byTermKey.get(targetKey);
		if (targetId === undefined) {
			continue;
		}
		const roots = solutionRoots(solution);
		const parsed = roots.map((source, index) =>
			parseRoot(source, solutionLabel(targetKey, index, roots.length), targetId, {
				keyByIdentifier,
				influencers,
			}),
		);
		messages.push(...parsed.flatMap((root) => root.messages));
		const usable = parsed.flatMap((root) => (root.ast === undefined ? [] : [root.ast]));
		if (usable.length === roots.length) {
			asts.set(targetKey, usable);
		}
	}
	if (messages.length > 0 || !numeric) {
		return result;
	}
	if (input.algebraic === false) {
		messages.push(...bareLogMessages(input.expression));
		return result;
	}

	const sides = parseSides(input.expression, termKeys, messages);
	if (sides === undefined) {
		return result;
	}

	const context: SamplingContext = {
		slug: input.slug,
		termKeys,
		terms: input.terms,
		identifiers: identity.byTermKey,
		constants,
		sides,
	};
	for (const [targetKey, roots] of asts) {
		const outcomes = roots.map((ast, index) =>
			sampleRoot(context, targetKey, ast, index, roots.length),
		);
		samples[targetKey] = outcomes.map((outcome) => outcome.points.length);
		messages.push(
			...outcomes.flatMap((outcome) => (outcome.message === undefined ? [] : [outcome.message])),
			...duplicateRootMessages(targetKey, roots, outcomes),
		);
	}
	return result;
}

/**
 * Identifier → term key, over every term (`keyByIdentifier`) and over the
 * non-constant terms only (`influencers`).
 */
interface RootIdentity {
	keyByIdentifier: ReadonlyMap<string, string>;
	influencers: ReadonlyMap<string, string>;
}

/**
 * One authored root parsed and checked against the term identifiers: it
 * may name any term but its own target, and must name every other
 * non-constant term. A root that ignores an input answers the same for
 * every value of it, so either the term cancels out of the equation (and
 * does not belong in it) or the root is mistyped.
 */
function parseRoot(
	source: string,
	label: string,
	targetId: string,
	identity: RootIdentity,
): { ast?: SolutionAst; messages: string[] } {
	let ast: SolutionAst;
	try {
		ast = parseSolution(source);
	} catch (error) {
		return { messages: [`${label}: ${error instanceof Error ? error.message : String(error)}`] };
	}
	const used = collectIdentifiers(ast);
	const messages = [...used].flatMap((name) => {
		if (name === targetId) {
			return [`${label} references its own target '${name}'`];
		}
		return identity.keyByIdentifier.has(name) ? [] : [`${label} uses unknown identifier '${name}'`];
	});
	const ignored = [...identity.influencers]
		.filter(([identifier]) => identifier !== targetId && !used.has(identifier))
		.map(([, key]) => `'${key}'`);
	if (ignored.length > 0) {
		messages.push(
			`${label} does not reference ${ignored.join(', ')}; every root uses every other non-constant term, so a term that cancels out does not belong in the equation`,
		);
	}
	return messages.length === 0 ? { ast, messages } : { messages };
}

/**
 * The bare-`\log` rule, checked on the macro-free residue so a term key can
 * never trigger it.
 */
function bareLogMessages(expression: string): string[] {
	return BARE_LOG_RE.test(stripMacrosWith(expression, () => '1'))
		? ['expression uses \\log without a base: write \\ln or \\log_{10}']
		: [];
}

function sampleValue(
	term: SampledTerm | undefined,
	box: SamplingBox,
	random: () => number,
): number {
	return term?.integer === true
		? Math.floor(random() * (INTEGER_SAMPLE_MAX + 1))
		: box.draw(random);
}

/**
 * Samples one root with its own seed (`slug:key#index`, plus the box's
 * suffix), so adding a root never moves the samples of the roots before it.
 * The boxes run in order until SAMPLE_TARGET valid samples are in hand. A
 * sample where the root is not real, or a side is not finite and real, is
 * skipped and counts toward that box's attempt cap.
 */
function sampleRoot(
	context: SamplingContext,
	targetKey: string,
	ast: SolutionAst,
	index: number,
	rootCount: number,
): RootSampling {
	const label = solutionLabel(targetKey, index, rootCount);
	const freeKeys = context.termKeys.filter(
		(key) => key !== targetKey && !context.constants.has(key),
	);
	const points: Record<string, number>[] = [];
	for (const box of SAMPLING_BOXES) {
		const random = mulberry32(fnv1a(`${context.slug}:${targetKey}#${index}${box.seedSuffix}`));
		for (
			let attempt = 0;
			attempt < SAMPLE_ATTEMPT_LIMIT && points.length < SAMPLE_TARGET;
			attempt += 1
		) {
			const values = new Map(context.constants);
			for (const key of freeKeys) {
				values.set(key, sampleValue(context.terms[key], box, random));
			}
			const env = identifierEnv(context.identifiers, values);
			const candidate = evaluateSolution(ast, env);
			if (!Number.isFinite(candidate)) {
				continue;
			}
			values.set(targetKey, candidate);
			const balance = sideBalance(context.sides, placeholderEnv(context.termKeys, values));
			if (balance === undefined) {
				continue;
			}
			if (!balance.balanced) {
				if (illConditioned(context, targetKey, values, balance)) {
					continue;
				}
				return {
					points,
					message:
						`${label} disagrees with the equation: ` +
						`with ${formatValues(values)} the sides evaluate to ${balance.lhs} vs ${balance.rhs}`,
				};
			}
			points.push(env);
		}
	}
	return points.length < SAMPLE_TARGET
		? {
				points,
				message: `${label} produced only ${points.length}/${SAMPLE_TARGET} valid samples in ${SAMPLE_ATTEMPT_LIMIT} attempts per sampling box (${SAMPLING_BOXES.map((box) => box.label).join(', then ')})`,
			}
		: { points };
}

/**
 * Relative nudge applied to the target to measure how strongly the balance
 * depends on it: small enough to stay linear, far above float64 noise.
 */
const CONDITIONING_STEP = 1e-8;

/**
 * Relative error a float64 root may carry from a stable evaluation: 64 units
 * in the last place.
 */
const ROOT_ROUNDING = 32 * Number.EPSILON;

/**
 * Whether the equation, at this sample, is too sensitive to its target for
 * any float64 root to balance it. Nudging the target by CONDITIONING_STEP
 * shifts the residual; scaled down to ROOT_ROUNDING, that shift is what the
 * target's own rounding costs, and when it alone exceeds the tolerance the
 * sample cannot judge a root (Nernst's `Q` at T = 1e24 K is 1 + 2e-13, whose
 * logarithm float64 keeps to three digits). Only a failing sample is tested,
 * so every passing verdict stands, and a wrong root at a well-conditioned
 * sample still disagrees. A nudge that leaves the real domain marks the
 * sample as ill-conditioned too.
 */
function illConditioned(
	context: SamplingContext,
	targetKey: string,
	values: ReadonlyMap<string, number>,
	balance: Balance,
): boolean {
	const target = values.get(targetKey);
	if (target === undefined || target === 0) {
		return false;
	}
	const nudged = new Map(values);
	nudged.set(targetKey, target * (1 + CONDITIONING_STEP));
	const shifted = sideBalance(context.sides, placeholderEnv(context.termKeys, nudged));
	if (shifted === undefined) {
		return true;
	}
	const shift = Math.abs(shifted.lhs - shifted.rhs - (balance.lhs - balance.rhs));
	return shift * (ROOT_ROUNDING / CONDITIONING_STEP) > RELATIVE_TOLERANCE * balance.scale;
}

/**
 * Two verified roots are duplicates when they agree, within the relative
 * tolerance, at every valid sample of either root where both are real.
 * Roots never real at the same sample (disjoint domains) are distinct.
 */
function duplicateRootMessages(
	targetKey: string,
	roots: readonly SolutionAst[],
	outcomes: readonly RootSampling[],
): string[] {
	return roots.flatMap((first, i) =>
		roots.slice(i + 1).flatMap((second, offset) => {
			const j = i + 1 + offset;
			const firstOutcome = outcomes[i];
			const secondOutcome = outcomes[j];
			if (
				firstOutcome === undefined ||
				secondOutcome === undefined ||
				firstOutcome.message !== undefined ||
				secondOutcome.message !== undefined
			) {
				return [];
			}
			const shared = [...firstOutcome.points, ...secondOutcome.points]
				.map((env) => [evaluateSolution(first, env), evaluateSolution(second, env)] as const)
				.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
			const identical = shared.length > 0 && shared.every(([a, b]) => agree(a, b));
			return identical
				? [
						`solution for '${targetKey}': roots ${i + 1} and ${j + 1} are duplicate roots, equal at every sample where both are real`,
					]
				: [];
		}),
	);
}

function agree(a: number, b: number): boolean {
	const scale = Math.max(Math.abs(a), Math.abs(b));
	return scale === 0 || Math.abs(a - b) <= RELATIVE_TOLERANCE * scale;
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

	const bareLog = bareLogMessages(expression);
	if (bareLog.length > 0) {
		messages.push(...bareLog);
		return undefined;
	}
	const residueTex = stripMacrosWith(expression, () => '1');

	const ce = new ComputeEngine();
	ce.precision = SIDE_PRECISION;
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
	const residue = ce.parse(residueTex);
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
	scale: number;
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
	return { lhs, rhs, balanced, scale };
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
	entries: Record<string, { messages: string[]; samples: Record<string, number[]> }>;
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
			algebraic: equation.algebraic,
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
