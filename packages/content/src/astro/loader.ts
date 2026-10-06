import { fileURLToPath } from 'node:url';
import {
	type CollectionName,
	collectionSchemas,
	type Prefix,
	prefix as prefixSchema,
	type Unit,
} from '@equreka/schema';
import { type LoadedCollection, loadCollection } from '../pipeline/load.js';
import { expandPrefixedUnits } from '../pipeline/prefix-expansion.js';

/**
 * Structural subset of Astro's Content Layer Loader contract — declared
 * locally so this package never depends on Astro types (apps/web lands in
 * P4; the shapes below are the stable public loader surface).
 */
export interface LoaderDataStore {
	set(entry: { id: string; data: Record<string, unknown> }): boolean | Promise<boolean>;
	clear(): void;
}

export interface LoaderLogger {
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

export interface LoaderContext {
	store: LoaderDataStore;
	logger: LoaderLogger;
}

export interface Loader {
	name: string;
	load(context: LoaderContext): Promise<void>;
}

export interface EqurekaLoaderOptions {
	contentDir?: string;
}

interface LoaderEntry {
	id: string;
	data: Record<string, unknown>;
}

/**
 * The units collection with its generated prefixed units (ADR 0007), so the
 * site builds a page for every unit the artifact carries. Prefixes that
 * fail validation are skipped here; the prefixes loader reports them.
 */
function expandedUnitEntries(
	contentDir: string,
	loaded: LoadedCollection,
	entries: readonly LoaderEntry[],
	problems: string[],
): LoaderEntry[] {
	const prefixes = new Map<string, Prefix>();
	for (const entry of loadCollection(contentDir, 'prefixes').entries) {
		const parsed = prefixSchema.safeParse(entry.data);
		if (parsed.success) {
			prefixes.set(entry.file.slug, parsed.data);
		}
	}
	const expansion = expandPrefixedUnits(
		new Map(entries.map((entry) => [entry.id, entry.data as unknown as Unit])),
		prefixes,
		new Map(loaded.entries.map((entry) => [entry.file.slug, entry.data])),
	);
	for (const entry of expansion.issues) {
		if (entry.severity === 'error') {
			problems.push(`${entry.file}: ${entry.message}`);
		}
	}
	return [...expansion.units].map(([id, unit]) => ({
		id,
		data: unit as unknown as Record<string, unknown>,
	}));
}

export function equrekaLoader(
	collection: CollectionName,
	options: EqurekaLoaderOptions = {},
): Loader {
	const contentDir =
		options.contentDir ?? fileURLToPath(new URL('../../content/', import.meta.url));
	return {
		name: `equreka-${collection}`,
		async load({ store, logger }): Promise<void> {
			const loaded = loadCollection(contentDir, collection);
			const schema = collectionSchemas[collection];
			const problems = loaded.issues.map((entry) => `${entry.file}: ${entry.message}`);
			const parsedEntries: LoaderEntry[] = [];
			for (const entry of loaded.entries) {
				const parsed = schema.safeParse(entry.data);
				if (!parsed.success) {
					for (const zodIssue of parsed.error.issues) {
						problems.push(
							`${entry.file.relPath}: ${zodIssue.path.join('.') || '(root)'}: ${zodIssue.message}`,
						);
					}
					continue;
				}
				parsedEntries.push({ id: entry.file.slug, data: parsed.data as Record<string, unknown> });
			}
			const entries =
				collection === 'units'
					? expandedUnitEntries(contentDir, loaded, parsedEntries, problems)
					: parsedEntries;
			if (problems.length > 0) {
				throw new Error(`equreka ${collection} loader: ${problems.join('; ')}`);
			}
			store.clear();
			for (const entry of entries) {
				await store.set(entry);
			}
			logger.info(`loaded ${entries.length} ${collection} entries`);
		},
	};
}
