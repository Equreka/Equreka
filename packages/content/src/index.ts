/**
 * Content pipeline: YAML → validate → integrity → TeX lint + solution
 * verification → derive (KaTeX HTML, MathJax SVG atlas, solutions codegen)
 * → sharded dist artifact. Populated in P2.
 */
export const CONTENT_PIPELINE_VERSION = 1;
