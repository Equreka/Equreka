import type { LocalizedSegments } from '@equreka/content/rich-text';
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
 * Fields the pipeline adds to every presentation entity: the authored
 * `symbol`/`symbolAlt` objects are replaced by canonical TeX (the exact
 * `math/bodies.json` key) plus a plain-text form, and every description is
 * mirrored as pre-split segments per locale.
 */
export interface PresentedSymbol {
	symbolTex: string;
	symbolText: string;
	symbolAltTex?: string;
	symbolAltText?: string;
}

export interface PresentedDescription {
	descriptionSegments?: LocalizedSegments;
}

type Presented<T> = Omit<T, 'symbol' | 'symbolAlt'> & PresentedSymbol & PresentedDescription;

export type PresentationCategory = Category & PresentedDescription;
export type PresentationBranch = Branch & PresentedDescription;
export type PresentationMagnitude = Presented<Magnitude>;
export type PresentationUnit = Presented<Unit>;
export type PresentationPrefix = Presented<Prefix>;
export type PresentationConstant = Presented<Constant>;
export type PresentationVariable = Presented<Variable>;

export type PresentationEquation = Equation &
	PresentedDescription & {
		expressionTex: string;
		relatedUnits: string[];
	};

export interface PathStepTarget {
	name: LocalizedText;
	symbolText: string;
}

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

export type PresentationPath = Omit<Path, 'steps'> &
	PresentedDescription & { steps: PresentationPathStep[] };

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
 * Collections whose entities carry `categories` and `branches`: everything
 * but the two taxonomy collections themselves.
 */
export type MemberCollection = Exclude<EntryCollection, 'categories' | 'branches'>;

export type PresentationEntry = {
	[K in EntryCollection]: { collection: K; slug: string; entity: PresentationSlices[K][string] };
}[EntryCollection];
