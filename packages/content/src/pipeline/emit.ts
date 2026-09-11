import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	type Symbol as AuthoredSymbol,
	COLLECTIONS,
	type CollectionName,
	type CompiledEquationTerm,
	collectionSchemas,
	type EngineSlice,
	engineSlice,
	type LocalizedText,
	SCHEMA_VERSION,
} from '@equreka/schema';
import MiniSearch from 'minisearch';
import { z } from 'zod';
import { canonicalTex, splitLocalizedText } from '../rich-text.js';
import {
	type CatalogLiteEntry,
	SEARCH_LOCALES,
	type SearchDocument,
	type SearchLocale,
	searchOptions,
} from '../search-options.js';
import type { MathArtifact } from './math-artifact.js';
import { presentationSteps } from './path-targets.js';
import { deriveRelatedUnits } from './related-units.js';
import type { ResolvedUnit } from './resolve.js';
import { generateSolutionsModule } from './solution-codegen.js';
import type { SolutionAst } from './solution-parser.js';
import type { EquationVerification } from './solution-verify.js';
import { stableStringify } from './stable-json.js';
import { stripTexForSearch, symbolText } from './tex.js';
import { type Issue, issue } from './types.js';
import type { Corpus } from './validate.js';

const ENGINE_BUDGET_BYTES = 500 * 1024;
const SEARCH_BUDGET_BYTES = 1024 * 1024;
const MATH_ATLAS_BUDGET_BYTES = 200 * 1024;
const MATH_BODIES_BUDGET_BYTES = 1024 * 1024;

export interface EmitInput {
	corpus: Corpus;
	resolved: Map<string, ResolvedUnit>;
	verifications: Map<string, EquationVerification>;
	math: MathArtifact;
	contentHash: string;
	outDir: string;
}

export interface EmittedArtifact {
	relPath: string;
	bytes: number;
}

export interface EmitResult {
	issues: Issue[];
	artifacts: EmittedArtifact[];
}

