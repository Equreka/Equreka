import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
	type Symbol as AuthoredSymbol,
	COLLECTIONS,
	type CollectionName,
	type CompiledEquationTerm,
	collectionSchemas,
	type EngineSlice,
	engineSlice,
	localeSidecarSchemas,
	SCHEMA_VERSION,
} from '@equreka/schema';
import MiniSearch from 'minisearch';
import { z } from 'zod';
import {
	ARTIFACT_BUDGETS,
	type ArtifactBudget,
	artifactBudgetPatterns,
	BUDGET_WARN_RATIO,
	MOBILE_STORAGE_CEILING_BYTES,
	MOBILE_TRANSFER_BUDGET_BYTES,
} from '../artifact-budgets.js';
import {
	isShardedCollection,
	type PresentationRecord,
	presentationShardPath,
	splitPresentationSlice,
} from '../presentation-shards.js';
import { canonicalTex, mathShardName, termIdentifier } from '../rich-text.js';
import {
	type CatalogLiteEntry,
	SEARCH_LOCALES,
	type SearchDocument,
	type SearchLeads,
	type SearchLocale,
	searchLeadOf,
	searchOptions,
} from '../search-options.js';
import type { SolutionAst } from '../solution-grammar.js';
import { calculatorTargets } from './integrity.js';
import type { MathArtifact } from './math-artifact.js';
import { shardMathBodies } from './math-shards.js';
import { presentationSteps } from './path-targets.js';
import { deriveRelatedUnits } from './related-units.js';
import type { ResolvedUnit } from './resolve.js';
import {
	generateEquationSolutionModules,
	generateSolutionsLoader,
	generateSolutionsModule,
	SOLUTIONS_LOADER_NAME,
} from './solution-codegen.js';
import type { EquationVerification } from './solution-verify.js';
import { stableStringify } from './stable-json.js';
import { symbolText } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * `pattern` and `budget` are undefined when the file matched no
 * ARTIFACT_BUDGETS pattern or several, which the build reports as an error.
 * `gzipBytes` is informational (zlib default level): budgets cap raw bytes
 * because the mobile bundle and the JSON parse pay them uncompressed.
 */
export interface EmittedArtifact {
	relPath: string;
	bytes: number;
	gzipBytes: number;
	pattern: string | undefined;
	budget: ArtifactBudget | undefined;
}

/**
 * `mobileTransferBytes` is `mobileTransferSize` of the `mobileBundled`
 * files, 0 when emission stopped before writing them.
 */
export interface EmitResult {
	issues: Issue[];
	artifacts: EmittedArtifact[];
	mobileTransferBytes: number;
}

export function mobileBundledBytes(artifacts: readonly EmittedArtifact[]): number {
	return artifacts
		.filter((artifact) => artifact.budget?.mobileBundled === true)
		.reduce((sum, artifact) => sum + artifact.bytes, 0);
}

/**
 * The gzip size of the files concatenated in `relPath` order, the measure
 * MOBILE_TRANSFER_BUDGET_BYTES caps: one stream, as the bundle that carries
 * them is downloaded, so a file split into shards costs about what it cost
 * whole.
 */
export function mobileTransferSize(files: readonly { relPath: string; text: string }[]): number {
	const ordered = [...files].sort((a, b) =>
		a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0,
	);
	return gzipSync(Buffer.concat(ordered.map((file) => Buffer.from(file.text, 'utf8')))).length;
}

/**
 * Error over the cap, warning from BUDGET_WARN_RATIO of it, nothing below.
 */
export function budgetIssue(
	subject: string,
	bytes: number,
	maxBytes: number,
	protects: string,
): Issue | undefined {
	if (bytes > maxBytes) {
		return issue(
			'error',
			'emit',
			'',
			`${subject} is ${bytes} bytes, over its ${maxBytes}-byte budget (${protects})`,
		);
	}
	if (bytes >= maxBytes * BUDGET_WARN_RATIO) {
		const percent = ((bytes / maxBytes) * 100).toFixed(1);
		return issue(
			'warning',
			'emit',
			'',
			`${subject} is ${bytes} bytes, ${percent}% of its ${maxBytes}-byte budget (${protects})`,
		);
	}
	return undefined;
}

