import {
	type Branch,
	type Category,
	type Constant,
	collectionSchemas,
	type Equation,
	type Magnitude,
	type Path,
	type Prefix,
	SOURCE_LOCALE,
	type Unit,
	type Variable,
} from '@equreka/schema';
import type { LoadedContent } from './load.js';
import { type Issue, issue } from './types.js';

export interface Corpus {
	categories: Map<string, Category>;
	branches: Map<string, Branch>;
	magnitudes: Map<string, Magnitude>;
	units: Map<string, Unit>;
	prefixes: Map<string, Prefix>;
	constants: Map<string, Constant>;
	variables: Map<string, Variable>;
	equations: Map<string, Equation>;
	paths: Map<string, Path>;
}

export interface ValidateResult {
	corpus: Corpus;
	issues: Issue[];
}

export function validateContent(loaded: LoadedContent): ValidateResult {
	const issues: Issue[] = [];
	const corpus: Corpus = {
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
