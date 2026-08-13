import { fileURLToPath } from 'node:url';
import { type CollectionName, collectionSchemas } from '@equreka/schema';
import { loadCollection } from '../pipeline/load.js';

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
			const entries: { id: string; data: Record<string, unknown> }[] = [];
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
				entries.push({ id: entry.file.slug, data: parsed.data as Record<string, unknown> });
			}
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