/**
 * Shipped artifacts are compact; people open only the editor schemas, which
 * stay indented.
 */
function compactJson(value: unknown): string {
	return `${stableStringify(value, { compact: true })}\n`;
}

function prettyJson(value: unknown): string {
	return `${stableStringify(value)}\n`;
}

/**
 * `generatedUnits` are the prefix-expanded units with no hand file; their
 * presentation records carry `generated: true` (ADR 0007).
 */
export interface EmitInput {
	corpus: Corpus;
	generatedUnits: ReadonlySet<string>;
	resolved: Map<string, ResolvedUnit>;
	verifications: Map<string, EquationVerification>;
	math: MathArtifact;
	contentHash: string;
	outDir: string;
}

export function emitArtifacts(input: EmitInput): EmitResult {
	const issues: Issue[] = [];
	const artifacts: EmittedArtifact[] = [];
	const mobileFiles: { relPath: string; text: string }[] = [];
	const { corpus, outDir } = input;

	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(join(outDir, 'presentation', 'math', 'bodies'), { recursive: true });
	for (const collection of COLLECTIONS.filter(isShardedCollection)) {
		mkdirSync(join(outDir, 'presentation', collection), { recursive: true });
	}
	mkdirSync(join(outDir, 'solutions'), { recursive: true });
	mkdirSync(join(outDir, 'search'), { recursive: true });
	mkdirSync(join(outDir, 'schemas'), { recursive: true });

	const write = (relPath: string, text: string): void => {
		const bytes = Buffer.byteLength(text, 'utf8');
		writeFileSync(join(outDir, ...relPath.split('/')), text, 'utf8');
		const patterns = artifactBudgetPatterns(relPath);
		const pattern = patterns.length === 1 ? patterns[0] : undefined;
		const budget = pattern === undefined ? undefined : ARTIFACT_BUDGETS[pattern];
		artifacts.push({ relPath, bytes, gzipBytes: gzipSync(text).length, pattern, budget });
		if (budget?.mobileBundled === true) {
			mobileFiles.push({ relPath, text });
		}
		if (patterns.length !== 1) {
			const reason =
				patterns.length === 0
					? 'matches no ARTIFACT_BUDGETS pattern'
					: `matches several ARTIFACT_BUDGETS patterns (${patterns.join(', ')})`;
			issues.push(
				issue(
					'error',
					'emit',
					'',
					`${relPath} ${reason}; classify it in artifact-budgets.ts (ADR 0010)`,
				),
			);
			return;
		}
		if (budget === undefined || budget.maxBytes === null) {
			return;
		}
		const finding = budgetIssue(relPath, bytes, budget.maxBytes, budget.protects);
		if (finding !== undefined) {
			issues.push(finding);
		}
	};

	const slice = buildEngineSlice(input);
	const parsedSlice = engineSlice.safeParse(slice);
	if (!parsedSlice.success) {
		for (const zodIssue of parsedSlice.error.issues) {
			issues.push(
				issue('error', 'emit', '', `engine slice: ${zodIssue.path.join('.')}: ${zodIssue.message}`),
			);
		}
		return { issues, artifacts, mobileTransferBytes: 0 };
	}
	write('engine.json', compactJson(slice));

	const solutionAsts = new Map<string, ReadonlyMap<string, readonly SolutionAst[]>>();
	for (const [slug, verification] of input.verifications) {
		solutionAsts.set(slug, verification.asts);
	}
	const solutionsModule = generateSolutionsModule(solutionAsts);
	write('solutions.js', solutionsModule.js);
	write('solutions.d.ts', solutionsModule.dts);
	const equationModules = generateEquationSolutionModules(solutionAsts);
	if (equationModules.has(SOLUTIONS_LOADER_NAME)) {
		issues.push(
			issue(
				'error',
				'emit',
				fileOf('equations', SOLUTIONS_LOADER_NAME),
				`the slug '${SOLUTIONS_LOADER_NAME}' is reserved for the solutions loader module; rename the equation`,
			),
		);
	}
	const shippedModules = [...equationModules].filter(([slug]) => slug !== SOLUTIONS_LOADER_NAME);
	for (const [slug, js] of shippedModules) {
		write(`solutions/${slug}.js`, js);
	}
	const loader = generateSolutionsLoader(shippedModules.map(([slug]) => slug));
	write(`solutions/${SOLUTIONS_LOADER_NAME}.js`, loader.js);
	write(`solutions/${SOLUTIONS_LOADER_NAME}.d.ts`, loader.dts);

	const presentation = buildPresentationSlices(input);
	for (const collection of COLLECTIONS) {
		const slice = presentation[collection];
		if (isShardedCollection(collection)) {
			const split = splitPresentationSlice(collection, slice);
			write(`presentation/${collection}.json`, compactJson(split.index));
			split.shards.forEach((shard, index) => {
				write(presentationShardPath(collection, index), compactJson(shard));
			});
		} else {
			write(`presentation/${collection}.json`, compactJson(slice));
		}
		write(`schemas/${collection}.schema.json`, prettyJson(authoringSchema(collection)));
		write(
			`schemas/${collection}.locale.schema.json`,
			prettyJson(sidecarAuthoringSchema(collection)),
		);
	}

	write('presentation/math/atlas.json', compactJson(input.math.atlas));
	const mathShards = shardMathBodies(input.math.bodies, input.math.atlas);
	issues.push(...mathShards.issues);
	mathShards.shards.forEach((shard, index) => {
		write(`presentation/math/bodies/${mathShardName(index)}.json`, compactJson(shard));
	});

	for (const locale of SEARCH_LOCALES) {
		const documents = searchDocuments(corpus, locale);
		const index = new MiniSearch(searchOptions);
		index.addAll(documents);
		write(`search/${locale}.json`, compactJson(JSON.parse(JSON.stringify(index))));
		const catalogLite: CatalogLiteEntry[] = documents.map((document) => ({
			collection: document.collection,
			slug: document.slug,
			name: document.name,
			symbolText: document.symbolText,
			aliases: document.aliases,
			branches: document.branches,
			categories: catalogCategoriesOf(corpus, document.collection, document.slug),
		}));
		write(`search/catalog-lite.${locale}.json`, compactJson(catalogLite));
		const leads: SearchLeads = Object.fromEntries(
			documents
				.filter((document) => document.description !== '')
				.map((document) => [document.id, document.description]),
		);
		write(`search/leads.${locale}.json`, compactJson(leads));
	}

	const counts: Record<string, number> = {};
	for (const collection of COLLECTIONS) {
		counts[collection] = (corpus[collection] as Map<string, unknown>).size;
	}
	write(
		'meta.json',
		compactJson({
			schemaVersion: SCHEMA_VERSION,
			contentHash: input.contentHash,
			counts,
			generatedAt: null,
		}),
	);

	const mobileTransferBytes = mobileTransferSize(mobileFiles);
	const mobileFindings = [
		budgetIssue(
			'the mobile-bundled set, gzipped as one stream,',
			mobileTransferBytes,
			MOBILE_TRANSFER_BUDGET_BYTES,
			'OTA update and store download size',
		),
		budgetIssue(
			'the mobile-bundled raw total',
			mobileBundledBytes(artifacts),
			MOBILE_STORAGE_CEILING_BYTES,
			'installed bundle storage',
		),
	];
	issues.push(...mobileFindings.filter((finding) => finding !== undefined));

	return { issues, artifacts, mobileTransferBytes };
}

