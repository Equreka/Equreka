export {
	type CompileMode,
	type CompileOptions,
	type CompileReport,
	compileContent,
} from './pipeline/compile.js';
export type { EmittedArtifact } from './pipeline/emit.js';
export type { MathArtifact, MathStats } from './pipeline/math-artifact.js';
export type { PathStepTarget, PresentationPathStep } from './pipeline/path-targets.js';
export type { ResolvedUnit } from './pipeline/resolve.js';
export type { Issue, Stage } from './pipeline/types.js';
export { CONTENT_PIPELINE_VERSION } from './pipeline-version.js';
export {
	canonicalTex,
	hydrateMathBody,
	type LocalizedSegments,
	type MathAtlas,
	type MathBodies,
	type MathBody,
	type RichTextSegment,
	splitLocalizedText,
	splitRichText,
	stripMacros,
	stripMacrosToText,
} from './rich-text.js';
export {
	type CatalogLiteEntry,
	foldSearchTerm,
	SEARCH_LOCALES,
	type SearchDocument,
	type SearchLocale,
	searchOptions,
} from './search-options.js';
