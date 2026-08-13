/**
 * One-time codemod: legacy/ JSON5 (148 files from the 2021-2022 app) →
 * packages/content/content YAML + golden conversion fixtures for the engine.
 * Reads numeric literals from source text (never parsed floats) and derives
 * affine coefficients without eval. Lands in P1; deleted after migration.
 */
console.log('migrate-legacy: lands in P1');
