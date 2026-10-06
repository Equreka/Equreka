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

export type { MemberCollection } from '@equreka/core/collections';

export type PresentationEntry = {
	[K in EntryCollection]: { collection: K; slug: string; entity: PresentationSlices[K][string] };
}[EntryCollection];
