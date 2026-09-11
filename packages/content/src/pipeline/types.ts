import type { CollectionName } from '@equreka/schema';

export type Stage =
	| 'load'
	| 'validate'
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

export interface ContentFile {
	collection: CollectionName;
	slug: string;
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
