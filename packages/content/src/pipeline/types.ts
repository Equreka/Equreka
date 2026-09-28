import type { CollectionName, TranslationLocale } from '@equreka/schema';

export type Stage =
	| 'load'
	| 'validate'
	| 'expand'
	| 'integrity'
	| 'resolve'
	| 'dimensions'
	| 'solutions'
	| 'tex'
	| 'math'
	| 'emit';

/**
 * One aggregated finding. `file` is the path relative to the content root
 * (empty for corpus-wide findings) so every report line is actionable.
 */
export interface Issue {
	severity: 'error' | 'warning';
	stage: Stage;
	file: string;
	message: string;
}

/**
 * One file on disk. `slug` is the entity the file belongs to; `locale` is
 * set only on a translation sidecar (`<slug>.<locale>.yaml`).
 */
export interface ContentFile {
	collection: CollectionName;
	slug: string;
	locale?: TranslationLocale;
	relPath: string;
	absPath: string;
	bytes: Uint8Array;
	text: string;
}

export function issue(
	severity: Issue['severity'],
	stage: Stage,
	file: string,
	message: string,
): Issue {
	return { severity, stage, file, message };
}

export function hasErrors(issues: readonly Issue[]): boolean {
	return issues.some((entry) => entry.severity === 'error');
}
