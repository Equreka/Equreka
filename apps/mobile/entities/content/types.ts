import type {
	PresentationIndexField,
	ShardedCollection,
} from '@equreka/content/presentation-shards';
import type {
	Branch,
	Category,
	Constant,
	Equation,
	LocalizedText,
	Magnitude,
	Path,
	PathStep,
	Prefix,
	Unit,
	Variable,
} from '@equreka/schema';

/**
 * Fields the pipeline puts in place of the authored `symbol`/`symbolAlt`
 * objects: canonical TeX (the exact math body key) plus a
 * plain-text form. Prose stays raw; screens split it with `pickRichText`.
 */
export interface PresentedSymbol {
	symbolTex: string;
	symbolText: string;
	symbolAltTex?: string;
	symbolAltText?: string;
}

type Presented<T> = Omit<T, 'symbol' | 'symbolAlt'> & PresentedSymbol;

export type PresentationCategory = Category;
export type PresentationBranch = Branch;
export type PresentationMagnitude = Presented<Magnitude>;
export type PresentationUnit = Presented<Unit>;
export type PresentationPrefix = Presented<Prefix>;
export type PresentationConstant = Presented<Constant>;
export type PresentationVariable = Presented<Variable>;

export type PresentationEquation = Equation & {
	expressionTex: string;
	relatedUnits: string[];
};

export interface PathStepTarget {
	name: LocalizedText;
	symbolText: string;
}

export type PresentationPathStep =
	| (Extract<PathStep, { kind: 'entry' }> & { target: PathStepTarget })
	| Extract<PathStep, { kind: 'prose' }>
	| Extract<PathStep, { kind: 'check' }>;

export type PresentationPath = Omit<Path, 'steps'> & { steps: PresentationPathStep[] };

/**
 * Full entries per collection; for a sharded collection, an entry is its
 * index row merged with its shard row (`getEntity`).
 */
export interface PresentationSlices {
	categories: Record<string, PresentationCategory>;
	branches: Record<string, PresentationBranch>;
	magnitudes: Record<string, PresentationMagnitude>;
	units: Record<string, PresentationUnit>;
	prefixes: Record<string, PresentationPrefix>;
	constants: Record<string, PresentationConstant>;
	variables: Record<string, PresentationVariable>;
	equations: Record<string, PresentationEquation>;
	paths: Record<string, PresentationPath>;
}

export type EntryCollection = keyof PresentationSlices;

/**
 * One row of `presentation/<collection>.json`: only the index fields for a
 * sharded collection (ADR 0015), the whole entry otherwise. List, browse and
 * cross-reference screens read nothing else, so they never evaluate a shard.
 */
export type PresentationIndexRow<C extends EntryCollection> = C extends ShardedCollection
	? Pick<
			PresentationSlices[C][string],
			Extract<PresentationIndexField<C>, keyof PresentationSlices[C][string]>
		>
	: PresentationSlices[C][string];

export type PresentationIndexes = {
	[C in EntryCollection]: Record<string, PresentationIndexRow<C>>;
};

/**
 * One `presentation/<collection>/<shard>.json`: the fields of each entry the
 * index leaves out, keyed by slug.
 */
export type PresentationDetailShard<C extends ShardedCollection> = Record<
	string,
	Omit<PresentationSlices[C][string], PresentationIndexField<C>>
>;

export type { MemberCollection } from '@equreka/core/collections';

export type PresentationEntry = {
	[K in EntryCollection]: { collection: K; slug: string; entity: PresentationSlices[K][string] };
}[EntryCollection];