/**
 * Every collection's full presentation slice before any sharding, which is
 * what a reader gets back from `readPresentationSlice`.
 */
export function buildPresentationSlices(
	input: Pick<EmitInput, 'corpus' | 'generatedUnits'>,
): Record<CollectionName, PresentationRecord> {
	const { corpus } = input;
	const slices = {} as Record<CollectionName, PresentationRecord>;
	for (const collection of COLLECTIONS) {
		const record: PresentationRecord = {};
		for (const [slug, entity] of corpus[collection] as Map<string, Record<string, unknown>>) {
			record[slug] = presentationOf(entity);
		}
		if (collection === 'units') {
			for (const slug of input.generatedUnits) {
				record[slug] = { ...record[slug], generated: true };
			}
		}
		if (collection === 'equations') {
			for (const [slug, equation] of corpus.equations) {
				record[slug] = {
					...record[slug],
					expressionTex: canonicalTex(equation.expression),
					relatedUnits: deriveRelatedUnits(equation.terms, corpus),
				};
			}
		}
		if (collection === 'paths') {
			for (const [slug, path] of corpus.paths) {
				record[slug] = {
					...record[slug],
					steps: presentationSteps(path, corpus),
				};
			}
		}
		slices[collection] = record;
	}
	return slices;
}

export function buildEngineSlice(
	input: Pick<EmitInput, 'corpus' | 'resolved' | 'contentHash'>,
): EngineSlice {
	const { corpus, resolved } = input;
	const slice: EngineSlice = {
		schemaVersion: SCHEMA_VERSION,
		contentHash: input.contentHash,
		magnitudes: {},
		units: {},
		prefixes: {},
		constants: {},
		equations: {},
	};
	for (const [slug, magnitude] of corpus.magnitudes) {
		const baseUnit = resolved.get(magnitude.baseUnit);
		const displayUnit =
			magnitude.displayUnit === undefined ? undefined : corpus.units.get(magnitude.displayUnit);
		slice.magnitudes[slug] = {
			slug,
			name: magnitude.name,
			symbolTex: magnitude.symbol.tex,
			baseUnit: magnitude.baseUnit,
			...(magnitude.displayUnit === undefined || displayUnit === undefined
				? {}
				: {
						displayUnit: {
							slug: magnitude.displayUnit,
							name: displayUnit.name,
							symbolTex: displayUnit.symbol.tex,
							symbolText: symbolText(displayUnit.symbol),
						},
					}),
			dimension: baseUnit?.dimension ?? [0, 0, 0, 0, 0, 0, 0, 0],
			...(magnitude.kindOf === undefined ? {} : { kindOf: magnitude.kindOf }),
			nonNegative: magnitude.nonNegative,
		};
	}
	for (const [slug, unit] of corpus.units) {
		const resolution = resolved.get(slug);
		if (resolution === undefined) {
			continue;
		}
		slice.units[slug] = {
			slug,
			name: unit.name,
			symbolTex: unit.symbol.tex,
			symbolText: symbolText(unit.symbol),
			magnitudes: unit.unitOf,
			system: unit.system,
			dimension: resolution.dimension,
			factor: resolution.factorText,
			offset: resolution.offsetText,
			exact: resolution.exact,
			affine: resolution.affine,
		};
	}
	for (const [slug, prefix] of corpus.prefixes) {
		slice.prefixes[slug] = {
			slug,
			name: prefix.name,
			symbolTex: prefix.symbol.tex,
			value: prefix.value,
		};
	}
	for (const [slug, constant] of corpus.constants) {
		slice.constants[slug] = {
			slug,
			name: constant.name,
			symbolTex: constant.symbol.tex,
			symbolText: symbolText(constant.symbol),
			value: constant.value,
			unit: constant.unit,
			exact: constant.exact,
			irrational: constant.irrational,
		};
	}
	for (const [slug, equation] of corpus.equations) {
		const terms: EngineSlice['equations'][string]['terms'] = {};
		for (const [key, term] of Object.entries(equation.terms)) {
			const compiled: CompiledEquationTerm = {
				kind: term.kind,
				identifier: termIdentifier(key, term.identifier),
			};
			if (term.kind === 'symbol') {
				compiled.label = term.label;
				if (term.unit !== undefined) {
					compiled.unit = term.unit;
				}
			} else {
				compiled.ref = term.ref;
			}
			if (term.kind !== 'constant' && term.integer) {
				compiled.integer = true;
			}
			if (term.kind !== 'constant' && term.delta) {
				compiled.delta = true;
			}
			terms[key] = compiled;
		}
		slice.equations[slug] = {
			slug,
			kind: equation.kind,
			name: equation.name,
			calculatorEnabled: equation.calculator.enabled,
			terms,
			solvable: calculatorTargets(equation)
				.filter((key) => equation.solutions[key] !== undefined)
				.sort(),
		};
	}
	return slice;
}

