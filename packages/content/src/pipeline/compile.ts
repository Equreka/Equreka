import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS } from '@equreka/schema';
import { type EmittedArtifact, emitArtifacts } from './emit.js';
import { checkIntegrity, emptyBranches, orphanMagnitudes } from './integrity.js';
import { loadContent } from './load.js';
import {
	checkLocaleCompleteness,
	type LocaleCoverage,
	readLocaleDebt,
} from './locale-completeness.js';
import { buildMathArtifact, type MathStats } from './math-artifact.js';
import { expandCorpus } from './prefix-expansion.js';
import { type ResolvedUnit, resolveUnits } from './resolve.js';
import { checkSolutionDimensions } from './solution-dimension.js';
import { type EquationVerification, verifyCorpusSolutions } from './solution-verify.js';
import { checkTermAnchors } from './term-units.js';
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
	generatedUnits: ReadonlySet<string>;
	overriddenUnits: ReadonlySet<string>;
	locale: LocaleCoverage[];
	resolved: Map<string, ResolvedUnit>;
	verifications: Map<string, EquationVerification>;
	math: MathStats;
	artifacts: EmittedArtifact[];
}

function defaultPackageRoot(): string {
	return resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
}

/**
 * Orchestrates the pipeline. `check` runs stages 1–4 (load, validate,
 * locale completeness, prefix expansion, integrity, resolve + term anchors +
 * dimensional consistency + verify math + TeX lint + MathJax render) with no
 * output; `build` adds stage 5 emission into dist/. Locale completeness and
 * the orphan-magnitude warning read the unexpanded corpus: a generated unit
 * is no authored text to translate, and its unitOf is copied from its base
 * and is no independent use of a magnitude.
 * Every stage aggregates issues — nothing fails fast — but emission is
 * skipped when any prior stage errored. Async only because MathJax boots
 * asynchronously; every other stage is synchronous.
 */
export async function compileContent(
	mode: CompileMode,
	options: CompileOptions = {},
): Promise<CompileReport> {
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
	const localeDebt = readLocaleDebt(packageRoot);
	issues.push(...localeDebt.issues);
	const locale = checkLocaleCompleteness(loaded, localeDebt.debt);
	issues.push(...locale.issues);
	const expansion = expandCorpus(validated.corpus, loaded);
	issues.push(...expansion.issues);
	const corpus = expansion.corpus;

	issues.push(...checkIntegrity(corpus));
	issues.push(...orphanMagnitudes(validated.corpus));
	issues.push(...emptyBranches(corpus));

	const resolution = resolveUnits(corpus);
	issues.push(...resolution.issues);
	issues.push(...checkTermAnchors(corpus, resolution.resolved));

	issues.push(...checkSolutionDimensions(corpus));

	const verification = verifyCorpusSolutions(corpus, loaded.files, cacheDir);
	issues.push(...verification.issues);

	issues.push(...lintTex(corpus, readTexAllowlist(packageRoot)));

	const math = await buildMathArtifact(corpus, cacheDir);
	issues.push(...math.issues);

	let artifacts: EmittedArtifact[] = [];
	if (mode === 'build' && !hasErrors(issues)) {
		const emitted = emitArtifacts({
			corpus,
			generatedUnits: expansion.generated,
			resolved: resolution.resolved,
			verifications: verification.equations,
			math: math.artifact,
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
		generatedUnits: expansion.generated,
		overriddenUnits: expansion.overridden,
		locale: locale.coverage,
		resolved: resolution.resolved,
		verifications: verification.equations,
		math: math.artifact.stats,
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
