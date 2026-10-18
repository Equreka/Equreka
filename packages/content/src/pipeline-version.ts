/**
 * Bumped when pipeline behavior changes what a derivation cache keyed on
 * file bytes holds: the verification cache (messages and samples) or the
 * math render cache (rendered bodies). Emit-time derivations, such as
 * codegen and the math body encoding, are never cached and need no bump.
 */
export const CONTENT_PIPELINE_VERSION = 7;