/**
 * Editor-facing JSON Schema of one collection's authored form: input side
 * of the Zod contract (failsafe-parse string coercions stay strings) so
 * yaml-language-server validates and completes exactly what the pipeline
 * accepts. Draft-07 is the dialect that server supports fully.
 */
function authoringSchema(collection: CollectionName): unknown {
	return z.toJSONSchema(collectionSchemas[collection], { io: 'input', target: 'draft-7' });
}

/**
 * Editor-facing JSON Schema of a collection's `<slug>.<locale>.yaml`
 * translation sidecar — the same strict shape the loader validates.
 */
function sidecarAuthoringSchema(collection: CollectionName): unknown {
	return z.toJSONSchema(localeSidecarSchemas[collection], { io: 'input', target: 'draft-7' });
}

/**
 * Presentation form of one entity. TeX fields are canonical (the exact
 * math body keys); prose ships raw and every reader splits it with
 * `splitRichText`, since pre-split segments outweighed the prose itself
 * (ADR 0010).
 */
function presentationOf(entity: Record<string, unknown>): Record<string, unknown> {
	const { symbol, symbolAlt, ...rest } = entity as {
		symbol?: AuthoredSymbol;
		symbolAlt?: AuthoredSymbol;
	} & Record<string, unknown>;
	return {
		...rest,
		...(symbol === undefined
			? {}
			: { symbolTex: canonicalTex(symbol.tex), symbolText: symbolText(symbol) }),
		...(symbolAlt === undefined
			? {}
			: { symbolAltTex: canonicalTex(symbolAlt.tex), symbolAltText: symbolText(symbolAlt) }),
	};
}

