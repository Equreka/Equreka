import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS } from '@equreka/schema';
import { type EmittedArtifact, emitArtifacts } from './emit.js';
import { checkIntegrity } from './integrity.js';
import { loadContent } from './load.js';
import { type ResolvedUnit, resolveUnits } from './resolve.js';
import { type EquationVerification, verifyCorpusSolutions } from './solution-verify.js';
import { lintTex } from './tex-lint.js';
import { hasErrors, type Issue } from './types.js';
import { type Corpus, validateContent } from './validate.js';

export type CompileMode = 'check' | 'build';

export interface CompileOptions {
	packageRoot?: string;
	contentDir?: string;
	outDir?: string;
	cacheDir?: string | null;
}

export interface CompileReport {
	mode: CompileMode;
	ok: boolean;
	issues: Issue[];
	counts: Record<string, number>;
	contentHash: string;
	corpus: Corpus;
	resolved: Map<string, ResolvedUnit>;
	verifications: Map<string, EquationVerification>;
	artifacts: EmittedArtifact[];
}

function defaultPackageRoot(): string {
	return resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
}

/**
 * Orchestrates the pipeline. `check` runs stages 1–4 (load, validate,
 * integrity, resolve + verify math + TeX lint) with no output; `build` adds
 * stage 5 emission into dist/. Every stage aggregates issues — nothing
 * fails fast — but emission is skipped when any prior stage errored.
 */
export function compileContent(mode: CompileMode, options: CompileOptions = {}): CompileReport {
	const packageRoot = options.packageRoot ?? defaultPackageRoot();
	const contentDir = options.contentDir ?? join(packageRoot, 'content');
	const outDir = options.outDir ?? join(packageRoot, 'dist');
	const cacheDir =
		options.cacheDir === undefined
			? join(packageRoot, 'node_modules', '.cache', 'equreka-content')
			: options.cacheDir;

	const issues: Issue[] = [];
	const loaded = loadContent(contentDir);
	issues.push(...loaded.issues);

	const validated = validateContent(loaded);
	issues.push(...validated.issues);
	const corpus = validated.corpus;

	issues.push(...checkIntegrity(corpus));

	const resolution = resolveUnits(corpus);
	issues.push(...resolution.issues);

	const verification = verifyCorpusSolutions(corpus, loaded.files, cacheDir);
	issues.push(...verification.issues);

	issues.push(...lintTex(corpus, readTexAllowlist(packageRoot)));

	let artifacts: EmittedArtifact[] = [];
	if (mode === 'build' && !hasErrors(issues)) {
		const emitted = emitArtifacts({
			corpus,
			resolved: resolution.resolved,
			verifications: verification.equations,
			contentHash: loaded.contentHash,
			outDir,
		});
		issues.push(...emitted.issues);
		artifacts = emitted.artifacts;
	}

	const counts: Record<string, number> = {};
	for (const collection of COLLECTIONS) {
		counts[collection] = (corpus[collection] as Map<string, unknown>).size;
	}

	return {
		mode,
		ok: !hasErrors(issues),
		issues,
		counts,
		contentHash: loaded.contentHash,
		corpus,
		resolved: resolution.resolved,
		verifications: verification.equations,
		artifacts,
	};
}

function readTexAllowlist(packageRoot: string): Set<string> {
	try {
		const parsed = JSON.parse(readFileSync(join(packageRoot, 'tex-allowlist.json'), 'utf8')) as {
			files?: string[];
		};
		return new Set(parsed.files ?? []);
	} catch {
		return new Set();
	}
}
