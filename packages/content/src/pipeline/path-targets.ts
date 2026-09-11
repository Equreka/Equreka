import type { LocalizedText, Path, PathStep } from '@equreka/schema';
import { type LocalizedSegments, splitLocalizedText } from '../rich-text.js';
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
 * Presentation form of a step: every prose field is mirrored as pre-split
 * `<field>Segments` (per locale) so readers that cannot run a TeX splitter
 * at render time index `math/bodies.json` directly.
 */
export type PresentationPathStep =
	| (Extract<PathStep, { kind: 'entry' }> & {
			target: PathStepTarget;
			noteSegments?: LocalizedSegments;
	  })
	| (Extract<PathStep, { kind: 'prose' }> & { bodySegments: LocalizedSegments })
	| (Extract<PathStep, { kind: 'check' }> & {
			promptSegments: LocalizedSegments;
			answerSegments: LocalizedSegments;
	  });

/**
 * Presentation form of one path: every entry step carries its resolved
 * target. Integrity has already guaranteed the ref resolves, so a missing
 * entity here is a pipeline bug and throws rather than emitting a hole.
 */
export function presentationSteps(path: Path, corpus: Corpus): PresentationPathStep[] {
	return path.steps.map((step): PresentationPathStep => {
		if (step.kind === 'prose') {
			return { ...step, bodySegments: splitLocalizedText(step.body) };
		}
		if (step.kind === 'check') {
			return {
				...step,
				promptSegments: splitLocalizedText(step.prompt),
				answerSegments: splitLocalizedText(step.answer),
			};
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
		return step.note === undefined
			? { ...step, target }
			: { ...step, target, noteSegments: splitLocalizedText(step.note) };
	});
}