function searchDocuments(corpus: Corpus, locale: SearchLocale): SearchDocument[] {
	const documents: SearchDocument[] = [];
	for (const collection of COLLECTIONS) {
		const slugs = [...(corpus[collection] as Map<string, unknown>).keys()].sort();
		for (const slug of slugs) {
			const entity = (corpus[collection] as Map<string, Record<string, unknown>>).get(slug);
			if (entity === undefined) {
				continue;
			}
			documents.push(searchDocumentOf(corpus, collection, slug, entity, locale));
		}
	}
	return documents;
}

/**
 * Category slugs a catalog row is badged with: a branch carries its parent
 * category, a category carries none (it is the category), every other
 * entry its own `categories` in authored order.
 */
function catalogCategoriesOf(corpus: Corpus, collection: string, slug: string): string[] {
	if (collection === 'categories') return [];
	if (collection === 'branches') {
		const branch = corpus.branches.get(slug);
		return branch === undefined ? [] : [branch.category];
	}
	const entity = (
		corpus[collection as CollectionName] as Map<string, { categories?: string[] }>
	).get(slug);
	return entity?.categories ?? [];
}

function searchDocumentOf(
	corpus: Corpus,
	collection: CollectionName,
	slug: string,
	entity: Record<string, unknown>,
	locale: SearchLocale,
): SearchDocument {
	const name = entity.name as { en: string; es?: string };
	const description = entity.description as { en: string; es?: string } | undefined;
	const symbol = entity.symbol as AuthoredSymbol | undefined;
	const localizedDescription = description?.[locale] ?? description?.en ?? '';
	const branchNames = ((entity.branches as string[] | undefined) ?? [])
		.map((branchSlug) => corpus.branches.get(branchSlug)?.name)
		.filter((branchName) => branchName !== undefined)
		.map((branchName) => branchName[locale] ?? branchName.en);
	return {
		id: `${collection}:${slug}`,
		collection,
		slug,
		name: name[locale] ?? name.en,
		description: searchLeadOf(localizedDescription),
		aliases: (entity.aliases as string[] | undefined) ?? [],
		symbolText: symbol === undefined ? '' : symbolText(symbol),
		branches: branchNames,
	};
}
