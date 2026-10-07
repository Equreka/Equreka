import type { LocalizedText, Path, PathStep } from '@equreka/schema';
import { symbolText } from './tex.js';
import type { Corpus } from './validate.js';

/**
 * What an entry step points at, resolved at build so path readers need no
 * second lookup into the target collection. `symbolText` is empty for
 * collections without a symbol (equations).
 */
export interface PathStepTarget {
	name: LocalizedText;
	symbolText: string;
}

/**
 * Presentation form of a step: entry steps gain their resolved target;
 * prose stays raw and readers split it with `splitRichText` (ADR 0010).
 */
export type PresentationPathStep =
	| (Extract<PathStep, { kind: 'entry' }> & { target: PathStepTarget })
	| Extract<PathStep, { kind: 'prose' }>
	| Extract<PathStep, { kind: 'check' }>;

/**
 * Presentation form of one path: every entry step carries its resolved
 * target. Integrity has already guaranteed the ref resolves, so a missing
 * entity here is a pipeline bug and throws rather than emitting a hole.
 */
export function presentationSteps(path: Path, corpus: Corpus): PresentationPathStep[] {
	return path.steps.map((step): PresentationPathStep => {
		if (step.kind !== 'entry') {
			return step;
		}
		const entity = (corpus[step.ref.collection] as Map<string, unknown>).get(step.ref.slug) as
			| { name: LocalizedText; symbol?: { tex: string; text?: string } }
			| undefined;
		if (entity === undefined) {
			throw new Error(`path step ${step.id}: unresolved ${step.ref.collection}/${step.ref.slug}`);
		}
		const target: PathStepTarget = {
			name: entity.name,
			symbolText: entity.symbol === undefined ? '' : symbolText(entity.symbol),
		};
		return { ...step, target };
	});
}
