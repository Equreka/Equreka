import { type CollectionName, collectionSchemas, SOURCE_LOCALE } from '@equreka/schema';
import type { z } from 'zod';
import type { LoadedContent } from './load.js';
import { type Issue, issue } from './types.js';

/**
 * Every validated entity by collection and slug. Mapped over the schema map,
 * so a collection joins the corpus type by joining `collectionSchemas`.
 */
export type Corpus = {
	[C in CollectionName]: Map<string, z.output<(typeof collectionSchemas)[C]>>;
};

export interface ValidateResult {
	corpus: Corpus;
	issues: Issue[];
}

export function emptyCorpus(): Corpus {
	return {
		categories: new Map(),
		branches: new Map(),
		magnitudes: new Map(),
		units: new Map(),
		prefixes: new Map(),
		constants: new Map(),
		variables: new Map(),
		equations: new Map(),
		paths: new Map(),
	};
}

export function validateContent(loaded: LoadedContent): ValidateResult {
	const issues: Issue[] = [];
	const corpus = emptyCorpus();
	for (const [collection, entries] of loaded.byCollection) {
		const schema = collectionSchemas[collection];
		for (const entry of entries) {
			const parsed = schema.safeParse(entry.data);
			if (!parsed.success) {
				for (const zodIssue of parsed.error.issues) {
					const at = zodIssue.path.length > 0 ? zodIssue.path.join('.') : '(root)';
					issues.push(issue('error', 'validate', entry.file.relPath, `${at}: ${zodIssue.message}`));
				}
				continue;
			}
			(corpus[collection] as Map<string, unknown>).set(entry.file.slug, parsed.data);
		}
	}
	return { corpus, issues };
}

/**
 * Content-relative path of an entity file, or of its translation sidecar
 * when `locale` is a translation locale — where a reader must go to fix a
 * finding about text in that locale.
 */
export function fileOf(collection: string, slug: string, locale: string = SOURCE_LOCALE): string {
	return locale === SOURCE_LOCALE
		? `${collection}/${slug}.yaml`
		: `${collection}/${slug}.${locale}.yaml`;
}
