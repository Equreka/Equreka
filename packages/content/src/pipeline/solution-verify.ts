import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
	ComputeEngine,
	version as computeEngineVersion,
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
import { buildIdentifierMap, stripMacros } from './tex.js';
import { type ContentFile, type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

const SAMPLE_TARGET = 20;
const SAMPLE_ATTEMPT_LIMIT = 400;
const RELATIVE_TOLERANCE = 1e-9;

/**
 * Compute-engine built-ins that legitimately appear as symbols of a parsed
 * expression without being equation terms (`\pi` parses to Pi).
 */
const KNOWN_CE_SYMBOLS = new Set(['Pi', 'ExponentialE']);

export interface EquationSolutionInput {
	slug: string;
	expression: string;
	terms: Record<string, { kind: 'magnitude' | 'constant' | 'variable'; ref: string }>;
	solutions: Record<string, string>;
	constantValues: Record<string, number>;
}

export interface EquationVerification {
	identifierByTermKey: Record<string, string>;
	asts: Map<string, SolutionAst>;
	messages: string[];
	samples: Record<string, number>;
	cached: boolean;
}

/**
 * Machine-verifies hand-authored solved forms (ADR 0002): for each solution,
 * N seeded random substitutions must make the original equation balance when
 * the target takes the solution's value. Constants are substituted at their
 * compiled values; compute-engine is the build-time oracle and never ships.
 */
export function verifyEquation(
	ce: ComputeEngine,
	input: EquationSolutionInput,
	numeric = true,
): EquationVerification {
	const messages: string[] = [];
	const asts = new Map<string, SolutionAst>();
	const samples: Record<string, number> = {};
	const termKeys = Object.keys(input.terms);
	const identifierMap = buildIdentifierMap(termKeys);
	messages.push(...identifierMap.errors);
	const result: EquationVerification = {
		identifierByTermKey: identifierMap.byTermKey,
		asts,
		messages,
		samples,
		cached: false,
	};
	if (identifierMap.errors.length > 0) {
		return result;
	}

	const identifierToTermKey = new Map<string, string>();
	for (const [key, identifier] of Object.entries(identifierMap.byTermKey)) {
		identifierToTermKey.set(identifier, key);
	}
	const constantEnv: Record<string, number> = {};
	for (const [key, term] of Object.entries(input.terms)) {
		if (term.kind === 'constant') {
			const value = input.constantValues[key];
			if (value === undefined || !Number.isFinite(value)) {
				messages.push(`constant term '${key}' has no finite compiled value`);
				continue;
			}
			const identifier = identifierMap.byTermKey[key];
			if (identifier !== undefined) {
				constantEnv[identifier] = value;
			}
		}
	}

	for (const [targetKey, source] of Object.entries(input.solutions)) {
		const targetId = identifierMap.byTermKey[targetKey];
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
		const used = collectIdentifiers(ast);
		let usable = true;
		for (const name of used) {
			if (name === targetId) {
				messages.push(`solution for '${targetKey}' references its own target '${name}'`);
				usable = false;
			} else if (!identifierToTermKey.has(name)) {
				messages.push(`solution for '${targetKey}' uses unknown identifier '${name}'`);
				usable = false;
			}
		}
		if (usable) {
			asts.set(targetId, ast);
		}
	}
	if (messages.length > 0 || !numeric) {
		return result;
	}

	const plainTex = stripMacros(input.expression);
	const parsed = ce.parse(plainTex);
	if (!parsed.isValid || !isFunction(parsed, 'Equal') || parsed.nops !== 2) {
		messages.push(
			`compute-engine could not parse '${plainTex}' as an equation: ${parsed.toString()}`,
		);
		return result;
	}
	const lhs = parsed.op1;
	const rhs = parsed.op2;
	for (const symbol of parsed.symbols) {
		if (!identifierToTermKey.has(symbol) && !KNOWN_CE_SYMBOLS.has(symbol)) {
			messages.push(
				`compute-engine tokenized unexpected symbol '${symbol}' — term keys must parse as single symbols`,
			);
		}
	}
	if (messages.length > 0) {
		return result;
	}

	for (const [targetKey] of Object.entries(input.solutions)) {
		const targetId = identifierMap.byTermKey[targetKey];
		if (targetId === undefined) {
			continue;
		}
		const ast = asts.get(targetId);
		if (ast === undefined) {
			continue;
		}
		const freeIds = Object.values(identifierMap.byTermKey).filter(
			(identifier) => identifier !== targetId && constantEnv[identifier] === undefined,
		);
		const random = mulberry32(fnv1a(`${input.slug}:${targetKey}`));
		let valid = 0;
		let failed = false;
		for (let attempt = 0; attempt < SAMPLE_ATTEMPT_LIMIT && valid < SAMPLE_TARGET; attempt += 1) {
			const env: Record<string, number> = { ...constantEnv };
			for (const identifier of freeIds) {
				env[identifier] = 0.1 + random() * 9.9;
			}
			const candidate = evaluateSolution(ast, env);
			if (!Number.isFinite(candidate)) {
				continue;
			}
			env[targetId] = candidate;
			const lhsValue = lhs.subs(env).N().re;
			const rhsValue = rhs.subs(env).N().re;
			if (!Number.isFinite(lhsValue) || !Number.isFinite(rhsValue)) {
				continue;
			}
			const tolerance = RELATIVE_TOLERANCE * Math.max(1, Math.abs(lhsValue), Math.abs(rhsValue));
			if (Math.abs(lhsValue - rhsValue) > tolerance) {
				messages.push(
					`solution for '${targetKey}' disagrees with the equation: ` +
						`with ${formatEnv(env)} the sides evaluate to ${lhsValue} vs ${rhsValue}`,
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
	const ce = new ComputeEngine();

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
			verification = verifyEquation(ce, input, false);
			if (verification.messages.length === 0) {
				verification = {
					...verification,
					messages: [...hit.messages],
					samples: { ...hit.samples },
					cached: true,
				};
			}
		} else {
			verification = verifyEquation(ce, input, true);
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

function formatEnv(env: Record<string, number>): string {
	return Object.entries(env)
		.map(([name, value]) => `${name}=${value}`)
		.join(', ');
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
