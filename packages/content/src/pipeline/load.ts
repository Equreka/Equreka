import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLLECTIONS, type CollectionName } from '@equreka/schema';
import { parseDocument } from 'yaml';
import { type ContentFile, type Issue, issue } from './types.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export interface LoadedEntry {
	file: ContentFile;
	data: unknown;
}

export interface LoadedCollection {
	entries: LoadedEntry[];
	issues: Issue[];
}

export interface LoadedContent {
	byCollection: Map<CollectionName, LoadedEntry[]>;
	files: ContentFile[];
	contentHash: string;
	issues: Issue[];
}

/**
 * Stage 1 for one collection. A missing directory is a valid empty
 * collection (paths/ has no entries yet); YAML parse failures aggregate per
 * file instead of aborting the walk.
 */
export function loadCollection(contentDir: string, collection: CollectionName): LoadedCollection {
	const issues: Issue[] = [];
	const entries: LoadedEntry[] = [];
	const dir = join(contentDir, collection);
	if (!existsSync(dir)) {
		return { entries, issues };
	}
	const names = readdirSync(dir)
		.filter((name) => name.endsWith('.yaml'))
		.sort();
	for (const name of names) {
		const relPath = `${collection}/${name}`;
		const slug = name.slice(0, -'.yaml'.length);
		if (!SLUG_RE.test(slug)) {
			issues.push(issue('error', 'load', relPath, 'filename must be a kebab-case slug'));
			continue;
		}
		const absPath = join(dir, name);
		const bytes = readFileSync(absPath);
		const text = bytes.toString('utf8');
		const document = parseDocument(text, PARSE_OPTIONS);
		for (const warning of document.warnings) {
			issues.push(issue('warning', 'load', relPath, `YAML: ${warning.message}`));
		}
		if (document.errors.length > 0) {
			for (const error of document.errors) {
				issues.push(issue('error', 'load', relPath, `YAML: ${error.message}`));
			}
			continue;
		}
		entries.push({
			file: { collection, slug, relPath, absPath, bytes, text },
			data: document.toJS(),
		});
	}
	return { entries, issues };
}

export function loadContent(contentDir: string): LoadedContent {
	const issues: Issue[] = [];
	const byCollection = new Map<CollectionName, LoadedEntry[]>();
	const files: ContentFile[] = [];
	for (const collection of COLLECTIONS) {
		const loaded = loadCollection(contentDir, collection);
		issues.push(...loaded.issues);
		byCollection.set(collection, loaded.entries);
		files.push(...loaded.entries.map((entry) => entry.file));
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
