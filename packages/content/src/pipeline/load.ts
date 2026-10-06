import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	COLLECTIONS,
	type CollectionName,
	collectionLocaleTrees,
	localeSidecarSchemas,
	SOURCE_LOCALE,
} from '@equreka/schema';
import { parseDocument } from 'yaml';
import { inlineLocaleKeys, mergeSidecar, parseContentFilename } from './locale-sidecar.js';
import { type ContentFile, type Issue, issue } from './types.js';

/**
 * Failsafe schema: every scalar parses as a string, so float64 truncation of
 * unquoted numerics is structurally impossible and YAML 1.1 re-typing
 * (octals, yes/no booleans, tags, merge keys) is neutralized (ADR 0002).
 * Typed coercion happens once, in @equreka/schema.
 */
const PARSE_OPTIONS = {
	version: '1.2',
	schema: 'failsafe',
	merge: false,
	uniqueKeys: true,
} as const;

/**
 * One entity with its translation sidecars already folded into `data`;
 * `sidecars` lists the files that contributed.
 */
export interface LoadedEntry {
	file: ContentFile;
	data: unknown;
	sidecars: ContentFile[];
}

/**
 * `files` is every file that parsed — entities and sidecars — and is what
 * the content hash covers.
 */
export interface LoadedCollection {
	entries: LoadedEntry[];
	files: ContentFile[];
	issues: Issue[];
}

export interface LoadedContent {
	byCollection: Map<CollectionName, LoadedEntry[]>;
	files: ContentFile[];
	contentHash: string;
	issues: Issue[];
}

type ParsedFile = { file: ContentFile; data: unknown; warnings: Issue[] } | { issues: Issue[] };

function readContentFile(
	dir: string,
	collection: CollectionName,
	name: string,
	slug: string,
	locale: ContentFile['locale'],
): ParsedFile {
	const relPath = `${collection}/${name}`;
	const absPath = join(dir, name);
	const bytes = readFileSync(absPath);
	const text = bytes.toString('utf8');
	const document = parseDocument(text, PARSE_OPTIONS);
	const warnings = document.warnings.map((warning) =>
		issue('warning', 'load', relPath, `YAML: ${warning.message}`),
	);
	if (document.errors.length > 0) {
		return {
			issues: [
				...warnings,
				...document.errors.map((error) =>
					issue('error', 'load', relPath, `YAML: ${error.message}`),
				),
			],
		};
	}
	const file: ContentFile = { collection, slug, relPath, absPath, bytes, text };
	return {
		file: locale === undefined ? file : { ...file, locale },
		data: document.toJS(),
		warnings,
	};
}

/**
 * Stage 1 for one collection. A missing directory is a valid empty
 * collection; YAML parse failures aggregate per file instead of aborting the
 * walk. Translation sidecars (`<slug>.<locale>.yaml`) are validated against
 * the collection's sidecar schema and merged into their entity before any
 * entity validation, so downstream stages see one localized object per field
 * and `localizedText` stays the single contract.
 */
export function loadCollection(contentDir: string, collection: CollectionName): LoadedCollection {
	const issues: Issue[] = [];
	const entries: LoadedEntry[] = [];
	const files: ContentFile[] = [];
	const dir = join(contentDir, collection);
	if (!existsSync(dir)) {
		return { entries, files, issues };
	}
	const tree = collectionLocaleTrees[collection];
	const sidecarSchema = localeSidecarSchemas[collection];
	const names = readdirSync(dir)
		.filter((name) => name.endsWith('.yaml'))
		.sort();
	const sidecarNames: { name: string; slug: string; locale: NonNullable<ContentFile['locale']> }[] =
		[];
	const unparsedSlugs = new Set<string>();

	for (const name of names) {
		const parsedName = parseContentFilename(name);
		if (!parsedName.ok) {
			issues.push(issue('error', 'load', `${collection}/${name}`, parsedName.message));
			continue;
		}
		if (parsedName.locale !== null) {
			sidecarNames.push({ name, slug: parsedName.slug, locale: parsedName.locale });
			continue;
		}
		const parsed = readContentFile(dir, collection, name, parsedName.slug, undefined);
		if ('issues' in parsed) {
			issues.push(...parsed.issues);
			unparsedSlugs.add(parsedName.slug);
			continue;
		}
		issues.push(...parsed.warnings);
		for (const path of inlineLocaleKeys(tree, parsed.data)) {
			issues.push(
				issue(
					'error',
					'load',
					parsed.file.relPath,
					`${path}: only '${SOURCE_LOCALE}' is authored inline — translations live in ${parsedName.slug}.<locale>.yaml`,
				),
			);
		}
		files.push(parsed.file);
		entries.push({ file: parsed.file, data: parsed.data, sidecars: [] });
	}

	for (const { name, slug, locale } of sidecarNames) {
		const relPath = `${collection}/${name}`;
		const parsed = readContentFile(dir, collection, name, slug, locale);
		if ('issues' in parsed) {
			issues.push(...parsed.issues);
			continue;
		}
		issues.push(...parsed.warnings);
		files.push(parsed.file);
		const index = entries.findIndex((entry) => entry.file.slug === slug);
		if (index === -1) {
			if (!unparsedSlugs.has(slug)) {
				issues.push(
					issue('error', 'load', relPath, `sidecar for unknown entity '${slug}' (no ${slug}.yaml)`),
				);
			}
			continue;
		}
		const shape = sidecarSchema.safeParse(parsed.data);
		if (!shape.success) {
			for (const zodIssue of shape.error.issues) {
				const at = zodIssue.path.length > 0 ? zodIssue.path.join('.') : '(root)';
				issues.push(issue('error', 'load', relPath, `${at}: ${zodIssue.message}`));
			}
			continue;
		}
		const entry = entries[index] as LoadedEntry;
		const merged = mergeSidecar(tree, entry.data, shape.data, locale);
		for (const message of merged.errors) {
			issues.push(issue('error', 'load', relPath, message));
		}
		entries[index] = {
			...entry,
			data: merged.data,
			sidecars: [...entry.sidecars, parsed.file],
		};
	}
	return { entries, files, issues };
}

export function loadContent(contentDir: string): LoadedContent {
	const issues: Issue[] = [];
	const byCollection = new Map<CollectionName, LoadedEntry[]>();
	const files: ContentFile[] = [];
	for (const collection of COLLECTIONS) {
		const loaded = loadCollection(contentDir, collection);
		issues.push(...loaded.issues);
		byCollection.set(collection, loaded.entries);
		files.push(...loaded.files);
	}
	return { byCollection, files, contentHash: contentHashOf(files), issues };
}

/**
 * sha256 over the sorted per-file digests — stable against directory
 * enumeration order and platform path separators, so it can double as the
 * artifact cache-busting token.
 */
export function contentHashOf(files: readonly ContentFile[]): string {
	const lines = files
		.map((file) => `${file.relPath}:${sha256(file.bytes)}`)
		.sort()
		.join('\n');
	return sha256(Buffer.from(lines, 'utf8'));
}

export function sha256(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}