export function emitArtifacts(input: EmitInput): EmitResult {
	const issues: Issue[] = [];
	const artifacts: EmittedArtifact[] = [];
	const { corpus, outDir } = input;

	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(join(outDir, 'presentation', 'math'), { recursive: true });
	mkdirSync(join(outDir, 'search'), { recursive: true });
	mkdirSync(join(outDir, 'schemas'), { recursive: true });

	const write = (relPath: string, text: string, budget?: number): void => {
		const bytes = Buffer.byteLength(text, 'utf8');
		writeFileSync(join(outDir, ...relPath.split('/')), text, 'utf8');
		artifacts.push({ relPath, bytes });
		if (budget !== undefined && bytes > budget) {
			issues.push(
				issue('error', 'emit', '', `${relPath} is ${bytes} bytes, over its ${budget}-byte budget`),
			);
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
		return { issues, artifacts };
	}
	write('engine.json', `${stableStringify(slice)}\n`, ENGINE_BUDGET_BYTES);

	const solutionAsts = new Map<string, ReadonlyMap<string, SolutionAst>>();
	for (const [slug, verification] of input.verifications) {
		solutionAsts.set(slug, verification.asts);
	}
	const solutionsModule = generateSolutionsModule(solutionAsts);
	write('solutions.js', solutionsModule.js);
	write('solutions.d.ts', solutionsModule.dts);

	for (const collection of COLLECTIONS) {
		const record: Record<string, unknown> = {};
		for (const [slug, entity] of corpus[collection] as Map<string, Record<string, unknown>>) {
			record[slug] = presentationOf(entity);
		}
		if (collection === 'equations') {
			for (const [slug, equation] of corpus.equations) {
				record[slug] = {
					...(record[slug] as Record<string, unknown>),
					expressionTex: canonicalTex(equation.expression),
					relatedUnits: deriveRelatedUnits(equation.terms, corpus),
				};
			}
		}
		if (collection === 'paths') {
			for (const [slug, path] of corpus.paths) {
				record[slug] = {
					...(record[slug] as Record<string, unknown>),
					steps: presentationSteps(path, corpus),
				};
			}
		}
		write(`presentation/${collection}.json`, `${stableStringify(record)}\n`);
		write(`schemas/${collection}.schema.json`, `${stableStringify(authoringSchema(collection))}\n`);
	}

	write(
		'presentation/math/atlas.json',
		`${stableStringify(input.math.atlas)}\n`,
		MATH_ATLAS_BUDGET_BYTES,
	);
	write(
		'presentation/math/bodies.json',
		`${stableStringify(input.math.bodies)}\n`,
		MATH_BODIES_BUDGET_BYTES,
	);

	for (const locale of SEARCH_LOCALES) {
		const documents = searchDocuments(corpus, locale);
		const index = new MiniSearch(searchOptions);
		index.addAll(documents);
		write(
			`search/${locale}.json`,
			`${stableStringify(JSON.parse(JSON.stringify(index)))}\n`,
			SEARCH_BUDGET_BYTES,
		);
		const catalogLite: CatalogLiteEntry[] = documents.map((document) => ({
			collection: document.collection,
			slug: document.slug,
			name: document.name,
			symbolText: document.symbolText,
			aliases: document.aliases,
		}));
		write(
			`search/catalog-lite.${locale}.json`,
			`${stableStringify(catalogLite)}\n`,
			SEARCH_BUDGET_BYTES,
		);
	}

	const counts: Record<string, number> = {};
	for (const collection of COLLECTIONS) {
		counts[collection] = (corpus[collection] as Map<string, unknown>).size;
	}
	write(
		'meta.json',
		`${stableStringify({
			schemaVersion: SCHEMA_VERSION,
			contentHash: input.contentHash,
			counts,
			generatedAt: null,
		})}\n`,
	);

	return { issues, artifacts };
}

function buildEngineSlice(input: EmitInput): EngineSlice {
	const { corpus, resolved, verifications } = input;
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
		slice.magnitudes[slug] = {
			slug,
			name: magnitude.name,
			symbolTex: magnitude.symbol.tex,
			baseUnit: magnitude.baseUnit,
			dimension: baseUnit?.dimension ?? [0, 0, 0, 0, 0, 0, 0, 0],
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
		const identifierByTermKey = verifications.get(slug)?.identifierByTermKey ?? {};
		const terms: EngineSlice['equations'][string]['terms'] = {};
		for (const [key, term] of Object.entries(equation.terms)) {
			const compiled: CompiledEquationTerm = {
				kind: term.kind,
				identifier: identifierByTermKey[key] ?? key,
			};
			if (term.kind === 'symbol') {
				compiled.label = term.label;
				if (term.unit !== undefined) {
					compiled.unit = term.unit;
				}
			} else {
				compiled.ref = term.ref;
			}
			terms[key] = compiled;
		}
		slice.equations[slug] = {
			slug,
			kind: equation.kind,
			name: equation.name,
			calculatorEnabled: equation.calculator.enabled,
			terms,
			solvable: Object.keys(equation.solutions).sort(),
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
 * Presentation form of one entity. TeX fields are canonical (the exact
 * `math/bodies.json` keys) and prose is mirrored as pre-split segments; the
 * raw description stays for renderers that split at build time themselves.
 */
function presentationOf(entity: Record<string, unknown>): Record<string, unknown> {
	const { symbol, symbolAlt, ...rest } = entity as {
		symbol?: AuthoredSymbol;
		symbolAlt?: AuthoredSymbol;
		description?: LocalizedText;
	} & Record<string, unknown>;
	const record: Record<string, unknown> = { ...rest };
	if (symbol !== undefined) {
		record.symbolTex = canonicalTex(symbol.tex);
		record.symbolText = symbolText(symbol);
	}
	if (symbolAlt !== undefined) {
		record.symbolAltTex = canonicalTex(symbolAlt.tex);
		record.symbolAltText = symbolText(symbolAlt);
	}
	if (rest.description !== undefined) {
		record.descriptionSegments = splitLocalizedText(rest.description);
	}
	return record;
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
			documents.push(searchDocumentOf(collection, slug, entity, locale));
		}
	}
	return documents;
}

function searchDocumentOf(
	collection: CollectionName,
	slug: string,
	entity: Record<string, unknown>,
	locale: SearchLocale,
): SearchDocument {
	const name = entity.name as { en: string; es?: string };
	const description = entity.description as { en: string; es?: string } | undefined;
	const symbol = entity.symbol as AuthoredSymbol | undefined;
	const localizedDescription = description?.[locale] ?? description?.en ?? '';
	return {
		id: `${collection}:${slug}`,
		collection,
		slug,
		name: name[locale] ?? name.en,
		description: stripTexForSearch(localizedDescription),
		aliases: (entity.aliases as string[] | undefined) ?? [],
		symbolText: symbol === undefined ? '' : symbolText(symbol),
	};
}
