export {
	type CompileMode,
	type CompileOptions,
	type CompileReport,
	compileContent,
} from './pipeline/compile.js';
export type { ArtifactBudget, EmittedArtifact } from './pipeline/emit.js';
export type { LocaleCoverage } from './pipeline/locale-completeness.js';
export type { MathArtifact, MathStats } from './pipeline/math-artifact.js';
export type { PathStepTarget, PresentationPathStep } from './pipeline/path-targets.js';
export type { ResolvedUnit } from './pipeline/resolve.js';
export type { Issue, Stage } from './pipeline/types.js';
export { CONTENT_PIPELINE_VERSION } from './pipeline-version.js';
export {
	canonicalTex,
	hydrateMathBody,
	type MathAtlas,
	type MathBodies,
	type MathBody,
	type RichTextSegment,
	splitRichText,
	stripMacros,
	stripMacrosToText,
	termIdentifier,
	termMacroPattern,
} from './rich-text.js';
export {
	type CatalogLiteEntry,
	foldSearchTerm,
	SEARCH_LEAD_MAX_CHARS,
	SEARCH_LOCALES,
	type SearchDocument,
	type SearchLocale,
	searchLeadOf,
	searchOptions,
	stripTexForSearch,
} from './search-options.js';
