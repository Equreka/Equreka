import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { collectionSchemas } from '@equreka/schema';
import { parse as parseYaml } from 'yaml';
import { convertCategories } from './convert-categories.js';
import { convertConstants } from './convert-constants.js';
import { convertEquations } from './convert-equations.js';
import { convertMagnitudes } from './convert-magnitudes.js';
import { convertPrefixes } from './convert-prefixes.js';
import { convertUnits } from './convert-units.js';
import { convertVariables } from './convert-variables.js';
import { loadCorpus } from './corpus.js';
import { emitYaml } from './emit-yaml.js';
import { buildFixtures } from './fixtures.js';
import { MigrationError, MigrationReport } from './report.js';
import { EXPECTED_COUNTS } from './tables.js';

type Collections = Record<string, Map<string, Record<string, unknown>>>;

const toolRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(toolRoot, '..', '..');
const legacyContentRoot = join(toolRoot, 'legacy', 'content');
const contentRoot = join(repoRoot, 'packages', 'content', 'content');
const fixturesDirectory = join(repoRoot, 'packages', 'engine', 'test', 'fixtures');
const fixturesPath = join(fixturesDirectory, 'legacy-conversions.json');

function validateAll(collections: Collections): string[] {
	const failures: string[] = [];
	for (const [collection, entities] of Object.entries(collections)) {
		const schema = collectionSchemas[collection as keyof typeof collectionSchemas];
		for (const [slug, entity] of entities) {
			const result = schema.safeParse(entity);
			if (!result.success) {
				for (const issue of result.error.issues) {
					failures.push(
						`${collection}/${slug}.yaml: ${issue.path.join('.') || '(root)'} — ${issue.message}`,
					);
				}
			}
		}
	}
	return failures;
}

function writeCollections(collections: Collections): void {
	for (const [collection, entities] of Object.entries(collections)) {
		const directory = join(contentRoot, collection);
		rmSync(directory, { recursive: true, force: true });
		mkdirSync(directory, { recursive: true });
		for (const [slug, entity] of entities) {
			writeFileSync(join(directory, `${slug}.yaml`), emitYaml(entity, `${collection}/${slug}`));
		}
	}
}

function checkReferences(collections: Collections): string[] {
	const problems: string[] = [];
	const slugsOf = (collection: string): Set<string> =>
		new Set(collections[collection]?.keys() ?? []);
	const categories = slugsOf('categories');
	const magnitudes = slugsOf('magnitudes');
	const units = slugsOf('units');
	const prefixes = slugsOf('prefixes');
	const byKind: Record<string, Set<string>> = {
		magnitude: magnitudes,
		constant: slugsOf('constants'),
		variable: slugsOf('variables'),
	};
	const check = (context: string, target: Set<string>, ref: unknown): void => {
		if (typeof ref !== 'string' || !target.has(ref)) {
			problems.push(`${context}: dangling ref '${String(ref)}'`);
		}
	};
	for (const [collection, entities] of Object.entries(collections)) {
		for (const [slug, entity] of entities) {
			const context = `${collection}/${slug}`;
			for (const category of (entity.categories as string[] | undefined) ?? []) {
				check(`${context}.categories`, categories, category);
			}
			if (collection === 'magnitudes') check(`${context}.baseUnit`, units, entity.baseUnit);
			if (collection === 'constants') check(`${context}.unit`, units, entity.unit);
			if (collection === 'variables' && entity.defaultUnit !== undefined) {
				check(`${context}.defaultUnit`, units, entity.defaultUnit);
			}
			if (collection === 'units') {
				for (const magnitude of entity.unitOf as string[]) {
					check(`${context}.unitOf`, magnitudes, magnitude);
				}
				const prefixOf = entity.prefixOf as { prefix: string; base: string } | undefined;
				if (prefixOf !== undefined) {
					check(`${context}.prefixOf.prefix`, prefixes, prefixOf.prefix);
					check(`${context}.prefixOf.base`, units, prefixOf.base);
				}
				for (const operand of (entity.compose as Array<{ unit: string }> | undefined) ?? []) {
					check(`${context}.compose`, units, operand.unit);
				}
			}
			if (collection === 'equations') {
				const terms = entity.terms as Record<string, { kind: string; ref: string }>;
				for (const [key, term] of Object.entries(terms)) {
					const target = byKind[term.kind];
					if (target === undefined) {
						problems.push(`${context}.terms.${key}: unknown kind '${term.kind}'`);
					} else {
						check(`${context}.terms.${key}`, target, term.ref);
					}
				}
				for (const unit of (entity.units as string[] | undefined) ?? []) {
					check(`${context}.units`, units, unit);
				}
			}
		}
	}
	return problems;
}

function verifyEmitted(): string[] {
	const problems: string[] = [];
	for (const [collection, expected] of Object.entries(EXPECTED_COUNTS)) {
		const directory = join(contentRoot, collection);
		const files = readdirSync(directory).filter((file) => file.endsWith('.yaml'));
		if (files.length !== expected) {
			problems.push(`${collection}: emitted ${files.length} files, expected ${expected}`);
		}
		const schema = collectionSchemas[collection as keyof typeof collectionSchemas];
		for (const file of files) {
			const parsed: unknown = parseYaml(readFileSync(join(directory, file), 'utf8'));
			const result = schema.safeParse(parsed);
			if (!result.success) {
				for (const issue of result.error.issues) {
					problems.push(
						`${collection}/${file}: ${issue.path.join('.') || '(root)'} — ${issue.message}`,
					);
				}
			}
		}
	}
	return problems;
}

function main(): number {
	const report = new MigrationReport();
	const corpus = loadCorpus(legacyContentRoot);

	const magnitudes = convertMagnitudes(corpus, report);
	const collections: Collections = {
		categories: convertCategories(corpus, report),
		magnitudes: magnitudes.entities,
		units: convertUnits(corpus, magnitudes, report),
		prefixes: convertPrefixes(corpus, report),
		constants: convertConstants(corpus, report),
		variables: convertVariables(corpus, report),
		equations: convertEquations(corpus, report),
	};
	const fixtures = buildFixtures(corpus, report);

	const invalid = validateAll(collections);
	if (invalid.length > 0) {
		console.error(`schema validation failed with ${invalid.length} issue(s):`);
		for (const failure of invalid) console.error(`  ${failure}`);
		return 1;
	}

	const danglingRefs = checkReferences(collections);
	if (danglingRefs.length > 0) {
		console.error(`referential integrity failed (${danglingRefs.length}):`);
		for (const problem of danglingRefs) console.error(`  ${problem}`);
		return 1;
	}

	writeCollections(collections);
	mkdirSync(fixturesDirectory, { recursive: true });
	writeFileSync(fixturesPath, `${JSON.stringify(fixtures, null, '\t')}\n`);

	const verification = verifyEmitted();
	if (verification.length > 0) {
		console.error(`post-write verification failed (${verification.length}):`);
		for (const problem of verification) console.error(`  ${problem}`);
		return 1;
	}

	for (const [collection, entities] of Object.entries(collections)) {
		report.setCount(collection, entities.size);
	}
	report.print();
	console.log(`content written to ${contentRoot}`);
	console.log(`fixtures written to ${fixturesPath}`);
	return 0;
}

try {
	process.exitCode = main();
} catch (error) {
	if (error instanceof MigrationError) {
		console.error(`migration aborted: ${error.message}`);
		process.exitCode = 1;
	} else {
		throw error;
	}
}
